import React from "react";
import { Entity, JudicialFileAnalysis, ChatMessage, getRoleBadgeStyle, getRoleLabel } from "@/types";

const renderMarkdown = (text: string) => {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, lineIdx) => {
    let cleanLine = line.trim();
    if (cleanLine.startsWith("###")) {
      const content = cleanLine.replace(/^###\s*/, "");
      return <h4 key={lineIdx} className="font-bold text-slate-100 text-[11px] mt-2 mb-1">{parseInline(content)}</h4>;
    }
    if (cleanLine.startsWith("##")) {
      const content = cleanLine.replace(/^##\s*/, "");
      return <h3 key={lineIdx} className="font-black text-slate-100 text-[12px] mt-3 mb-1.5">{parseInline(content)}</h3>;
    }
    if (cleanLine.startsWith("#")) {
      const content = cleanLine.replace(/^#\s*/, "");
      return <h2 key={lineIdx} className="font-black text-white text-[13px] mt-3 mb-1.5">{parseInline(content)}</h2>;
    }
    const isBulletList = cleanLine.startsWith("* ") || cleanLine.startsWith("- ");
    const isNumberedList = /^\d+\.\s+/.test(cleanLine);
    if (isBulletList) {
      const content = cleanLine.replace(/^[*+-]\s*/, "");
      return (
        <div key={lineIdx} className="flex gap-1.5 ml-2 my-0.5 items-start">
          <span className="text-blue-400 shrink-0">•</span>
          <span className="text-slate-200">{parseInline(content)}</span>
        </div>
      );
    }
    if (isNumberedList) {
      const match = cleanLine.match(/^(\d+)\.\s+(.*)/);
      if (match) {
        const num = match[1];
        const content = match[2];
        return (
          <div key={lineIdx} className="flex gap-1.5 ml-2 my-0.5 items-start">
            <span className="text-blue-400 font-bold shrink-0">{num}.</span>
            <span className="text-slate-200">{parseInline(content)}</span>
          </div>
        );
      }
    }
    if (cleanLine === "") {
      return <div key={lineIdx} className="h-1.5" />;
    }
    return <p key={lineIdx} className="my-0.5 text-slate-200">{parseInline(line)}</p>;
  });
};

const parseInline = (text: string) => {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, idx) => {
    if (idx % 2 === 1) {
      return <strong key={idx} className="font-extrabold text-white">{part}</strong>;
    }
    return part;
  });
};

interface AnalyzerViewProps {
  currentStep: "upload" | "ocr_edit" | "analyzed";
  ocrMode: "local" | "ai";
  setOcrMode: (mode: "local" | "ai") => void;
  sourceTab: "doc" | "text";
  setSourceTab: (tab: "doc" | "text") => void;
  file: File | null;
  setFile: (file: File | null) => void;
  fileUrl: string | null;
  dragActive: boolean;
  handleDrag: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isProcessingOcr: boolean;
  runLocalOcr: () => void;
  isAnalyzing: boolean;
  runAnalysis: () => void;
  rawText: string;
  setRawText: (text: string) => void;
  result: JudicialFileAnalysis | null;
  error: string | null;
  imageZoom: number;
  setImageZoom: React.Dispatch<React.SetStateAction<number>>;
  showChatbot: boolean;
  setShowChatbot: (show: boolean) => void;
  chatInput: string;
  setChatInput: (input: string) => void;
  chatMessages: ChatMessage[];
  isChatSending: boolean;
  sendChatMessage: () => void;
  BACKEND_URL: string;
  getPdfUrl: (url: string) => string;
  userRole: string;
  resetWorkflow: () => void;
  archiveId: string | null;
  validateDocumentDirectly: (id: string) => void;
  onBackToArchive?: () => void;
}

