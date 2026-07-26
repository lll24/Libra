import React, { useState } from "react";
import { Entity, JudicialFileAnalysis, ChatMessage, getRoleBadgeStyle, getRoleLabel } from "@/types";

const renderMarkdown = (text: string, theme: "dark" | "light" = "dark") => {
  if (!text) return null;
  const lines = text.split("\n");

  const textColor = theme === "dark" ? "text-slate-200" : "text-slate-700";
  const headerColor = theme === "dark" ? "text-slate-100" : "text-slate-800";
  const bulletColor = theme === "dark" ? "text-blue-400" : "text-blue-600";
  const titleColor = theme === "dark" ? "text-white" : "text-slate-900";

  return lines.map((line, lineIdx) => {
    let cleanLine = line.trim();
    if (cleanLine.startsWith("###")) {
      const content = cleanLine.replace(/^###\s*/, "");
      return <h4 key={lineIdx} className={`font-bold ${headerColor} text-[11px] mt-2 mb-1`}>{parseInline(content, theme)}</h4>;
    }
    if (cleanLine.startsWith("##")) {
      const content = cleanLine.replace(/^##\s*/, "");
      return <h3 key={lineIdx} className={`font-black ${headerColor} text-[12px] mt-3 mb-1.5`}>{parseInline(content, theme)}</h3>;
    }
    if (cleanLine.startsWith("#")) {
      const content = cleanLine.replace(/^#\s*/, "");
      return <h2 key={lineIdx} className={`font-black ${titleColor} text-[13px] mt-3 mb-1.5`}>{parseInline(content, theme)}</h2>;
    }
    const isBulletList = cleanLine.startsWith("* ") || cleanLine.startsWith("- ");
    const isNumberedList = /^\d+\.\s+/.test(cleanLine);
    if (isBulletList) {
      const content = cleanLine.replace(/^[*+-]\s*/, "");
      return (
        <div key={lineIdx} className="flex gap-1.5 ml-2 my-0.5 items-start">
          <span className={`${bulletColor} shrink-0`}>•</span>
          <span className={textColor}>{parseInline(content, theme)}</span>
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
            <span className={`${bulletColor} font-bold shrink-0`}>{num}.</span>
            <span className={textColor}>{parseInline(content, theme)}</span>
          </div>
        );
      }
    }
    if (cleanLine === "") {
      return <div key={lineIdx} className="h-1.5" />;
    }
    return <p key={lineIdx} className={`my-0.5 ${textColor}`}>{parseInline(line, theme)}</p>;
  });
};

const parseNodes = (text: string, theme: "dark" | "light"): React.ReactNode => {
  const boldColor = theme === "dark" ? "text-white" : "text-slate-900";
  
  const regex = /(\*\*.*?\*\*|<u>.*?<\/u>)/g;
  const parts = text.split(regex);
  
  if (parts.length === 1) return text;

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2);
      return <strong key={idx} className={`font-extrabold ${boldColor}`}>{parseNodes(inner, theme)}</strong>;
    }
    if (part.startsWith('<u>') && part.endsWith('</u>')) {
      const inner = part.slice(3, -4);
      return <span key={idx} className="underline underline-offset-2">{parseNodes(inner, theme)}</span>;
    }
    return part;
  });
};

