import React, { useState } from "react";
import { ChatMessage, getRoleBadgeStyle, getRoleLabel } from "@/types";

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

interface SearchViewProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchCausas: (query: string) => void;
  searchResults: any[];
  isSearchingCausas: boolean;
  selectedCausa: any;
  setSelectedCausa: (causa: any) => void;
  showChatbot: boolean;
  setShowChatbot: (show: boolean) => void;
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (input: string) => void;
  isChatSending: boolean;
  sendChatMessage: () => void;
  rawText: string;
  setRawText: (text: string) => void;
  userRole: string;
  BACKEND_URL: string;
  getPdfUrl: (url: string) => string;
  setFileUrl: (url: string | null) => void;
  setFile: (file: File | null) => void;
  searchAnalysisResult: any;
  setSearchAnalysisResult: (res: any) => void;
  showIncidentModal: boolean;
  setShowIncidentModal: (show: boolean) => void;
  incidentNote: string;
  setIncidentNote: (note: string) => void;
  submitIncidentNote: (id: string, note: string) => Promise<void>;
}

export const SearchView: React.FC<SearchViewProps> = ({
  searchQuery,
  setSearchQuery,
  searchCausas,
  searchResults,
  isSearchingCausas,
  selectedCausa,
  setSelectedCausa,
  showChatbot,
  setShowChatbot,
  chatMessages,
  chatInput,
  setChatInput,
  isChatSending,
  sendChatMessage,
  rawText,
  setRawText,
  userRole,
  BACKEND_URL,
  getPdfUrl,
  setFileUrl,
  setFile,
  searchAnalysisResult,
  setSearchAnalysisResult,
  showIncidentModal,
  setShowIncidentModal,
  incidentNote,
  setIncidentNote,
  submitIncidentNote,
}) => {
  const [collapsedGroups, setCollapsedGroups] = useState<{ [key: string]: boolean }>({});
  const [selectedCaseNumber, setSelectedCaseNumber] = useState<string | null>(null);
  
  // Estado ampliado para las 3 pestañas inferiores
  const [summaryViewMode, setSummaryViewMode] = useState<"single" | "global" | "ocr">("single");
  const [showSummary, setShowSummary] = useState<boolean>(true);

  const getGroupedSearch = () => {
    const groups: { [key: string]: { caseNumber: string; documents: any[] } } = {};
    
    searchResults.forEach(causa => {
      const caseNum = causa.case_number || "Sin Expediente";
      if (!groups[caseNum]) {
        groups[caseNum] = {
          caseNumber: caseNum,
          documents: []
        };
      }
      groups[caseNum].documents.push(causa);
    });

    const groupedArray = Object.values(groups);
    groupedArray.sort((a, b) => a.caseNumber.localeCompare(b.caseNumber));
    return groupedArray;
  };

  const groupedSearchCases = getGroupedSearch();

  return (
    <div className="animate-fadeIn w-full h-[calc(100vh-56px)] flex gap-6 mx-auto bg-[#e2e8f0] p-6 text-slate-800">
      
      {/* =========================================
          SECCIÓN IZQUIERDA: Buscador / Archivero
      ========================================= */}
      <div className="w-[320px] shrink-0 flex flex-col h-full rounded-[24px] neu-base p-5 overflow-hidden">
        <div className="space-y-4 mb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">Archivero</p>
            <div className="relative rounded-xl neu-pressed-sm p-1 flex items-center">
              <div className="absolute inset-y-0 left-3 flex items-center text-slate-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchCausas(searchQuery)}
                placeholder="Buscar expediente (RIT, RUC, nombre)..."
                className="w-full bg-transparent pl-9 pr-4 py-2.5 text-xs text-slate-700 placeholder:text-slate-500 focus:outline-none rounded-xl"
              />
            </div>
            <button
              onClick={() => searchCausas(searchQuery)}
              disabled={isSearchingCausas}
              className="w-full mt-3 py-3 rounded-xl text-xs font-bold neu-button-dark flex items-center justify-center gap-2"
            >
              {isSearchingCausas ? "Buscando..." : "Buscar Causa"}
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-slate-300">
          {searchResults.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-12">
              Introduce una búsqueda para listar las causas.
            </p>
          ) : (
            groupedSearchCases.map(group => {
              const isCollapsed = collapsedGroups[group.caseNumber] || false;
              const isSelected = selectedCaseNumber === group.caseNumber && !selectedCausa;

              return (
                <div key={group.caseNumber} className="rounded-xl overflow-hidden neu-base">
                  <div
                    onClick={() => {
                      setCollapsedGroups(prev => ({ ...prev, [group.caseNumber]: !prev[group.caseNumber] }));
                      setSelectedCaseNumber(group.caseNumber);
                      setSelectedCausa(null);
                      setSummaryViewMode("global");
                    }}
                    className={`flex items-center justify-between p-3.5 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-[#1e293b] text-white"
                        : "bg-[#1e293b] text-white hover:bg-[#0f172a]"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs select-none !text-white">{isCollapsed ? "📁" : "📂"}</span>
                      <span className="text-xs font-bold truncate !text-white" title={group.caseNumber}>
                        {group.caseNumber === "Sin Expediente" ? "Documentos sin Expediente" : group.caseNumber}
                      </span>
                      <span className="text-[9px] bg-slate-700 !text-white px-1.5 py-0.5 rounded-full font-bold ml-1">
                        {group.documents.length}
                      </span>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="p-3 space-y-3 bg-[#e2e8f0]">
                      {group.documents.map((causa) => {
                        const isCausaSelected = selectedCausa?.id === causa.id;
                        return (
                          <div
                            key={causa.id}
                            onClick={async () => {
                              setSelectedCausa(causa);
                              setSelectedCaseNumber(causa.case_number);
                              setRawText(causa.content);
                              setFileUrl(causa.file_url || `${BACKEND_URL}/api/files/${causa.id}`);
                              setFile({
                                name: causa.filename,
                                size: 0,
                                type: causa.filename.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/png"
                              } as any);
                              setShowChatbot(true);
                              setSearchAnalysisResult(null);
                              setSummaryViewMode("single");
                              try {
                                const res = await fetch(`${BACKEND_URL}/api/documents/${causa.id}/analysis`);
                                if (res.ok) {
                                  const data = await res.json();
                                  setSearchAnalysisResult(data);
                                }
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className={`p-3 rounded-xl cursor-pointer transition-all ${
                              isCausaSelected
                                ? "neu-pressed-sm border-transparent"
                                : "neu-base-sm hover:shadow-[2px_2px_4px_#c5cbd2,-2px_-2px_4px_#ffffff]"
                            }`}
                          >
                            <div className="flex justify-between items-start mb-1.5">
                              <p className="text-[11px] font-bold text-slate-800 truncate pr-2" title={causa.filename}>{causa.filename}</p>
                              <span className="text-[7px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase shrink-0 shadow-sm">Disponible</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                              <span>Folio {causa.start_folio || 1}</span>
                              <span>{causa.date || "Sin Fecha"}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* =========================================
          SECCIÓN CENTRAL: Visor + Datos 
      ========================================= */}
      <div className="flex-1 flex flex-col min-w-0 h-full gap-5">
        {selectedCausa || selectedCaseNumber ? (
          <>
            {/* Encabezado Propio (Superior) */}
            <div className="neu-base rounded-2xl p-4 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">
                  {selectedCausa?.case_number || selectedCaseNumber || "Sin Expediente Asignado"}
                </h2>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                  <span>Folio {selectedCausa?.start_folio || "-"}</span>
                  <span>•</span>
                  <span>{selectedCausa?.document_type || "Demanda Civil"}</span>
                  <span>•</span>
                  <span>{selectedCausa?.date || new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Visualizador del Documento (Flexible) */}
            {selectedCausa ? (
              <div className="flex-1 neu-pressed rounded-2xl overflow-hidden relative flex flex-col min-h-0 p-2 bg-white">
                {selectedCausa.filename?.toLowerCase().endsWith(".pdf") ? (
                  <iframe
                    src={getPdfUrl(`${BACKEND_URL}/api/files/${selectedCausa.id}`)}
                    className="w-full h-full border-none absolute inset-0 bg-white"
                    title="Visor PDF"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-4">
                    <img
                      src={`${BACKEND_URL}/api/files/${selectedCausa.id}`}
                      alt="Visualización de causa"
                      className="object-contain w-full h-full max-h-full"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="neu-base flex-1 p-8 rounded-2xl flex items-center justify-center text-center">
                <div>
                  <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm font-bold text-slate-800 mb-2">Vista Global de la Causa: {selectedCaseNumber}</p>
                  <p className="text-xs text-slate-500">Haz clic en un folio en la lista izquierda para abrir el visualizador.</p>
                </div>
              </div>
            )}

            {/* Panel Inferior de Datos (Anclado al fondo con 3 pestañas) */}
            <div className="neu-base shrink-0 p-5 rounded-2xl transition-all duration-300">
              <div className={`flex items-center justify-between ${showSummary ? 'border-b border-slate-350/50 mb-4 pb-2' : ''}`}>
                <div className="flex gap-4">
                  <button
                    onClick={() => setSummaryViewMode("single")}
                    className={`pb-1 text-xs font-bold border-b-2 transition-all ${
                      summaryViewMode === "single" ? "border-blue-600 text-slate-800" : "border-transparent text-slate-500 hover:text-slate-750"
                    }`}
                  >
                    Datos del Folio
                  </button>
                  <button
                    onClick={() => setSummaryViewMode("global")}
                    className={`pb-1 text-xs font-bold border-b-2 transition-all ${
                      summaryViewMode === "global" ? "border-blue-600 text-slate-800" : "border-transparent text-slate-500 hover:text-slate-750"
                    }`}
                  >
                    Datos de la Causa
                  </button>
                  <button
                    onClick={() => setSummaryViewMode("ocr")}
                    className={`pb-1 text-xs font-bold border-b-2 transition-all ${
                      summaryViewMode === "ocr" ? "border-blue-600 text-slate-800" : "border-transparent text-slate-500 hover:text-slate-750"
                    }`}
                  >
                    Extracción OCR
                  </button>
                </div>
                <button
                  onClick={() => setShowSummary(!showSummary)}
                  className="text-[10px] font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  {showSummary ? (
                    <>
                      Ocultar
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  ) : (
                    <>
                      Mostrar
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
              
              {/* Contenido expandible del panel inferior */}
              {showSummary && (
                <div className="overflow-y-auto max-h-[220px] scrollbar-thin scrollbar-thumb-slate-450 pr-2">
                  {summaryViewMode === "single" && (
                    selectedCausa ? (
                      <div className="grid grid-cols-2 gap-8">
                        <div>
                          <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Resumen del Folio</h4>
                          <div className="grid grid-cols-2 gap-y-2 text-xs">
                            <span className="text-slate-500">Tipo de documento</span>
                            <span className="text-slate-800 font-bold">{selectedCausa.document_type || "Demanda Civil"}</span>
                            <span className="text-slate-500">Fecha de ingreso</span>
                            <span className="text-slate-800 font-bold">{selectedCausa.date || "14/03/2021"}</span>
                            <span className="text-slate-500">Número de folio</span>
                            <span className="text-slate-800 font-bold">
                              {selectedCausa.start_folio !== undefined && selectedCausa.start_folio !== null
                                ? String(selectedCausa.start_folio).padStart(3, '0')
                                : "001"}
                            </span>
                            <span className="text-slate-500">Estado</span>
                            <span className="text-slate-800 font-bold">Registrado</span>
                          </div>
                        </div>
                        {searchAnalysisResult?.entities && (
                          <div>
                            <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Actores Procesales</h4>
                            <div className="grid grid-cols-2 gap-y-2 text-xs">
                              {searchAnalysisResult.entities.map((ent: any, i: number) => (
                                <React.Fragment key={i}>
                                  <span className="text-slate-500 capitalize">{ent.role}</span>
                                  <span className="text-slate-800 font-bold truncate" title={ent.name}>{ent.name}</span>
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">Selecciona un folio de la lista izquierda.</p>
                    )
                  )}

                  {summaryViewMode === "global" && (
                    <div className="grid grid-cols-2 gap-8">
                       <div>
                          <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Datos de la Causa</h4>
                          <div className="grid grid-cols-2 gap-y-2 text-xs">
                            <span className="text-slate-500">RIT</span>
                            <span className="text-slate-800 font-bold">{searchAnalysisResult?.case_number || selectedCaseNumber}</span>
                            <span className="text-slate-500">Tribunal</span>
                            <span className="text-slate-800 font-bold">{searchAnalysisResult?.court_name || "Juzgado Civil"}</span>
                            <span className="text-slate-500">Materia</span>
                            <span className="text-slate-800 font-bold">{searchAnalysisResult?.crime_or_subject || "Ordinario Civil"}</span>
                            <span className="text-slate-500">Estado procesal</span>
                            <span className="text-slate-800 font-bold">En tramitación</span>
                          </div>
                       </div>
                       {searchAnalysisResult?.key_points && (
                          <div>
                             <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Acontecimientos Clave</h4>
                             <ul className="space-y-1.5">
                               {searchAnalysisResult.key_points.map((point: string, idx: number) => (
                                 <li key={idx} className="flex gap-2 text-xs text-slate-700">
                                   <span className="text-blue-500 shrink-0">•</span>
                                   <span>{point}</span>
                                 </li>
                               ))}
                             </ul>
                          </div>
                       )}
                    </div>
                  )}

                  {summaryViewMode === "ocr" && (
                    <div className="w-full h-full min-h-[140px] bg-slate-50 rounded-xl border border-slate-250 p-4 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05)]">
                      {selectedCausa ? (
                        <pre className="text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed">
                          {selectedCausa.content || rawText || "Cargando texto OCR..."}
                        </pre>
                      ) : (
                        <p className="text-xs text-slate-500 italic flex items-center justify-center h-full">
                          Selecciona un folio para ver su extracción OCR.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="neu-base flex-1 flex flex-col items-center justify-center rounded-2xl">
            <h3 className="text-sm font-bold text-slate-850 mb-1">Ningún expediente seleccionado</h3>
            <p className="text-xs text-slate-500">Selecciona una causa o folio para comenzar.</p>
          </div>
        )}
      </div>

      {/* =========================================
          SECCIÓN DERECHA: Asistente RAG (Retráctil)
      ========================================= */}
      {selectedCausa || selectedCaseNumber ? (
        <div 
          className={`shrink-0 h-full rounded-[24px] neu-base transition-all duration-300 ease-in-out flex flex-col overflow-hidden
            ${showChatbot ? 'w-[380px]' : 'w-[45px] cursor-pointer hover:bg-slate-350/30 bg-[#e2e8f0]'}
          `}
          onClick={() => !showChatbot && setShowChatbot(true)}
        >
          {showChatbot ? (
            <div className="p-5 flex flex-col h-full w-[380px]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">ASISTENTE LIBRA · RAG</h3>
                </div>
                {/* Botón Ocultar con SVG hacia la derecha */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowChatbot(false);
                  }} 
                  className="text-[10px] font-semibold text-slate-500 hover:text-slate-750 flex items-center gap-1.5 transition-colors"
                >
                  Ocultar
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                 <p className="text-[10px] text-slate-500 mb-1">
                   Contexto del Asistente: <strong className="text-slate-700">Expediente Completo ({selectedCaseNumber})</strong>
                 </p>
              </div>

              <div className="flex-grow overflow-y-auto pr-2 space-y-4 mb-4 scrollbar-thin scrollbar-thumb-slate-300 [&_p]:!text-slate-200 [&_span]:!text-slate-300 [&_strong]:!text-white [&_h3]:!text-slate-100 [&_h4]:!text-slate-200">
                {chatMessages.length === 0 && (
                  <div className="bg-[#1e293b] border border-slate-700/50 rounded-xl p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">IA · LIBRA</p>
                    <p className="text-xs text-slate-200 leading-relaxed font-medium">
                      He analizado el expediente {selectedCaseNumber}. ¿En qué puedo ayudarte a consultar sobre esta causa?
                    </p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                        msg.sender === "user"
                          ? "bg-[#24354a] text-white border border-slate-700"
                          : "bg-[#1e293b] text-slate-200 border border-slate-700/50"
                      }`}
                    >
                      {msg.sender !== "user" && <p className="text-[9px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider font-sans">IA · LIBRA</p>}
                      {msg.sender === "user" ? msg.text : renderMarkdown(msg.text)}
                    </div>
                  </div>
                ))}
                {isChatSending && (
                  <div className="flex justify-start">
                    <div className="bg-[#1e293b] text-slate-400 border border-slate-700/50 rounded-xl px-4 py-3 text-[10px] flex items-center gap-2 shadow-sm">
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-blue-500/50 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-blue-500/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 bg-blue-500/50 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </span>
                      Analizando el expediente...
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 shrink-0 pt-2 border-t border-slate-200">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                  placeholder="Consulta sobre el expediente..."
                  className="flex-grow bg-white border border-slate-200 rounded-lg px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={isChatSending || !chatInput.trim()}
                  className="bg-[#1e293b] hover:bg-slate-700 disabled:opacity-40 text-white rounded-lg px-4 py-2 flex items-center justify-center transition-colors border border-slate-700 shadow-sm"
                >
                  <svg className="w-4 h-4 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            // Panel Colapsado: Elementos alineados al inicio (arriba)
            <div className="flex-1 w-full flex flex-col items-center justify-start pt-6 gap-6">
              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              <span 
                className="text-[10px] font-bold text-slate-500 tracking-[0.3em] uppercase whitespace-nowrap"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              >
                ASISTENTE RAG
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="w-[380px] shrink-0 h-full rounded-[24px] neu-base flex items-center justify-center text-slate-500 text-xs text-center p-6">
          Selecciona un expediente para interactuar con el asistente virtual de la causa.
        </div>
      )}
      
    </div>
  );
};