export const AnalyzerView: React.FC<AnalyzerViewProps> = ({
  currentStep,
  ocrMode,
  setOcrMode,
  sourceTab,
  setSourceTab,
  file,
  setFile,
  fileUrl,
  dragActive,
  handleDrag,
  handleDrop,
  handleFileChange,
  isProcessingOcr,
  runLocalOcr,
  isAnalyzing,
  runAnalysis,
  rawText,
  setRawText,
  result,
  error,
  imageZoom,
  setImageZoom,
  showChatbot,
  setShowChatbot,
  chatInput,
  setChatInput,
  chatMessages,
  isChatSending,
  sendChatMessage,
  BACKEND_URL,
  getPdfUrl,
  userRole,
  resetWorkflow,
  archiveId,
  validateDocumentDirectly,
  onBackToArchive,
}) => {
  return (
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
          
          {onBackToArchive && (
            <button
              onClick={onBackToArchive}
              className="w-full mt-3 py-2 px-4 rounded-xl font-semibold text-slate-400 bg-slate-900 border border-slate-800 hover:bg-slate-800/80 hover:text-slate-200 transition-all text-xs flex items-center justify-center gap-1.5"
            >
              ⬅️ Volver al Archivero
            </button>
          )}

          {error && (
            <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg text-center">
              {error}
            </div>
          )}
        </div>
      )}

      {/* STEP 2: OCR EDIT & CORRECT */}
      {currentStep === "ocr_edit" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full mx-auto">
          {/* Columna Izquierda: Visor original */}
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
                      height: "auto",
                      maxHeight: "none",
                      maxWidth: "none",
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

          {/* Columna Derecha: Edición de texto */}
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
              {onBackToArchive ? (
                <button
                  onClick={onBackToArchive}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-850 hover:bg-slate-800 text-slate-400 border border-slate-800 transition-all"
                >
                  Volver al Archivero
                </button>
              ) : (
                <button
                  onClick={resetWorkflow}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 border border-slate-700 transition-all"
                >
                  Volver a cargar
                </button>
              )}
              {userRole === "digital_secretary" ? (
                <button
                  onClick={runAnalysis}
                  disabled={isAnalyzing || !rawText.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Procesando y Guardando...
                    </>
                  ) : (
                    "Confirmar y Guardar"
                  )}
                </button>
              ) : (
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
              )}
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full mx-auto">
          {/* Columna Izquierda: Visor PDF / Texto */}
          <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl flex flex-col h-[780px]">
            <div className="flex border-b border-slate-800 mb-4">
              <button
                onClick={() => setSourceTab("doc")}
                className={`pb-2 px-4 text-xs font-semibold border-b-2 transition-all ${
                  sourceTab === "doc"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-slate-400 hover:text-slate-300"
                }`}
              >
                📄 Archivo Original
              </button>
              <button
                onClick={() => setSourceTab("text")}
                className={`pb-2 px-4 text-xs font-semibold border-b-2 transition-all ${
                  sourceTab === "text"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-slate-400 hover:text-slate-300"
                }`}
              >
                📝 Texto Extraído
              </button>
            </div>
            
            <div className="flex-grow border border-slate-800 bg-slate-950/60 rounded-xl overflow-auto flex items-start justify-center relative">
              {sourceTab === "doc" ? (
                fileUrl ? (
                  file?.type === "application/pdf" || file?.name.toLowerCase().endsWith(".pdf") ? (
                    <iframe
                      src={getPdfUrl(fileUrl)}
                      className="w-full h-full border-none"
                      title="Visor PDF Análisis"
                    />
                  ) : file?.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(file?.name || "") ? (
                    <img
                      src={fileUrl}
                      alt="Vista previa del documento"
                      className="transition-all duration-200 object-contain p-2"
                      style={{
                        width: `${imageZoom * 100}%`,
                        height: "auto",
                        maxHeight: "none",
                        maxWidth: "none",
                      }}
                    />
                  ) : (
                    <div className="text-center p-4 m-auto">
                      <svg className="w-12 h-12 text-slate-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-xs text-slate-400">Vista previa no disponible</p>
                      <p className="text-[10px] text-slate-600 mt-1">{file?.name}</p>
                    </div>
                  )
                ) : (
                  <p className="text-xs text-slate-500 m-auto">Cargando visor...</p>
                )
              ) : (
                <textarea
                  readOnly
                  value={rawText}
                  className="w-full h-full bg-transparent border-none p-4 text-xs font-mono text-slate-300 focus:outline-none leading-relaxed resize-none overflow-y-auto"
                />
              )}
              {sourceTab === "doc" && fileUrl && !(file?.type === "application/pdf" || file?.name.toLowerCase().endsWith(".pdf")) && (
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

          {/* Columna Derecha: Ficha y Chat */}
          <div className="lg:col-span-7 flex flex-col gap-6 h-[780px] overflow-y-auto pr-1">
            {/* Resumen Ejecutivo */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl flex flex-col justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold text-white mb-2">Resumen Ejecutivo del Caso</h3>
                <p className="text-xs text-slate-300 leading-relaxed max-h-[120px] overflow-y-auto">{result.summary}</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-800/60">
                <div>
                  <p className="text-[8px] text-slate-500 uppercase tracking-wider font-semibold">Expediente</p>
                  <p className="text-[11px] font-bold text-white truncate">{result.case_number || "N/A"}</p>
                </div>
                <div>
                  <p className="text-[8px] text-slate-500 uppercase tracking-wider font-semibold">Tribunal</p>
                  <p className="text-[11px] font-bold text-white truncate" title={result.court_name}>{result.court_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-[8px] text-slate-500 uppercase tracking-wider font-semibold">Asunto</p>
                  <p className="text-[11px] font-bold text-blue-400 truncate" title={result.crime_or_subject}>{result.crime_or_subject || "N/A"}</p>
                </div>
                <div>
                  <p className="text-[8px] text-slate-500 uppercase tracking-wider font-semibold">Fecha</p>
                  <p className="text-[11px] font-bold text-white truncate">{result.date || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Actores */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl shrink-0">
              <h3 className="text-sm font-bold text-white mb-3">Actores e Involucrados</h3>
              {result.entities.length === 0 ? (
                <p className="text-xs text-slate-500">No se identificaron actores clave.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.entities.map((entity, i) => (
                    <div key={i} className="bg-slate-950/50 border border-slate-800/80 p-3 rounded-xl">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-white truncate max-w-[140px]">{entity.name}</h4>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border ${getRoleBadgeStyle(entity.role)}`}>
                          {getRoleLabel(entity.role)}
                        </span>
                      </div>
                      {entity.context && (
                        <p className="text-[10px] text-slate-400 mt-1 italic leading-relaxed truncate" title={entity.context}>
                          "{entity.context}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Acontecimientos Clave */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl shrink-0">
              <h3 className="text-sm font-bold text-white mb-3">Acontecimientos Clave</h3>
              <ul className="space-y-2">
                {result.key_points.map((point, idx) => (
                  <li key={idx} className="flex gap-2 text-xs leading-relaxed text-slate-300">
                    <span className="flex-shrink-0 w-4.5 h-4.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Chatbot (Ocultar para digital_secretary) */}
            {userRole !== "digital_secretary" ? (
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl shadow-xl flex flex-col flex-grow min-h-[300px]">
                <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2">
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <h3 className="text-xs font-bold text-white">Consultas del Expediente</h3>
                </div>

                <div className="flex-grow overflow-y-auto mb-3 p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3 min-h-[140px] max-h-[220px]">
                  {chatMessages.length === 0 && (
                    <p className="text-xs text-slate-500 italic text-center py-12">
                      Haz una pregunta sobre el documento analizado.
                    </p>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                          msg.sender === "user"
                            ? "bg-blue-600 text-white rounded-tr-none"
                            : "bg-slate-800/80 text-slate-200 border border-slate-700/60 rounded-tl-none"
                        }`}
                      >
                        {msg.sender === "user" ? msg.text : renderMarkdown(msg.text)}
                      </div>
                    </div>
                  ))}
                  {isChatSending && (
                    <div className="flex justify-start">
                      <div className="bg-slate-800/80 text-slate-400 border border-slate-700/60 rounded-xl rounded-tl-none px-3 py-2 text-[10px] flex items-center gap-1.5">
                        <span className="flex gap-1">
                          <span className="w-1.5 h-1 bg-slate-400 rounded-full animate-bounce" />
                          <span className="w-1.5 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                          <span className="w-1.5 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </span>
                        Pensando...
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                    placeholder="Ej: ¿Cuáles son las pretensiones o qué pruebas hay?"
                    className="flex-grow bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={isChatSending || !chatInput.trim()}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 px-4 rounded-xl text-white font-semibold text-xs transition-all"
                  >
                    Enviar
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl flex flex-col items-center justify-center gap-3 py-8 shrink-0">
                <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <p className="text-xs text-slate-400 text-center max-w-[280px]">
                  Como **Secretario Digital**, tu rol es de digitalización y validación. Las consultas al chatbot están reservadas para los usuarios lectores y de tribunal.
                </p>
                {archiveId && !archiveId.includes("demo") && (
                  <div className="flex gap-3">
                    {onBackToArchive && (
                      <button
                        onClick={onBackToArchive}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs px-6 py-2.5 rounded-xl transition-all border border-slate-700"
                      >
                        ⬅️ Volver al Archivero
                      </button>
                    )}
                    <button
                      onClick={() => validateDocumentDirectly(archiveId)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-600/20"
                    >
                      ✔️ Validar Definitivamente
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
