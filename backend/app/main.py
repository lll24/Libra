from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.services.document import process_uploaded_file
from app.services.extractor import extract_judicial_data
from app.models import JudicialFileAnalysis
import google.generativeai as genai
from app.config import settings

app = FastAPI(
    title="Libra API",
    description="Backend de extracción y análisis de expedientes judiciales con IA y OCR local",
    version="1.1.0"
)

# Permitir CORS para desarrollo con Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelos para las peticiones JSON
class AnalyzeTextRequest(BaseModel):
    text: str

class ChatQueryRequest(BaseModel):
    document_text: str
    question: str

class ChatQueryResponse(BaseModel):
    answer: str

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Libra API funcionando correctamente"}

@app.post("/api/ocr")
async def ocr_file(file: UploadFile = File(...)):
    """
    Recibe un archivo, corre el OCR/extractor de texto local y retorna el texto plano bruto.
    Esto permite que un humano lo edite en el frontend antes de enviarlo a la IA.
    """
    try:
        file_bytes = await file.read()
        extracted_text = process_uploaded_file(file_bytes, file.filename)
        
        if not extracted_text:
            raise HTTPException(status_code=400, detail="No se pudo extraer ningún texto del documento.")
            
        return {
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
