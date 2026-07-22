import json
import google.generativeai as genai
from PIL import Image
from io import BytesIO
from app.config import settings
from app.models import JudicialFileAnalysis

# Configurar la API de Gemini si la clave está provista
if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your_gemini_api_key_here":
    genai.configure(api_key=settings.GEMINI_API_KEY)

def get_mock_analysis() -> JudicialFileAnalysis:
    """Retorna un análisis ficticio en caso de que no esté configurada la API key."""
    return JudicialFileAnalysis(
        case_number="EXP-2026-8839",
        court_name="Tribunal Supremo de Justicia - Sala de Casación Penal",
        date="2026-07-12",
        crime_or_subject="Homicidio Calificado",
        summary="Este es un resultado de demostración (MOCK) ya que no se ha configurado la API Key de Gemini. El caso describe un presunto altercado en la vía pública que derivó en cargos de homicidio calificado.",
        entities=[
            {"name": "Dr. Carlos Mendoza", "role": "juez", "context": "Juez Presidente de la Sala Penal."},
            {"name": "Juan Pérez", "role": "agresor", "context": "Imputado por el cargo de homicidio calificado."},
            {"name": "María Rodríguez", "role": "víctima", "context": "Víctima fallecida en el altercado."},
            {"name": "Dra. Laura Gómez", "role": "abogado_defensor", "context": "Defensora técnica del imputado Juan Pérez."}
        ],
        key_points=[
            "Ocurrencia del hecho punible en fecha 2026-05-10.",
            "Detención en flagrancia del ciudadano Juan Pérez.",
            "Presentación de la acusación formal por parte del Ministerio Público."
        ]
    )

def extract_judicial_data(text: str, is_multimodal: bool = False, file_bytes: bytes = None, filename: str = "") -> JudicialFileAnalysis:
    """
    Analiza un expediente judicial usando Gemini API con salida estructurada.
    """
    # Si no hay API key configurada, usar Mock data
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your_gemini_api_key_here":
        return get_mock_analysis()

    try:
        model = genai.GenerativeModel("gemini-3.5-flash-lite")
        
        prompt = (
            "Eres un experto asistente legal para el Tribunal Supremo de Justicia. "
            "Tu tarea es analizar detalladamente el expediente judicial suministrado y extraer la información estructurada requerida.\n"
            "Identifica con precisión al Juez, Abogados (especificando si son defensores o acusadores), Clientes (Víctima, Agresor, Demandante, Demandado), "
            "el número de expediente, el juzgado, la fecha principal y el tipo de delito o asunto legal.\n"
            "Proporciona un resumen narrativo claro y los acontecimientos clave de manera lógica."
        )

        generation_config = genai.GenerationConfig(
            response_mime_type="application/json",
            response_schema=JudicialFileAnalysis,
            temperature=0.1
        )

        if is_multimodal and file_bytes:
            # Si es una imagen o PDF escaneado
            ext = filename.split(".")[-1].lower()
            if ext in ["jpg", "jpeg", "png", "webp"]:
                # Es imagen
                image = Image.open(BytesIO(file_bytes))
                response = model.generate_content(
                    contents=[prompt, image],
                    generation_config=generation_config
                )
            elif ext == "pdf":
                # Es PDF (pasado directamente como bytes multimediales)
                pdf_part = {
                    "mime_type": "application/pdf",
                    "data": file_bytes
                }
                response = model.generate_content(
                    contents=[prompt, pdf_part],
                    generation_config=generation_config
                )
            else:
                # Fallback a texto
                response = model.generate_content(
                    contents=[prompt, text],
                    generation_config=generation_config
                )
        else:
            # Análisis basado puramente en texto extraído
            response = model.generate_content(
                contents=[prompt, text],
                generation_config=generation_config
            )

        # Retornar el resultado parseado
        data = json.loads(response.text)
        return JudicialFileAnalysis(**data)

    except Exception as e:
        print(f"Error al llamar a la API de Gemini: {e}")
        # En caso de error, retornar mock con advertencia
        mock = get_mock_analysis()
        mock.summary = f"Error al procesar con la IA: {str(e)}. Mostrando datos de prueba."
        return mock

def extract_text_via_gemini(file_bytes: bytes, filename: str) -> str:
    """Usa la API multimodal de Gemini para transcribir el texto completo de un documento (imagen o PDF)."""
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your_gemini_api_key_here":
        return "Modo Demostración (IA Desactivada): Configura la API key de Gemini para transcribir con IA."

    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-3.5-flash-lite")
        
        ext = filename.split(".")[-1].lower()
        prompt = (
            "Transcribe con la máxima precisión posible todo el texto de este documento judicial en español. "
            "Respeta la estructura del texto, los títulos, saltos de línea y numeraciones. "
            "Si hay firmas, sellos o superposiciones, ignora los elementos no textuales pero transcribe el texto "
            "completo de forma literal, incluyendo números de expediente, nombres de los involucrados, cargos y fechas. "
            "No agregues interpretaciones, resúmenes ni comentarios."
        )

        if ext in ["jpg", "jpeg", "png", "webp"]:
            image = Image.open(BytesIO(file_bytes))
            response = model.generate_content(contents=[prompt, image])
            return response.text.strip()
        elif ext == "pdf":
            pdf_part = {
                "mime_type": "application/pdf",
                "data": file_bytes
            }
            response = model.generate_content(contents=[prompt, pdf_part])
            return response.text.strip()
        else:
            try:
                return file_bytes.decode("utf-8")
            except Exception:
                return ""
    except Exception as e:
        print(f"Error al transcribir con Gemini: {e}")
        return f"Error en la transcripción con Gemini: {str(e)}"

