import os
import google.generativeai as genai
from dotenv import load_dotenv

# Cargar variables del .env
load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
print(f"API Key detectada: {api_key[:10]}...{api_key[-10:] if api_key else ''}")

if not api_key or api_key == "your_gemini_api_key_here":
    print("ERROR: Por favor configura la clave GEMINI_API_KEY en el archivo .env")
    exit(1)

genai.configure(api_key=api_key)

print("\n--- Diagnosticando Modelos Disponibles ---")
try:
    models = list(genai.list_models())
    if not models:
        print("No se encontraron modelos disponibles para esta clave.")
    else:
        print("Modelos que puedes usar con esta clave:")
        for m in models:
            if "generateContent" in m.supported_generation_methods:
                print(f" - {m.name}")
except Exception as e:
    print(f"Error al listar los modelos: {e}")
    print("\n--- Posibles soluciones ---")
    print("1. Verifica si la API de Gemini (Generative Language API) está habilitada en tu consola de Google Cloud si usas una cuenta de GCP.")
    print("2. Intenta generar una clave desde otra cuenta de Google (Gmail personal estándar) en AI Studio.")
