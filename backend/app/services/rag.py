import google.generativeai as genai
from app.config import settings
from app.database import delete_document_chunks, save_document_chunk

def chunk_text(text: str, chunk_size: int = 300, overlap: int = 50) -> list:
    """
    Divide un texto largo en fragmentos basados en cantidad de palabras 
    con un solapamiento para no perder el contexto en las fronteras.
    """
    words = text.split()
    chunks = []
    if len(words) <= chunk_size:
        return [text]
    
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk_words = words[start:end]
        chunks.append(" ".join(chunk_words))
        start += (chunk_size - overlap)
        
        # Romper si ya procesamos hasta el final
        if end == len(words):
            break
            
    return chunks

def get_embedding(text: str, is_query: bool = False) -> list:
    """
    Genera el vector de embedding para un fragmento de texto usando el modelo 
    gemini-embedding-2 de Google Gemini configurado a 768 dimensiones.
    """
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your_gemini_api_key_here":
        # Simulación de vector para demo
        return [0.0] * 768
        
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        task = "retrieval_query" if is_query else "retrieval_document"
        result = genai.embed_content(
            model="models/gemini-embedding-2",
            content=text,
            task_type=task,
            output_dimensionality=768
        )
        return result['embedding']
    except Exception as e:
        print(f"Error al generar embedding con Gemini: {e}")
        # Vector de fallback
        return [0.0] * 768

def index_document_chunks(doc_id: str, text: str):
    """
    Elimina fragmentos anteriores del documento para evitar duplicidad,
    divide el texto corregido en chunks, calcula sus embeddings e indexa en DB.
    """
    try:
        delete_document_chunks(doc_id)
        
        # Segmentamos el documento (~300 palabras por fragmento)
        chunks = chunk_text(text)
        
        for idx, chunk in enumerate(chunks):
            embedding = get_embedding(chunk, is_query=False)
            save_document_chunk(doc_id, idx, chunk, embedding)
            
        print(f"Documento {doc_id} indexado vectorialmente. Total fragmentos: {len(chunks)}")
    except Exception as e:
        print(f"Error al indexar vectorialmente el documento {doc_id}: {e}")
        raise e
