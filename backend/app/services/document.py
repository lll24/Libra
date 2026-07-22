import pdfplumber
import pytesseract
import numpy as np
from pdf2image import convert_from_bytes
from docx import Document
from io import BytesIO
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
from typing import Tuple

def preprocess_image(image: Image.Image) -> Image.Image:
    """Preprocesa la imagen para corregir iluminación desigual y maximizar contraste antes de Tesseract OCR."""
    try:
        # Convertir a escala de grises
        img_gray = ImageOps.grayscale(image)
        
        # Corrección de iluminación desigual (división del fondo)
        gray_arr = np.array(img_gray, dtype=float)
        bg = img_gray.filter(ImageFilter.GaussianBlur(31))
        bg_arr = np.array(bg, dtype=float)
        
        # Evitar división por cero
        bg_arr[bg_arr == 0] = 1.0
        
        # Dividir imagen original por el fondo borroso y normalizar a 0-255
        divided_arr = (gray_arr / bg_arr) * 255.0
        divided_arr = np.clip(divided_arr, 0, 255).astype(np.uint8)
        
        # Regresar a Pillow Image
        img_clean = Image.fromarray(divided_arr)
        
        # Aumentar contraste significativamente
        enhancer = ImageEnhance.Contrast(img_clean)
        img_contrast = enhancer.enhance(3.0)
        
        # Enfocar la imagen ligeramente para definir los bordes de las letras
        img_sharp = img_contrast.filter(ImageFilter.SHARPEN)
        
        # Redimensionar si la imagen es pequeña (para aumentar densidad de píxeles en el texto)
        width, height = img_sharp.size
        if width < 1800 or height < 1800:
            img_sharp = img_sharp.resize((width * 2, height * 2), Image.Resampling.LANCZOS)
            
        return img_sharp
    except Exception as e:
        print(f"Error en preprocesamiento de imagen avanzado: {e}")
        # Fallback simple
        try:
            img_gray = ImageOps.grayscale(image)
            enhancer = ImageEnhance.Contrast(img_gray)
            return enhancer.enhance(2.0)
        except Exception:
            return image


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

def get_clean_text_from_image(image: Image.Image) -> str:
    """
    Obtiene los datos del OCR en formato de cajas y agrupa las palabras en líneas ordenadas
    por sus coordenadas Y (top) y X (left). Esto previene que Tesseract mezcle columnas
    o introduzca saltos de línea arbitrarios de forma incorrecta.
    """
    try:
        # Obtener datos de palabras y posiciones
        data = pytesseract.image_to_data(image, lang="spa", output_type=pytesseract.Output.DICT)
        
        words = []
        n_boxes = len(data['text'])
        for i in range(n_boxes):
            if data['level'][i] == 5:  # Nivel 5 representa palabras individuales
                text = data['text'][i].strip()
                if text:
                    words.append({
                        'text': text,
                        'left': data['left'][i],
                        'top': data['top'][i],
                        'width': data['width'][i],
                        'height': data['height'][i]
                    })
                    
        if not words:
            return ""
            
        # Ordenar palabras por su coordenada vertical Y (top)
        words.sort(key=lambda w: w['top'])
        
        lines = []
        current_line = []
        
        for word in words:
            if not current_line:
                current_line.append(word)
            else:
                # Calcular el promedio de altura y top de la línea actual para comparar
                ref_top = sum(w['top'] for w in current_line) / len(current_line)
                ref_height = sum(w['height'] for w in current_line) / len(current_line)
                
                # Tolerancia vertical: si el top del nuevo texto está cerca del promedio de la línea actual
                vertical_diff = abs(word['top'] - ref_top)
                if vertical_diff < (ref_height * 0.7):
                    current_line.append(word)
                else:
                    # Guardamos la línea actual ordenando las palabras de izquierda a derecha
                    current_line.sort(key=lambda w: w['left'])
                    lines.append(current_line)
                    current_line = [word]
                    
        if current_line:
            current_line.sort(key=lambda w: w['left'])
            lines.append(current_line)
            
        # Ordenar las líneas finales por su promedio de coordenadas Y
        lines.sort(key=lambda line: sum(w['top'] for w in line) / len(line))
        
        # Unir palabras por línea y luego las líneas con saltos de línea
        text_lines = []
        for line in lines:
            text_lines.append(" ".join(w['text'] for w in line))
            
        return "\n".join(text_lines)
    except Exception as e:
        print(f"Error en agrupación de líneas OCR: {e}")
        # Fallback a string estándar
        return pytesseract.image_to_string(image, lang="spa")

def run_ocr_on_image(image_bytes: bytes) -> str:
    """Ejecuta Tesseract OCR sobre una imagen preprocesada y retorna el texto agrupado en líneas naturales."""
    try:
        image = Image.open(BytesIO(image_bytes))
        preprocessed = preprocess_image(image)
        # Usar la función de agrupación de líneas
        text = get_clean_text_from_image(preprocessed)
        return text.strip()
    except Exception as e:
        print(f"Error en OCR de imagen: {e}")
        return ""

def run_ocr_on_pdf(pdf_bytes: bytes) -> str:
    """Convierte cada página del PDF escaneado a imagen, las preprocesa y agrupa las líneas de texto."""
    text = ""
    try:
        # Convertir PDF a imágenes (usa poppler-utils de fondo)
        images = convert_from_bytes(pdf_bytes)
        for i, image in enumerate(images):
            preprocessed = preprocess_image(image)
            page_text = get_clean_text_from_image(preprocessed)
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

def get_pdf_page_count(file_bytes: bytes) -> int:
    """Retorna el número de páginas del PDF usando pypdf."""
    import pypdf
    try:
        reader = pypdf.PdfReader(BytesIO(file_bytes))
        return len(reader.pages)
    except Exception as e:
        print(f"Error al contar páginas del PDF: {e}")
        return 1

def merge_pieza_pdfs(case_number: str, pieza_number: int) -> str:
    """Fusiona todos los archivos PDF originales correspondientes a una pieza y un expediente en un único PDF."""
    import pypdf
    import os
    from app.database import get_connection, release_connection
    import psycopg2.extras
    
    ARCHIVE_DIR = "data/archive"
    MERGED_DIR = "data/merged"
    os.makedirs(MERGED_DIR, exist_ok=True)
    
    # Sanitizar case_number para usarlo de nombre de archivo seguro
    safe_case = "".join(c for c in case_number if c.isalnum() or c in "._- ")
    output_filename = f"{safe_case}_pieza_{pieza_number}.pdf"
    output_path = os.path.join(MERGED_DIR, output_filename)
    
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Obtener documentos de este expediente y pieza ordenados por start_folio
            cur.execute("""
                SELECT id, filename 
                FROM documents 
                WHERE case_number = %s AND pieza_number = %s
                ORDER BY start_folio ASC;
            """, (case_number, pieza_number))
            docs = cur.fetchall()
            
            if not docs:
                print(f"No se encontraron documentos para {case_number} y pieza {pieza_number}")
                return ""
            
            merger = pypdf.PdfMerger()
            
            for doc in docs:
                file_path = os.path.join(ARCHIVE_DIR, doc["id"])
                if os.path.exists(file_path):
                    merger.append(file_path)
                else:
                    print(f"Advertencia: Archivo físico {file_path} no encontrado para fusionar")
            
            with open(output_path, "wb") as f_out:
                merger.write(f_out)
            
            merger.close()
            print(f"Pieza fusionada guardada en: {output_path}")
            return output_path
    except Exception as e:
        print(f"Error al fusionar PDFs para expediente {case_number} pieza {pieza_number}: {e}")
        return ""
    finally:
        release_connection(conn)
