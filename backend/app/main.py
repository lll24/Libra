from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
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

from app.database import init_db

@app.on_event("startup")
def startup_event():
    init_db()

# Asegurar directorio de guardado
ARCHIVE_DIR = "data/archive"
ANALYSIS_DIR = "data/analysis"
os.makedirs(ARCHIVE_DIR, exist_ok=True)
os.makedirs(ANALYSIS_DIR, exist_ok=True)

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
    id: Optional[str] = None

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
        
        # Calcular el hash SHA-256 de los bytes del archivo
        import hashlib
        file_hash = hashlib.sha256(file_bytes).hexdigest()
        
        # Buscar si ya existe algún archivo con el mismo hash
        existing_filename_id = None
        if os.path.exists(ARCHIVE_DIR):
            for name in os.listdir(ARCHIVE_DIR):
                if name.endswith(".txt"):
                    continue
                parts = name.split("_")
                if len(parts) >= 2 and parts[1] == file_hash:
                    existing_filename_id = name
                    break
        
        if existing_filename_id:
            text_path = os.path.join(ARCHIVE_DIR, f"{existing_filename_id}.txt")
            if os.path.exists(text_path):
                with open(text_path, "r", encoding="utf-8") as f:
                    extracted_text = f.read()
                return {
                    "id": existing_filename_id,
                    "filename": file.filename,
                    "text": extracted_text,
                    "cached": True
                }
        
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
        filename_id = f"{timestamp}_{file_hash}_{safe_filename}"
        
        file_path = os.path.join(ARCHIVE_DIR, filename_id)
        text_path = f"{file_path}.txt"
        
        with open(file_path, "wb") as f:
            f.write(file_bytes)
            
        with open(text_path, "w", encoding="utf-8") as f:
            f.write(extracted_text)
            
        # Guardar copia en base de datos PostgreSQL
        try:
            from app.database import save_document
            save_document(
                doc_id=filename_id,
                filename=file.filename,
                content=extracted_text,
                status='draft'
            )
        except Exception as db_err:
            print(f"Error al guardar borrador en DB: {db_err}")
            
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
        import hashlib
        text_hash = hashlib.sha256(request.text.encode("utf-8")).hexdigest()
        analysis_path = None
        
        # Si se provee ID, verificar si ya tenemos el análisis guardado
        if request.id:
            # Asegurar que no sea malicioso (sanitizar ruta)
            safe_id = "".join(c for c in request.id if c.isalnum() or c in "._- ")
            analysis_path = os.path.join(ANALYSIS_DIR, f"{safe_id}.analysis.json")
            
            if os.path.exists(analysis_path):
                try:
                    import json
                    with open(analysis_path, "r", encoding="utf-8") as f:
                        cached_data = json.load(f)
                    if cached_data.get("text_hash") == text_hash:
                        return JudicialFileAnalysis(**cached_data["analysis"])
                except Exception as cache_err:
                    print(f"Error al leer caché de análisis: {cache_err}")
        
        # Si no hay caché o el texto cambió, realizar análisis
        analysis_result = extract_judicial_data(text=request.text)
        
        # Guardar en base de datos PostgreSQL y en caché si se proporcionó un ID válido
        if request.id:
            try:
                from app.database import save_document, save_entities
                analysis_dict = analysis_result.model_dump() if hasattr(analysis_result, "model_dump") else analysis_result.dict()
                
                parts = request.id.split("_", 2)
                orig_filename = parts[2] if len(parts) == 3 and len(parts[1]) == 64 else request.id
                
                save_document(
                    doc_id=request.id,
                    filename=orig_filename,
                    content=request.text,
                    case_number=analysis_dict.get("case_number"),
                    court_name=analysis_dict.get("court_name"),
                    date=analysis_dict.get("date"),
                    crime_or_subject=analysis_dict.get("crime_or_subject"),
                    summary=analysis_dict.get("summary")
                )
                save_entities(request.id, analysis_dict.get("entities", []))
            except Exception as db_err:
                print(f"Error al guardar análisis en DB: {db_err}")

        if request.id and analysis_path:
            try:
                import json
                analysis_dict = analysis_result.model_dump() if hasattr(analysis_result, "model_dump") else analysis_result.dict()
                cached_data = {
                    "text_hash": text_hash,
                    "analysis": analysis_dict
                }
                with open(analysis_path, "w", encoding="utf-8") as f:
                    json.dump(cached_data, f, ensure_ascii=False, indent=2)
            except Exception as cache_save_err:
                print(f"Error al guardar caché de análisis: {cache_save_err}")
                
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
            
        doc_statuses = {}
        try:
            from app.database import get_connection
            conn = get_connection()
            with conn.cursor() as cur:
                cur.execute("SELECT id, status FROM documents;")
                for row in cur.fetchall():
                    doc_statuses[row[0]] = row[1]
            conn.close()
        except Exception as db_err:
            print(f"Error al obtener estados de documentos de DB: {db_err}")
            
        for name in sorted(os.listdir(ARCHIVE_DIR), reverse=True):
            if name.endswith(".txt") or name.endswith(".json"):
                continue
                
            file_path = os.path.join(ARCHIVE_DIR, name)
            if not os.path.isfile(file_path):
                continue
                
            stat = os.stat(file_path)
            parts = name.split("_", 2)
            if len(parts) == 3 and len(parts[1]) == 64:  # Tiene timestamp, hash de 64 caracteres, y filename
                timestamp = int(parts[0]) if parts[0].isdigit() else int(stat.st_mtime)
                orig_filename = parts[2]
            else:
                # Formato legacy: timestamp_filename
                legacy_parts = name.split("_", 1)
                timestamp = int(legacy_parts[0]) if legacy_parts[0].isdigit() else int(stat.st_mtime)
                orig_filename = legacy_parts[1] if len(legacy_parts) > 1 else name
            
            items.append({
                "id": name,
                "filename": orig_filename,
                "timestamp": timestamp,
                "size": stat.st_size,
                "file_url": f"http://localhost:8000/api/files/{name}",
                "has_text": os.path.exists(f"{file_path}.txt"),
                "status": doc_statuses.get(name, "draft")
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
        # Resolver incidentes asociados automáticamente en base de datos
        try:
            from app.database import get_connection
            conn = get_connection()
            with conn.cursor() as cur:
                cur.execute("UPDATE incidents SET status = 'resolved' WHERE document_id = %s;", (filename_id,))
                cur.execute("UPDATE documents SET status = 'validated' WHERE id = %s;", (filename_id,))
            conn.commit()
            conn.close()
        except Exception as db_err:
            print(f"Error al auto-resolver incidentes: {db_err}")
            
        return {"status": "ok", "message": "Texto actualizado correctamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar el texto: {str(e)}")

# Nuevos endpoints de Roles y PostgreSQL

class IncidentRequest(BaseModel):
    document_id: str
    note: str

@app.post("/api/documents/{id}/validate")
def validate_document(id: str):
    try:
        from app.database import update_document_status
        update_document_status(id, "validated")
        return {"status": "ok", "message": "Documento validado definitivamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/incidents")
def post_incident(request: IncidentRequest):
    try:
        from app.database import report_incident
        report_incident(request.document_id, request.note)
        return {"status": "ok", "message": "Incidente reportado correctamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/incidents")
def list_incidents_endpoint():
    try:
        from app.database import get_incidents
        return get_incidents()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/incidents/{id}/resolve")
def resolve_incident_endpoint(id: int):
    try:
        from app.database import resolve_incident
        resolve_incident(id)
        return {"status": "ok", "message": "Incidente resuelto correctamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/search")
def search_cases(q: str):
    try:
        from app.database import search_documents
        return search_documents(q)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/documents/{id}/analysis")
def get_document_analysis(id: str):
    try:
        import json
        import psycopg2.extras
        safe_id = "".join(c for c in id if c.isalnum() or c in "._- ")
        analysis_path = os.path.join(ANALYSIS_DIR, f"{safe_id}.analysis.json")
        if os.path.exists(analysis_path):
            with open(analysis_path, "r", encoding="utf-8") as f:
                cached_data = json.load(f)
            return cached_data.get("analysis")
        else:
            from app.database import get_connection
            conn = get_connection()
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT case_number, court_name, date, crime_or_subject, summary FROM documents WHERE id = %s;", (id,))
                doc = cur.fetchone()
                if not doc:
                    raise HTTPException(status_code=404, detail="Análisis no encontrado en base de datos")
                cur.execute("SELECT name, role, context, cedula FROM entities WHERE document_id = %s;", (id,))
                entities = cur.fetchall()
                
            conn.close()
            return {
                "case_number": doc.get("case_number"),
                "court_name": doc.get("court_name"),
                "date": doc.get("date"),
                "crime_or_subject": doc.get("crime_or_subject"),
                "summary": doc.get("summary"),
                "entities": entities,
                "key_points": []
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
