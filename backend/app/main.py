from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from app.services.document import process_uploaded_file
from app.services.extractor import extract_judicial_data, extract_text_via_gemini
from app.models import JudicialFileAnalysis
import google.generativeai as genai
from app.config import settings
import os
import time

app = FastAPI(
    title="Libra API",
    description="Backend de extracción y análisis de expedientes judiciales con IA y OCR local",
    version="1.1.0"
)

# Asegurar directorio de guardado
ARCHIVE_DIR = "data/archive"
os.makedirs(ARCHIVE_DIR, exist_ok=True)

# Permitir CORS para desarrollo con Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montar static files para poder servir y renderizar los archivos originales
app.mount("/api/files", StaticFiles(directory=ARCHIVE_DIR), name="archive_files")

# Modelos para las peticiones JSON
class AnalyzeTextRequest(BaseModel):
    text: str

class ChatQueryRequest(BaseModel):
    document_text: str
    question: str

class ChatQueryResponse(BaseModel):
    answer: str

class UpdateTextRequest(BaseModel):
    text: str

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Libra API funcionando correctamente"}

@app.post("/api/ocr")
async def ocr_file(file: UploadFile = File(...), mode: str = Form("local")):
    """
    Recibe un archivo, corre el OCR/extractor de texto local o con IA (Gemini)
    y retorna el texto plano bruto para revisión humana.
    """
    try:
        file_bytes = await file.read()
        
        if mode == "ai":
            extracted_text = extract_text_via_gemini(file_bytes, file.filename)
        else:
            extracted_text = process_uploaded_file(file_bytes, file.filename)
        
        if not extracted_text:
            raise HTTPException(status_code=400, detail="No se pudo extraer ningún texto del documento.")
            
        # Guardar copia física en el Docker/Servidor
        timestamp = int(time.time())
        # Sanitizar nombre de archivo
        safe_filename = "".join(c for c in file.filename if c.isalnum() or c in "._- ")
        filename_id = f"{timestamp}_{safe_filename}"
        
        file_path = os.path.join(ARCHIVE_DIR, filename_id)
        text_path = f"{file_path}.txt"
        
        with open(file_path, "wb") as f:
            f.write(file_bytes)
            
        with open(text_path, "w", encoding="utf-8") as f:
            f.write(extracted_text)
            
        return {
            "id": filename_id,
            "filename": file.filename,
            "text": extracted_text
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en el procesamiento OCR: {str(e)}")

@app.post("/api/analyze-text", response_model=JudicialFileAnalysis)
def analyze_text(request: AnalyzeTextRequest):
    """
    Recibe el texto del expediente (ya corregido por el usuario) y lo estructura usando Gemini.
    """
    try:
        analysis_result = extract_judicial_data(text=request.text)
        return analysis_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al analizar el texto con la IA: {str(e)}")

@app.post("/api/chat-query", response_model=ChatQueryResponse)
def query_document(request: ChatQueryRequest):
    """
    Responde una pregunta del usuario basada en el contenido del expediente judicial.
    """
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your_gemini_api_key_here":
        return ChatQueryResponse(answer="[DEMO] Esta es una respuesta simulada de chat. Configura tu GEMINI_API_KEY para recibir respuestas reales de la IA.")
        
    try:
        # Configurar la API key
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-3.5-flash")
        
        prompt = (
            f"Basándote únicamente en el siguiente texto de un expediente judicial, responde a la pregunta de manera clara y precisa.\n\n"
            f"--- TEXTO DEL EXPEDIENTE ---\n"
            f"{request.document_text}\n"
            f"-----------------------------\n\n"
            f"Pregunta: {request.question}\n"
            f"Respuesta:"
        )
        
        response = model.generate_content(prompt)
        return ChatQueryResponse(answer=response.text)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar la consulta del chat: {str(e)}")

@app.get("/api/archive")
def list_archive():
    try:
        items = []
        if not os.path.exists(ARCHIVE_DIR):
            return items
            
        for name in sorted(os.listdir(ARCHIVE_DIR), reverse=True):
            if name.endswith(".txt"):
                continue
                
            file_path = os.path.join(ARCHIVE_DIR, name)
            if not os.path.isfile(file_path):
                continue
                
            stat = os.stat(file_path)
            parts = name.split("_", 1)
            timestamp = int(parts[0]) if parts[0].isdigit() else int(stat.st_mtime)
            orig_filename = parts[1] if len(parts) > 1 else name
            
            items.append({
                "id": name,
                "filename": orig_filename,
                "timestamp": timestamp,
                "size": stat.st_size,
                "file_url": f"http://localhost:8000/api/files/{name}",
                "has_text": os.path.exists(f"{file_path}.txt")
            })
        return items
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar archivero: {str(e)}")

@app.get("/api/archive/{filename_id}/text")
def get_archive_text(filename_id: str):
    text_path = os.path.join(ARCHIVE_DIR, f"{filename_id}.txt")
    if not os.path.exists(text_path):
        raise HTTPException(status_code=404, detail="Texto no encontrado para este archivo.")
    try:
        with open(text_path, "r", encoding="utf-8") as f:
            return {"text": f.read()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al leer el texto: {str(e)}")

@app.put("/api/archive/{filename_id}/text")
def update_archive_text(filename_id: str, request: UpdateTextRequest):
    text_path = os.path.join(ARCHIVE_DIR, f"{filename_id}.txt")
    try:
        with open(text_path, "w", encoding="utf-8") as f:
            f.write(request.text)
        return {"status": "ok", "message": "Texto actualizado correctamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar el texto: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
