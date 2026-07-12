import pdfplumber
import pytesseract
from pdf2image import convert_from_bytes
from docx import Document
from io import BytesIO
from PIL import Image
from typing import Tuple

def extract_text_from_pdf(file_bytes: bytes) -> str:
    text = ""
    try:
        with pdfplumber.open(BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        print(f"Error al extraer texto del PDF con pdfplumber: {e}")
    return text.strip()

def extract_text_from_docx(file_bytes: bytes) -> str:
    text = ""
    try:
        doc = Document(BytesIO(file_bytes))
        for para in doc.paragraphs:
            if para.text:
                text += para.text + "\n"
    except Exception as e:
        print(f"Error al extraer texto del DOCX: {e}")
    return text.strip()

def run_ocr_on_image(image_bytes: bytes) -> str:
    """Ejecuta Tesseract OCR sobre una imagen y retorna el texto extraído en español."""
    try:
        image = Image.open(BytesIO(image_bytes))
        # Usar idioma español para el OCR
        text = pytesseract.image_to_string(image, lang="spa")
        return text.strip()
    except Exception as e:
        print(f"Error en OCR de imagen: {e}")
        return ""

def run_ocr_on_pdf(pdf_bytes: bytes) -> str:
    """Convierte cada página del PDF escaneado a imagen y corre Tesseract OCR."""
    text = ""
    try:
        # Convertir PDF a imágenes (usa poppler-utils de fondo)
        images = convert_from_bytes(pdf_bytes)
        for i, image in enumerate(images):
            page_text = pytesseract.image_to_string(image, lang="spa")
            text += f"--- Página {i+1} ---\n{page_text}\n"
    except Exception as e:
        print(f"Error en OCR de PDF escaneado: {e}")
    return text.strip()

def process_uploaded_file(file_bytes: bytes, filename: str) -> str:
    """
    Procesa un archivo subido y extrae su texto.
    Si es PDF e incluye texto seleccionable, lo extrae directamente.
    Si es PDF y está escaneado, aplica OCR local página por página.
    Si es una imagen, aplica OCR local directo.
    """
    ext = filename.split(".")[-1].lower()
    
    if ext == "pdf":
        # Intentar extraer texto digital primero
        text = extract_text_from_pdf(file_bytes)
        if text:
            return text
        
        # Si no hay texto, correr OCR local
        print("PDF digital vacío o escaneado. Iniciando OCR local...")
        return run_ocr_on_pdf(file_bytes)
        
    elif ext == "docx":
        return extract_text_from_docx(file_bytes)
        
    elif ext in ["jpg", "jpeg", "png", "webp"]:
        print("Imagen detectada. Iniciando OCR local...")
        return run_ocr_on_image(file_bytes)
        
    else:
        try:
            return file_bytes.decode("utf-8")
        except Exception:
            return ""
