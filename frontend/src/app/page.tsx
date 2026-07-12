"use client";

import { useState } from "react";

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
  suggested_steps: string[];
}

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
}

export default function Home() {
  // Configuración del flujo de trabajo: 'upload' | 'ocr_edit' | 'analyzed'
  const [currentStep, setCurrentStep] = useState<"upload" | "ocr_edit" | "analyzed">("upload");
  
  const [file, setFile] = useState<File | null>(null);
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
      setFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  // Paso 1: Ejecutar OCR Local
  const runLocalOcr = async () => {
    if (!file) return;

    setIsProcessingOcr(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

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
      setCurrentStep("ocr_edit");
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
    setFile(null);
    setRawText("");
    setResult(null);
    setChatMessages([]);
    setError(null);
    setCurrentStep("upload");
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
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
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
            {currentStep !== "upload" && (
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
      <div className="max-w-7xl mx-auto px-6 py-8">
        
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

            <button
              onClick={runLocalOcr}
              disabled={!file || isProcessingOcr}
              className="w-full mt-6 py-3.5 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              {isProcessingOcr ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Procesando Lectura OCR Local...
                </>
              ) : (
                "Extraer Texto del Expediente"
              )}
            </button>

            {error && (
              <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg text-center">
                {error}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: OCR EDIT & CORRECT */}
        {currentStep === "ocr_edit" && (
          <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto">
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Revisión y Corrección del OCR</h2>
                  <p className="text-xs text-slate-400">Si el OCR no interpretó bien alguna palabra debido a la calidad del escáner, puedes corregirla en la caja de abajo antes de enviarla al análisis de la IA.</p>
                </div>
                <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded">Humano en el bucle</span>
              </div>

              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="w-full h-96 bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-sm font-mono text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 leading-relaxed resize-y"
                placeholder="Texto extraído del expediente..."
              />

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setCurrentStep("upload")}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 border border-slate-700 transition-all"
                >
                  Volver a cargar
                </button>
                <button
                  onClick={runAnalysis}
                  disabled={isAnalyzing || !rawText.trim()}
                  className="px-6 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
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
                <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg text-center">
                  {error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: ANALYZED RESULT & CHAT */}
        {currentStep === "analyzed" && result && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Top Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Nro de Expediente</p>
                <p className="text-sm font-bold text-white mt-1">{result.case_number || "No especificado"}</p>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Tribunal / Juzgado</p>
                <p className="text-sm font-bold text-white mt-1 truncate" title={result.court_name}>{result.court_name || "No especificado"}</p>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Asunto / Delito</p>
                <p className="text-sm font-bold text-blue-400 mt-1 truncate" title={result.crime_or_subject}>{result.crime_or_subject || "No especificado"}</p>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Fecha del Hecho</p>
                <p className="text-sm font-bold text-white mt-1">{result.date || "No especificado"}</p>
              </div>
            </div>

            {/* General Summary */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-base font-bold text-white mb-3">Resumen Ejecutivo del Caso</h3>
              <p className="text-sm text-slate-300 leading-relaxed">{result.summary}</p>
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

            {/* Key Points & Suggested Steps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl">
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

              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl">
                <h3 className="text-base font-bold text-white mb-4">Pasos Recomendados / Análisis</h3>
                <ul className="space-y-3">
                  {result.suggested_steps.map((step, idx) => (
                    <li key={idx} className="flex gap-3 text-xs leading-relaxed text-slate-300">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center font-bold">
                        ✓
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
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

      </div>
    </main>
  );
}
