# Libra ⚖️ - Analizador de Expedientes Judiciales con IA y OCR Local

**Libra** es un sistema inteligente diseñado para el **Tribunal Supremo de Justicia** que permite escanear, digitalizar, revisar y estructurar expedientes judiciales (en formatos PDF, Word e imágenes) utilizando **Inteligencia Artificial (Gemini 3.5 Flash)** y **OCR local (Tesseract)**.

El sistema está completamente contenedorizado con **Docker** para asegurar que funcione de manera aislada y rápida en cualquier computadora sin necesidad de instalar dependencias complejas localmente.

---

## 🚀 Características Principales

1. **OCR Local Aislado:** Procesa imágenes y PDFs escaneados utilizando Tesseract OCR directamente dentro de un contenedor Docker, manteniendo tu sistema Windows limpio.
2. **Flujo de Trabajo con Corrección Humana ("Human-in-the-Loop"):** Permite al usuario revisar y corregir en un editor interactivo el texto extraído por el OCR antes de enviarlo al análisis de la IA. Esto previene malas lecturas de escáneres antiguos.
3. **Análisis Estructurado con IA:** Extrae automáticamente metadatos clave:
   - Número de expediente.
   - Tribunal o juzgado a cargo.
   - Fecha del hecho.
   - Delito o materia jurídica.
   - Resumen ejecutivo preciso del caso.
   - Identificación de involucrados clasificados por roles (Juez, Demandante, Demandado, Abogados, Testigos, etc.).
   - Cronología de acontecimientos clave y recomendaciones legales de análisis.
4. **Chat Interactivo Q&A:** Un chat dedicado en el que puedes hacer preguntas libres sobre el contenido del expediente directamente a la IA (ej. *¿Qué pruebas presentó el demandante?*).

---

## 🛠️ Stack Tecnológico

* **Frontend:** Next.js (React + TypeScript + Tailwind CSS)
* **Backend:** FastAPI (Python 3.12)
* **Motor de OCR:** Tesseract OCR (con soporte en Español)
* **Inteligencia Artificial:** Google Gemini 3.5 Flash (API)
* **Orquestación:** Docker & Docker Compose

---

## 📋 Requisitos Previos

Solo necesitas tener instalado:
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (para Windows, Mac o Linux).

---

## ⚙️ Configuración Inicial (Segura)

Para proteger tus credenciales, el archivo de configuración sensible está protegido y **nunca se subirá a GitHub** gracias al archivo `.gitignore`.

1. En la carpeta `backend`, duplica el archivo `.env.example` y cámbiale el nombre a `.env` (o ejecuta `cp backend/.env.example backend/.env` en sistemas basados en Unix o `copy backend\.env.example backend\.env` en Windows).
2. Abre `backend/.env` e introduce tu clave de API de Gemini y las configuraciones correspondientes:
   ```env
   GEMINI_API_KEY=tu_api_key_aqui
   DATABASE_URL=postgresql://libra_user:libra_password@db:5432/libra_db
   ```
   *(Si no posees una clave de API, puedes obtenerla gratis en [Google AI Studio](https://aistudio.google.com/).)*

---

## 🐳 Cómo Ejecutar la Aplicación

Desde la raíz del proyecto, ejecuta en tu terminal:

```bash
docker-compose up --build
```

Una vez que Docker compile y levante los contenedores:
* **Frontend (Next.js):** Accede en [http://localhost:3000](http://localhost:3000)
* **Backend (FastAPI):** Accede a la API y documentación Swagger en [http://localhost:8000/docs](http://localhost:8000/docs)

Para detener los servicios:
```bash
docker-compose down
```