const parseInline = (text: string, theme: "dark" | "light" = "dark") => {
  return parseNodes(text, theme);
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
  const [isEditingOcrText, setIsEditingOcrText] = useState(false);

  return (
    <>

      {/* STEP 1: UPLOAD FILE - ESTILO CON PROFUNDIDAD Y SVG */}
      {currentStep === "upload" && (
        <div className="animate-fadeIn w-full h-[calc(100vh-56px)] overflow-y-auto flex items-center justify-center bg-[#e2e8f0] p-4 text-slate-800">
          <div className="max-w-xl w-full bg-[#e2e8f0] rounded-[20px] shadow-[8px_8px_16px_#c5cbd2,-8px_-8px_16px_#ffffff] p-7 relative my-auto">

            {/* Breadcrumb Superior con SVG */}
            <div className="flex items-center text-[10px] font-bold text-slate-400 mb-6 tracking-wide">
              {onBackToArchive ? (
                <button onClick={onBackToArchive} className="flex items-center gap-1.5 hover:text-slate-600 transition-colors">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Volver al expediente
                </button>
              ) : (
                <span className="flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Volver al expediente
                </span>
              )}
              <span className="mx-2 font-normal text-slate-300">/</span>
              <span className="text-slate-600">Digitalizar Nuevo Documento</span>
            </div>

            {/* Títulos */}
            <h2 className="text-xl font-bold text-slate-800 mb-1 drop-shadow-sm">Subir Documento</h2>
            <p className="text-[11px] text-slate-500 mb-6">
              Sube una imagen o PDF del documento físico para iniciar la extracción OCR.
            </p>

            {/* Zona de Drop (Drag & Drop) con profundidad inset */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`relative rounded-xl transition-all duration-300 flex flex-col items-center justify-center py-10 group ${dragActive
                  ? "bg-blue-50/50 shadow-[inset_4px_4px_8px_#c5cbd2,inset_-4px_-4px_8px_#ffffff] border-2 border-dashed border-blue-400"
                  : "neu-pressed-sm hover:shadow-[inset_6px_6px_12px_#c5cbd2,inset_-6px_-6px_12px_#ffffff] border-2 border-dashed border-slate-300/70"
                }`}
            >
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.docx,image/*"
              />
              <label htmlFor="file-upload" className="flex flex-col items-center cursor-pointer w-full h-full">

                {/* SVG Minimalista */}
                <div className="relative mb-4 transform group-hover:-translate-y-1 transition-transform duration-300 ease-out flex items-center justify-center w-14 h-14 rounded-full neu-base-sm text-slate-500 group-hover:text-blue-500">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v6m-3-3l3-3 3 3" />
                  </svg>
                </div>

                <p className="text-sm font-bold text-slate-800">Arrastra o sube tu documento</p>
                <p className="text-[11px] text-slate-500 mt-1.5 mb-6 font-medium">PDF, JPG, PNG — máx. 50 MB</p>

                {file ? (
                  <div className="bg-[#e2e8f0] px-4 py-2.5 rounded-lg shadow-[8px_8px_16px_#c5cbd2,-8px_-8px_16px_#ffffff] flex items-center gap-3">
                    <span className="text-xs font-bold text-blue-600 truncate max-w-[200px]">{file.name}</span>
                    <button
                      onClick={(e) => { e.preventDefault(); setFile(null); }}
                      className="text-slate-400 hover:text-rose-500 font-bold bg-[#e2e8f0] hover:shadow-[inset_2px_2px_4px_#c5cbd2,inset_-2px_-2px_4px_#ffffff] shadow-[2px_2px_4px_#c5cbd2,-2px_-2px_4px_#ffffff] w-5 h-5 flex items-center justify-center rounded transition-all"
                      title="Quitar archivo"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#e2e8f0] px-5 py-2.5 rounded-lg shadow-[4px_4px_8px_#c5cbd2,-4px_-4px_8px_#ffffff] text-xs font-bold text-slate-700 transition-all hover:shadow-[inset_2px_2px_4px_#c5cbd2,inset_-2px_-2px_4px_#ffffff]">
                    Seleccionar archivo
                  </div>
                )}
              </label>
            </div>

            {/* Controles OCR y Motor Seleccionado con relieve */}
            <div className="flex items-center justify-between mt-6 border-t border-slate-300 pt-5">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setOcrMode("local")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${ocrMode === "local"
                      ? "bg-[#e2e8f0] text-blue-600 shadow-[inset_2px_2px_4px_#c5cbd2,inset_-2px_-2px_4px_#ffffff]"
                      : "bg-[#e2e8f0] text-slate-500 shadow-[2px_2px_4px_#c5cbd2,-2px_-2px_4px_#ffffff] hover:shadow-[inset_1px_1px_2px_#c5cbd2,inset_-1px_-1px_2px_#ffffff]"
                    }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Forzar OCR Local
                </button>
                <button
                  type="button"
                  onClick={() => setOcrMode("ai")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${ocrMode === "ai"
                      ? "bg-[#e2e8f0] text-purple-600 shadow-[inset_2px_2px_4px_#c5cbd2,inset_-2px_-2px_4px_#ffffff]"
                      : "bg-[#e2e8f0] text-slate-500 shadow-[2px_2px_4px_#c5cbd2,-2px_-2px_4px_#ffffff] hover:shadow-[inset_1px_1px_2px_#c5cbd2,inset_-1px_-1px_2px_#ffffff]"
                    }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Usar API IA
                </button>
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                Motor seleccionado: <span className="font-bold text-slate-600">{ocrMode === "local" ? "OCR Local" : "API IA"}</span>
              </div>
            </div>

            {/* Botón de Procesar en 3D Oscuro */}
            <button
              onClick={runLocalOcr}
              disabled={!file || isProcessingOcr}
              className={`w-full mt-5 py-3 rounded-lg text-xs font-bold text-slate-100 transition-all flex items-center justify-center gap-2 relative overflow-hidden shadow-[4px_4px_8px_#c5cbd2,-4px_-4px_8px_#ffffff] ${!file || isProcessingOcr
                  ? "bg-slate-400 cursor-not-allowed shadow-none"
                  : "bg-gradient-to-b from-[#1e293b] to-[#0f172a] hover:from-[#c5ae73] hover:to-[#c5ae73] hover:text-[#0f172a] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)] border border-slate-800 hover:border-[#c5ae73]"
                }`}
            >
              {isProcessingOcr ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Procesando Documento...
                </>
              ) : (
                <>
                  Procesar Documento
                  <svg className="w-3.5 h-3.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-lg text-center font-bold shadow-[inset_0_2px_4px_rgba(225,29,72,0.05)]">
                {error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: OCR EDIT & CORRECT */}
      {currentStep === "ocr_edit" && (
        <div className="animate-fadeIn w-full h-[calc(100vh-56px)] bg-[#e2e8f0] p-6 text-slate-800 flex flex-col overflow-hidden">
          <div className="flex justify-between items-start mb-6">
            <div className="flex flex-col">
              <h2 className="text-xl font-bold text-slate-800">Validación de Extracción OCR</h2>
              <p className="text-[11px] text-slate-500 mt-1">Revisa y corrige el texto extraído antes de guardar en el expediente.</p>
            </div>
            <div className="flex gap-3">
              <span className="text-[10px] bg-[#e2e8f0] text-slate-500 shadow-[inset_2px_2px_4px_#c5cbd2,inset_-2px_-2px_4px_#ffffff] px-3 py-1.5 rounded-lg font-medium flex items-center">
                Confianza OCR: <span className="font-bold ml-1 text-slate-700">94.5%</span>
              </span>
              <span className="text-[10px] bg-[#e2e8f0] text-slate-500 shadow-[inset_2px_2px_4px_#c5cbd2,inset_-2px_-2px_4px_#ffffff] px-3 py-1.5 rounded-lg font-medium flex items-center">
                Motor: <span className="font-bold ml-1 text-slate-700">{ocrMode === "local" ? "OCR Local" : "API IA"}</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full flex-grow mx-auto min-h-0">
            {/* Columna Izquierda: Visor original */}
            <div className="lg:col-span-5 neu-base rounded-[24px] p-5 flex flex-col h-full min-h-0">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Documento Escaneado</h3>
                <span className="text-[9px] neu-pressed-xs text-slate-500 px-2 py-0.5 rounded font-semibold">Solo lectura</span>
              </div>
              <div className="flex-grow neu-pressed rounded-xl overflow-auto flex items-start justify-center relative p-2">
                {fileUrl ? (
                  file?.type === "application/pdf" || file?.name.toLowerCase().endsWith(".pdf") ? (
                    <iframe
                      src={getPdfUrl(fileUrl)}
                      className="w-full h-full border-none rounded-lg"
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
                      <svg className="w-12 h-12 text-slate-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-xs text-slate-500">Vista previa no disponible para este formato</p>
                      <p className="text-[10px] text-slate-600 mt-1 font-bold">{file?.name}</p>
                    </div>
                  )
                ) : (
                  <p className="text-xs text-slate-500 m-auto">Cargando visor...</p>
                )}

                {/* Controles de Zoom para imágenes */}
                {fileUrl && !(file?.type === "application/pdf" || file?.name.toLowerCase().endsWith(".pdf")) && (
                  <div className="absolute bottom-4 right-4 flex items-center gap-1 z-20 neu-base-sm rounded-lg p-1.5 border border-slate-200/50">
                    <button
                      onClick={() => setImageZoom(prev => Math.max(prev - 0.25, 0.5))}
                      className="w-6 h-6 rounded bg-[#e2e8f0] text-slate-600 hover:text-slate-800 shadow-[inset_1px_1px_2px_#ffffff,inset_-1px_-1px_2px_#c5cbd2] active:shadow-[inset_2px_2px_4px_#c5cbd2,inset_-2px_-2px_4px_#ffffff] font-bold text-sm flex items-center justify-center transition-all"
                      title="Alejar"
                    >
                      -
                    </button>
                    <span className="px-2 text-[10px] font-mono text-slate-500 font-bold min-w-[45px] text-center">
                      {Math.round(imageZoom * 100)}%
                    </span>
                    <button
                      onClick={() => setImageZoom(prev => Math.min(prev + 0.25, 3))}
                      className="w-6 h-6 rounded bg-[#e2e8f0] text-slate-600 hover:text-slate-800 shadow-[inset_1px_1px_2px_#ffffff,inset_-1px_-1px_2px_#c5cbd2] active:shadow-[inset_2px_2px_4px_#c5cbd2,inset_-2px_-2px_4px_#ffffff] font-bold text-sm flex items-center justify-center transition-all"
                      title="Acercar"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Columna Derecha: Edición de texto */}
            <div className="lg:col-span-7 neu-base rounded-[24px] p-6 flex flex-col h-full min-h-0">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">EDITOR OCR</h3>
                <button
                  onClick={() => setIsEditingOcrText(!isEditingOcrText)}
                  className={`text-[10px] px-3 py-1.5 rounded-lg font-bold transition-all ${isEditingOcrText
                      ? "bg-blue-50 text-blue-600 shadow-[inset_2px_2px_4px_#c5cbd2,inset_-2px_-2px_4px_#ffffff]"
                      : "bg-[#e2e8f0] text-blue-500 shadow-[2px_2px_4px_#c5cbd2,-2px_-2px_4px_#ffffff] hover:shadow-[inset_1px_1px_2px_#c5cbd2,inset_-1px_-1px_2px_#ffffff]"
                    }`}
                >
                  {isEditingOcrText ? "Vista Previa" : "Editable"}
                </button>
              </div>


              <div className="flex-grow w-full neu-pressed rounded-xl p-5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300">
                {isEditingOcrText ? (
                  <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="w-full h-full bg-transparent text-[11px] font-mono text-slate-600 focus:outline-none resize-none leading-relaxed"
                    placeholder="Texto extraído del expediente..."
                  />
                ) : (
                  <div className="w-full h-full text-slate-700 font-sans text-xs leading-relaxed pb-4">
                    {renderMarkdown(rawText, "light")}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-between items-center gap-3">
                <span className="text-[10px] text-slate-400 font-medium">
                  Los cambios se asociarán al expediente {archiveId || "actual"}
                </span>

                <div className="flex gap-4">
                  {onBackToArchive && (
                    <button
                      onClick={onBackToArchive}
                      className="px-4 py-2.5 rounded-lg text-xs font-bold text-slate-500 neu-base-sm hover:shadow-[inset_2px_2px_4px_#c5cbd2,inset_-2px_-2px_4px_#ffffff] transition-all"
                    >
                      Volver al Archivero
                    </button>
                  )}

                  {userRole === "digital_secretary" ? (
                    <button
                      onClick={runAnalysis}
                      disabled={isAnalyzing || !rawText.trim()}
                      className={`px-5 py-2.5 rounded-lg text-xs font-bold text-slate-100 transition-all flex items-center justify-center gap-2 shadow-[4px_4px_8px_#c5cbd2,-4px_-4px_8px_#ffffff] ${isAnalyzing || !rawText.trim()
                          ? "bg-slate-400 cursor-not-allowed shadow-none"
                          : "bg-gradient-to-r from-slate-700 to-slate-800 hover:from-[#c5ae73] hover:to-[#c5ae73] hover:text-[#0f172a] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
                        }`}
                    >
                      {isAnalyzing ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Procesando...
                        </>
                      ) : (
                        <>
                          Confirmar y Guardar
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={runAnalysis}
                      disabled={isAnalyzing || !rawText.trim()}
                      className={`px-5 py-2.5 rounded-lg text-xs font-bold text-slate-100 transition-all flex items-center justify-center gap-2 shadow-[4px_4px_8px_#c5cbd2,-4px_-4px_8px_#ffffff] ${isAnalyzing || !rawText.trim()
                          ? "bg-slate-400 cursor-not-allowed shadow-none"
                          : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
                        }`}
                    >
                      {isAnalyzing ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Analizando...
                        </>
                      ) : (
                        <>
                          Confirmar y Analizar
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-[11px] font-bold shadow-[inset_0_2px_4px_rgba(225,29,72,0.05)] rounded-lg text-center">
                  {error}
                </div>
              )}
            </div>
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
                className={`pb-2 px-4 text-xs font-semibold border-b-2 transition-all ${sourceTab === "doc"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-slate-400 hover:text-slate-300"
                  }`}
              >
                📄 Archivo Original
              </button>
              <button
                onClick={() => setSourceTab("text")}
                className={`pb-2 px-4 text-xs font-semibold border-b-2 transition-all ${sourceTab === "text"
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
                        className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed ${msg.sender === "user"
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
                    className="btn-primary disabled:opacity-40"
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
                        className="btn-secondary"
                      >
                        ⬅️ Volver al Archivero
                      </button>
                    )}
                    <button
                      onClick={() => validateDocumentDirectly(archiveId)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition-all"
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