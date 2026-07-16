"use client";

import { useState, useEffect } from "react";

interface Entity {
  name: string;
  role: string;
  context?: string;
}

interface JudicialFileAnalysis {
  case_number?: string;
  court_name?: string;
  date?: string;
  crime_or_subject?: string;
  summary: string;
  entities: Entity[];
  key_points: string[];
}

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
}

export default function Home() {
  // Configuración del flujo de trabajo: 'upload' | 'ocr_edit' | 'analyzed'
  const [currentStep, setCurrentStep] = useState<"upload" | "ocr_edit" | "analyzed">("upload");
  const [ocrMode, setOcrMode] = useState<"local" | "ai">("ai");
  const [viewMode, setViewMode] = useState<"analyzer" | "archive">("analyzer");
  
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [rawText, setRawText] = useState<string>("");
  const [result, setResult] = useState<JudicialFileAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Chat de consultas
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatSending, setIsChatSending] = useState(false);

  // Estados del Archivero
  const [archiveList, setArchiveList] = useState<any[]>([]);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [selectedArchiveItem, setSelectedArchiveItem] = useState<any | null>(null);
  const [archiveItemText, setArchiveItemText] = useState<string>("");
  const [isUpdatingArchiveText, setIsUpdatingArchiveText] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState("");

  // Estado del Zoom para imágenes
  const [imageZoom, setImageZoom] = useState(1);

  const getPdfUrl = (url: string) => {
    if (!url) return "";
    return url.includes("#") ? url : `${url}#view=FitH`;
  };

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    if (fileUrl && fileUrl.startsWith("blob:")) {
      URL.revokeObjectURL(fileUrl);
    }
    setFileUrl(URL.createObjectURL(selectedFile));
    setImageZoom(1);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // Paso 1: Ejecutar OCR
  const runLocalOcr = async () => {
    if (!file) return;

    setIsProcessingOcr(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", ocrMode);

    try {
      const response = await fetch("http://localhost:8000/api/ocr", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Error al procesar el archivo mediante OCR.");
      }

      const data = await response.json();
      setRawText(data.text);
      setArchiveId(data.id);
      setCurrentStep("ocr_edit");
      setImageZoom(1);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "No se pudo conectar con el servidor backend en http://localhost:8000");
    } finally {
      setIsProcessingOcr(false);
    }
  };

  // Paso 2: Ejecutar Análisis sobre texto editado/confirmado
  const runAnalysis = async () => {
    if (!rawText.trim()) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Guardar cualquier cambio realizado en la revisión
      if (archiveId) {
        try {
          await fetch(`http://localhost:8000/api/archive/${archiveId}/text`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: rawText }),
          });
        } catch (saveErr) {
          console.error("Error al actualizar texto editado:", saveErr);
        }
      }

      const response = await fetch("http://localhost:8000/api/analyze-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: rawText }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Error en el servidor al analizar el texto.");
      }

      const data: JudicialFileAnalysis = await response.json();
      setResult(data);
      setCurrentStep("analyzed");
      
      // Mensaje de bienvenida en el chat
      setChatMessages([
        { sender: "ai", text: "Hola. He analizado el expediente judicial. ¿Qué información deseas consultar sobre él?" }
      ]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al realizar el análisis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Paso 3: Chat Q&A
  const sendChatMessage = async () => {
    if (!chatInput.trim() || !rawText || isChatSending) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setIsChatSending(true);

    try {
      const response = await fetch("http://localhost:8000/api/chat-query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document_text: rawText,
          question: userMsg,
        }),
      });

      if (!response.ok) {
        throw new Error("Error al consultar a la IA.");
      }

      const data = await response.json();
      setChatMessages((prev) => [...prev, { sender: "ai", text: data.answer }]);
    } catch (err: any) {
      console.error(err);
      setChatMessages((prev) => [...prev, { sender: "ai", text: "Error de comunicación con la IA. Por favor, reintenta." }]);
    } finally {
      setIsChatSending(false);
    }
  };

  // Reset del flujo
  const resetWorkflow = () => {
    if (fileUrl && fileUrl.startsWith("blob:")) {
      URL.revokeObjectURL(fileUrl);
    }
    setFile(null);
    setFileUrl(null);
    setArchiveId(null);
    setRawText("");
    setResult(null);
    setChatMessages([]);
    setError(null);
    setCurrentStep("upload");
    setImageZoom(1);
  };

  // Funciones del Archivero
  const fetchArchiveList = async () => {
    setIsLoadingArchive(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:8000/api/archive");
      if (!response.ok) throw new Error("Error al obtener la lista del archivero.");
      const data = await response.json();
      setArchiveList(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al cargar el archivero.");
    } finally {
      setIsLoadingArchive(false);
    }
  };

  const selectArchiveItem = async (item: any) => {
    setSelectedArchiveItem(item);
    setArchiveItemText("");
    setError(null);
    setImageZoom(1);
    try {
      const response = await fetch(`http://localhost:8000/api/archive/${item.id}/text`);
      if (!response.ok) throw new Error("No se pudo cargar el texto del archivo.");
      const data = await response.json();
      setArchiveItemText(data.text);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al cargar el texto.");
    }
  };

  const updateArchiveItemText = async () => {
    if (!selectedArchiveItem) return;
    setIsUpdatingArchiveText(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8000/api/archive/${selectedArchiveItem.id}/text`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: archiveItemText }),
      });
      if (!response.ok) throw new Error("Error al guardar el texto.");
      alert("Texto guardado en el servidor correctamente.");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al guardar el texto.");
    } finally {
      setIsUpdatingArchiveText(false);
    }
  };

  const analyzeArchiveItem = async () => {
    if (!selectedArchiveItem || !archiveItemText.trim()) return;
    setIsAnalyzing(true);
    setError(null);
    setImageZoom(1);
    try {
      // Guardar cualquier cambio de texto primero
      await fetch(`http://localhost:8000/api/archive/${selectedArchiveItem.id}/text`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: archiveItemText }),
      });

      // Ejecutar el análisis
      const response = await fetch("http://localhost:8000/api/analyze-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: archiveItemText }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Error en el servidor al analizar el texto.");
      }

      const data: JudicialFileAnalysis = await response.json();
      setResult(data);
      setRawText(archiveItemText);
      setArchiveId(selectedArchiveItem.id);
      
      // Ajustar URL y mockear objeto File para visualización
      setFileUrl(selectedArchiveItem.file_url);
      setFile({
        name: selectedArchiveItem.filename,
        size: selectedArchiveItem.size,
        type: selectedArchiveItem.filename.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/png"
      } as any);

      setCurrentStep("analyzed");
      setViewMode("analyzer");
      setChatMessages([
        { sender: "ai", text: "Hola. He analizado el expediente judicial desde el archivero. ¿Qué deseas consultar sobre él?" }
      ]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al analizar el expediente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helpers de colores de roles
  const getRoleBadgeStyle = (role: string) => {
    switch (role.toLowerCase()) {
      case "juez":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case "víctima":
      case "demandante":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "agresor":
      case "demandado":
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      case "abogado_defensor":
      case "abogado_acusador":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "testigo":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      default:
        return "bg-slate-500/20 text-slate-300 border-slate-500/30";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role.toLowerCase()) {
      case "juez": return "Juez";
      case "víctima": return "Víctima";
      case "demandante": return "Demandante";
      case "agresor": return "Agresor / Imputado";
      case "demandado": return "Demandado";
      case "abogado_defensor": return "Defensa Técnica";
      case "abogado_acusador": return "Acusación / Fiscal";
      case "testigo": return "Testigo";
      default: return role;
    }
  };

  return (
    <main className="min-h-screen bg-[#090d16] text-[#e2e8f0] font-sans relative">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-800/60 bg-[#090d16]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[96%] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              Δ
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                LIBRA <span className="text-xs bg-blue-500/20 text-blue-400 font-semibold px-2 py-0.5 rounded-full">v1.1</span>
              </h1>
              <p className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">Tribunal Supremo de Justicia</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setViewMode("analyzer");
                setError(null);
              }}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                viewMode === "analyzer"
                  ? "bg-blue-600 border-blue-500 text-white font-semibold shadow-md shadow-blue-600/20"
                  : "bg-slate-800/60 border-slate-700 hover:bg-slate-700/80 text-slate-300"
              }`}
            >
              Analizador
            </button>
            <button
              onClick={() => {
                setViewMode("archive");
                fetchArchiveList();
                setError(null);
              }}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                viewMode === "archive"
                  ? "bg-blue-600 border-blue-500 text-white font-semibold shadow-md shadow-blue-600/20"
                  : "bg-slate-800/60 border-slate-700 hover:bg-slate-700/80 text-slate-300"
              }`}
            >
              🗄️ Archivero Local
            </button>

            {currentStep !== "upload" && viewMode === "analyzer" && (
              <button
                onClick={resetWorkflow}
                className="text-xs bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg transition-all"
              >
                Analizar otro documento
              </button>
            )}
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-slate-400 font-medium">Docker Activo</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content Container */}
      <div className="max-w-[96%] mx-auto px-6 py-8">
        
        {viewMode === "analyzer" && (
          <>
            {/* STEP 1: UPLOAD FILE */}
            {currentStep === "upload" && (
              <div className="max-w-2xl mx-auto mt-12 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-xl">
                <h2 className="text-xl font-bold text-white mb-2 text-center">Analizador Judicial Local</h2>
                <p className="text-slate-400 text-sm text-center mb-8">Sube tu archivo para realizar la lectura OCR aislada en el contenedor del sistema.</p>
                
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
                    dragActive
                      ? "border-blue-500 bg-blue-500/5"
                      : "border-slate-800 hover:border-slate-700 bg-slate-950/40"
                  }`}
                >
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.docx,image/*"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <svg className="w-12 h-12 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <div>
                        <span className="text-sm font-semibold text-blue-400 hover:text-blue-300">Arrastra o sube tu documento</span>
                        <p className="text-xs text-slate-500 mt-2">Formatos: PDF (digital/escaneado), DOCX o Imágenes</p>
                      </div>
                    </div>
                  </label>
                </div>

                {file && (
                  <div className="mt-6 p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <svg className="w-8 h-8 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{file.name}</p>
                        <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Selector de motor de lectura / OCR */}
                <div className="mt-6">
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-3">Motor de Lectura / OCR</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setOcrMode("local")}
                      className={`p-4 rounded-xl border text-left transition-all duration-200 flex flex-col gap-1 ${
                        ocrMode === "local"
                          ? "border-blue-500 bg-blue-500/10 text-white shadow-md shadow-blue-500/5"
                          : "border-slate-800 hover:border-slate-700 bg-slate-950/40 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-semibold text-sm">
                        <span className={`w-2.5 h-2.5 rounded-full ${ocrMode === "local" ? "bg-blue-400" : "bg-slate-600"}`} />
                        OCR Local (Tesseract)
                      </div>
                      <span className="text-xs text-slate-500 leading-normal">
                        Procesamiento local 100% privado en contenedor Docker. Rápido y seguro.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOcrMode("ai")}
                      className={`p-4 rounded-xl border text-left transition-all duration-200 flex flex-col gap-1 ${
                        ocrMode === "ai"
                          ? "border-purple-500 bg-purple-500/10 text-white shadow-md shadow-purple-500/5"
                          : "border-slate-800 hover:border-slate-700 bg-slate-950/40 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 font-semibold text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${ocrMode === "ai" ? "bg-purple-400" : "bg-slate-600"}`} />
                          OCR con IA (Gemini)
                        </div>
                        <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold tracking-wider uppercase">
                          Recomendado
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 leading-normal">
                        Máxima precisión. Ideal para escaneos borrosos, con sellos, tachaduras o firmas.
                      </span>
                    </button>

                  </div>
                </div>

                <button
                  onClick={runLocalOcr}
                  disabled={!file || isProcessingOcr}
                  className={`w-full mt-6 py-3.5 px-4 rounded-xl font-semibold text-white transition-all shadow-lg flex items-center justify-center gap-2 ${
                    ocrMode === "ai"
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-600/20"
                      : "bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 shadow-blue-600/20"
                  }`}
                >
                  {isProcessingOcr ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {ocrMode === "ai" ? "Procesando Lectura con Gemini..." : "Procesando Lectura OCR Local..."}
                    </>
                  ) : (
                    ocrMode === "ai" ? "Extraer Texto con IA (Gemini)" : "Extraer Texto con OCR Local"
                  )}
                </button>

                {error && (
                  <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg text-center">
                    {error}
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: OCR EDIT & CORRECT (Side-by-Side Layout) */}
            {currentStep === "ocr_edit" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full mx-auto">
                
                {/* Columna Izquierda: Visor del archivo original */}
                <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl flex flex-col h-[780px]">
                  <h3 className="text-sm font-bold text-white mb-3">Documento Original</h3>
                  <div className="flex-grow border border-slate-800 bg-slate-950/60 rounded-xl overflow-auto flex items-start justify-center relative">
                    {fileUrl ? (
                      file?.type === "application/pdf" || file?.name.toLowerCase().endsWith(".pdf") ? (
                        <iframe
                          src={getPdfUrl(fileUrl)}
                          className="w-full h-full border-none"
                          title="Visor PDF"
                        />
                      ) : file?.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(file?.name || "") ? (
                        <img
                          src={fileUrl}
                          alt="Vista previa del documento"
                          className="transition-all duration-200 object-contain p-2"
                          style={{
                            width: `${imageZoom * 100}%`,
                            height: 'auto',
                            maxHeight: 'none',
                            maxWidth: 'none',
                          }}
                        />
                      ) : (
                        <div className="text-center p-4 m-auto">
                          <svg className="w-12 h-12 text-slate-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-xs text-slate-400">Vista previa no disponible para este formato</p>
                          <p className="text-[10px] text-slate-600 mt-1">{file?.name}</p>
                        </div>
                      )
                    ) : (
                      <p className="text-xs text-slate-500 m-auto">Cargando visor...</p>
                    )}

                    {/* Botones de zoom para imágenes */}
                    {fileUrl && !(file?.type === "application/pdf" || file?.name.toLowerCase().endsWith(".pdf")) && (
                      <div className="absolute bottom-4 right-4 flex items-center gap-1 z-20 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-lg p-1.5 shadow-lg">
                        <button
                          onClick={() => setImageZoom(prev => Math.max(prev - 0.25, 0.5))}
                          className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition-colors"
                          title="Alejar"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs font-mono text-slate-300 min-w-[50px] text-center">
                          {Math.round(imageZoom * 100)}%
                        </span>
                        <button
                          onClick={() => setImageZoom(prev => Math.min(prev + 0.25, 3))}
                          className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition-colors"
                          title="Acercar"
                        >
                          +
                        </button>
                        <button
                          onClick={() => setImageZoom(1)}
                          className="ml-1 px-2 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-medium transition-colors"
                          title="Restaurar escala"
                        >
                          Reset
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Columna Derecha: Cuadro de edición de texto */}
                <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl flex flex-col h-[780px]">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h2 className="text-base font-bold text-white">Revisión y Corrección del OCR</h2>
                      <p className="text-[11px] text-slate-400">Edita el texto a la derecha comparándolo con el documento original a la izquierda.</p>
                    </div>
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-medium">Humano en el bucle</span>
                  </div>

                  <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="flex-grow w-full bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 leading-relaxed resize-none overflow-y-auto"
                    placeholder="Texto extraído del expediente..."
                  />

                  <div className="mt-4 flex justify-end gap-3">
                    <button
                      onClick={() => setCurrentStep("upload")}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 border border-slate-700 transition-all"
                    >
                      Volver a cargar
                    </button>
                    <button
                      onClick={runAnalysis}
                      disabled={isAnalyzing || !rawText.trim()}
                      className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                    >
                      {isAnalyzing ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Analizando Ficha con Gemini...
                        </>
                      ) : (
                        "Confirmar y Analizar con IA"
                      )}
                    </button>
                  </div>

                  {error && (
                    <div className="mt-3 p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] rounded-lg text-center">
                      {error}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* STEP 3: ANALYZED RESULT & CHAT */}
            {currentStep === "analyzed" && result && (
              <div className="space-y-8 animate-fadeIn w-full">
                
                {/* Resumen Ejecutivo del Caso (Ancho Completo) */}
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl flex flex-col justify-between h-[300px] w-full mx-auto">
                  <div>
                    <h3 className="text-base font-bold text-white mb-3">Resumen Ejecutivo del Caso</h3>
                    <p className="text-sm text-slate-300 leading-relaxed overflow-y-auto max-h-[170px]">{result.summary}</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/60">
                    <div>
                      <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Expediente</p>
                      <p className="text-xs font-bold text-white truncate">{result.case_number || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Tribunal</p>
                      <p className="text-xs font-bold text-white truncate" title={result.court_name}>{result.court_name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Asunto</p>
                      <p className="text-xs font-bold text-blue-400 truncate" title={result.crime_or_subject}>{result.crime_or_subject || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Fecha</p>
                      <p className="text-xs font-bold text-white truncate">{result.date || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Entities */}
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl">
                  <h3 className="text-base font-bold text-white mb-4">Actores e Involucrados Identificados</h3>
                  {result.entities.length === 0 ? (
                    <p className="text-xs text-slate-500">No se identificaron actores clave en el expediente.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {result.entities.map((entity, i) => (
                        <div key={i} className="bg-slate-950/50 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-bold text-white">{entity.name}</h4>
                              <span className={`text-[10px] px-2 py-0.5 rounded border ${getRoleBadgeStyle(entity.role)}`}>
                                {getRoleLabel(entity.role)}
                              </span>
                            </div>
                            {entity.context && (
                              <p className="text-xs text-slate-400 mt-2 italic leading-relaxed">
                                "{entity.context}"
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Acontecimientos Clave (Ancho Completo) */}
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl w-full">
                  <h3 className="text-base font-bold text-white mb-4">Acontecimientos Clave</h3>
                  <ul className="space-y-3">
                    {result.key_points.map((point, idx) => (
                      <li key={idx} className="flex gap-3 text-xs leading-relaxed text-slate-300">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Q&A CHAT INTERACTIVE PANEL */}
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl shadow-xl">
                  <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
                    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <h3 className="text-base font-bold text-white">Consultas directas del Expediente</h3>
                    <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">Pregunta libre</span>
                  </div>

                  {/* Message Box */}
                  <div className="h-64 overflow-y-auto mb-4 p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-4">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            msg.sender === "user"
                              ? "bg-blue-600 text-white rounded-tr-none"
                              : "bg-slate-800/80 text-slate-200 border border-slate-700/60 rounded-tl-none"
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {isChatSending && (
                      <div className="flex justify-start">
                        <div className="bg-slate-800/80 text-slate-400 border border-slate-700/60 rounded-2xl rounded-tl-none px-4 py-2.5 text-xs flex items-center gap-2">
                          <span className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                          </span>
                          Pensando en el expediente...
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chat Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                      placeholder="Ej: ¿Cuáles son las pretensiones del demandante o qué pruebas se aportan?"
                      className="flex-grow bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <button
                      onClick={sendChatMessage}
                      disabled={isChatSending || !chatInput.trim()}
                      className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 px-6 rounded-xl text-white font-semibold text-sm transition-all"
                    >
                      Enviar
                    </button>
                  </div>
                </div>

              </div>
            )}
          </>
        )}

        {/* VIEWMODE: ARCHIVE */}
        {viewMode === "archive" && (
          <div className="animate-fadeIn w-full">
            <h2 className="text-xl font-bold text-white mb-2">🗄️ Archivero Local</h2>
            <p className="text-slate-400 text-xs mb-6">Visualiza y edita los archivos físicos y textos guardados en este contenedor Docker.</p>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full mx-auto">
              {/* Columna Izquierda: Lista de Archivos */}
              <div className="lg:col-span-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl flex flex-col h-[780px]">
                <div className="mb-4">
                  <input
                    type="text"
                    value={archiveSearch}
                    onChange={(e) => setArchiveSearch(e.target.value)}
                    placeholder="Buscar en el archivero..."
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="flex-grow overflow-y-auto space-y-2 pr-1">
                  {isLoadingArchive ? (
                    <div className="text-center py-12">
                      <svg className="animate-spin h-6 w-6 text-blue-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <p className="text-xs text-slate-500">Cargando archivos guardados...</p>
                    </div>
                  ) : archiveList.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-12">No hay archivos en el archivero.</p>
                  ) : (
                    archiveList
                      .filter(item => item.filename.toLowerCase().includes(archiveSearch.toLowerCase()))
                      .map((item) => (
                        <div
                          key={item.id}
                          onClick={() => selectArchiveItem(item)}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                            selectedArchiveItem?.id === item.id
                              ? "border-blue-500 bg-blue-500/10 text-white"
                              : "border-slate-800/80 hover:border-slate-700 bg-slate-950/40 text-slate-300"
                          }`}
                        >
                          <p className="text-xs font-semibold truncate" title={item.filename}>{item.filename}</p>
                          <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
                            <span>{(item.size / 1024 / 1024).toFixed(2)} MB</span>
                            <span>{new Date(item.timestamp * 1000).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Columna Derecha: Detalle del Archivo Seleccionado */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                {selectedArchiveItem ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[780px]">
                    {/* Visualización del Archivo */}
                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl flex flex-col h-full">
                      <h3 className="text-xs font-bold text-white mb-2">Archivo Original</h3>
                      <div className="flex-grow border border-slate-800 bg-slate-950/60 rounded-xl overflow-auto flex items-start justify-center relative">
                        {selectedArchiveItem.filename.toLowerCase().endsWith(".pdf") ? (
                          <iframe
                            src={getPdfUrl(selectedArchiveItem.file_url)}
                            className="w-full h-full border-none"
                            title="Visor PDF Archivo"
                          />
                        ) : /\.(jpg|jpeg|png|webp|gif)$/i.test(selectedArchiveItem.filename) ? (
                          <img
                            src={selectedArchiveItem.file_url}
                            alt="Visualización de archivo"
                            className="transition-all duration-200 object-contain p-2"
                            style={{
                              width: `${imageZoom * 100}%`,
                              height: 'auto',
                              maxHeight: 'none',
                              maxWidth: 'none',
                            }}
                          />
                        ) : (
                          <div className="text-center p-4 m-auto">
                            <svg className="w-12 h-12 text-slate-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-xs text-slate-400">Vista previa no disponible para este formato</p>
                            <p className="text-[10px] text-slate-600 mt-1">{selectedArchiveItem.filename}</p>
                          </div>
                        )}

                        {/* Controles de zoom para imágenes en el archivero */}
                        {selectedArchiveItem && !(selectedArchiveItem.filename.toLowerCase().endsWith(".pdf")) && (
                          <div className="absolute bottom-4 right-4 flex items-center gap-1 z-20 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-lg p-1.5 shadow-lg">
                            <button
                              onClick={() => setImageZoom(prev => Math.max(prev - 0.25, 0.5))}
                              className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition-colors"
                              title="Alejar"
                            >
                              -
                            </button>
                            <span className="px-2 text-xs font-mono text-slate-300 min-w-[50px] text-center">
                              {Math.round(imageZoom * 100)}%
                            </span>
                            <button
                              onClick={() => setImageZoom(prev => Math.min(prev + 0.25, 3))}
                              className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition-colors"
                              title="Acercar"
                            >
                              +
                            </button>
                            <button
                              onClick={() => setImageZoom(1)}
                              className="ml-1 px-2 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-medium transition-colors"
                              title="Restaurar escala"
                            >
                              Reset
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Visualización y Edición de Texto */}
                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl flex flex-col h-full">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xs font-bold text-white">Texto Plano Extraído</h3>
                        <span className="text-[9px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">Editable</span>
                      </div>
                      <textarea
                        value={archiveItemText}
                        onChange={(e) => setArchiveItemText(e.target.value)}
                        className="flex-grow w-full bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 leading-relaxed resize-none overflow-y-auto"
                        placeholder="Cargando texto del archivo..."
                      />

                      <div className="mt-4 flex gap-2 justify-end">
                        <button
                          onClick={updateArchiveItemText}
                          disabled={isUpdatingArchiveText || !archiveItemText.trim()}
                          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 border border-slate-700 transition-all flex items-center gap-1.5"
                        >
                          {isUpdatingArchiveText ? "Guardando..." : "💾 Guardar Texto"}
                        </button>
                        <button
                          onClick={analyzeArchiveItem}
                          disabled={isAnalyzing || !archiveItemText.trim()}
                          className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 shadow-lg shadow-blue-600/20 transition-all flex items-center gap-1.5"
                        >
                          {isAnalyzing ? "Analizando..." : "🧠 Analizar con IA"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 backdrop-blur-xl text-center flex flex-col items-center justify-center h-[780px]">
                    <svg className="w-16 h-16 text-slate-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h5l2 2h9a2 2 0 012 2v8a2 2 0 01-2 2H5z" />
                    </svg>
                    <h3 className="text-sm font-semibold text-white mb-1">Ningún archivo seleccionado</h3>
                    <p className="text-xs text-slate-500">Selecciona un expediente de la lista de la izquierda para ver su contenido y opciones de análisis.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}


