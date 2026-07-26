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
    <div className="animate-fadeIn w-full h-[calc(100vh-120px)] min-h-[700px] flex gap-6 mx-auto">
      
      {/* =========================================
          SECCIÓN IZQUIERDA: Buscador / Archivero
      ========================================= */}
      <div className="w-[300px] shrink-0 surface-card p-6 flex flex-col h-full rounded-2xl shadow-xl overflow-hidden border border-slate-800">
        <div className="space-y-4 mb-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 mb-3">Archivero</p>
            <div className="relative rounded-xl bg-slate-950/70 border border-slate-800/80 p-1">
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
                placeholder="Buscar expediente (RIT, RUC, nombre)"
                className="w-full bg-transparent pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl"
              />
            </div>
            <button
              onClick={() => searchCausas(searchQuery)}
              disabled={isSearchingCausas}
              className="w-full mt-3 bg-gradient-to-r from-[#1e293b] to-[#0f172a] hover:from-[#334155] hover:to-[#1e293b] text-white text-xs font-semibold py-2.5 rounded-lg border border-slate-800 shadow-sm transition-all disabled:opacity-50"
            >
              {isSearchingCausas ? "Buscando..." : "Buscar Causa"}
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-800">
          {searchResults.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-12">
              Introduce una búsqueda para listar las causas.
            </p>
          ) : (
            groupedSearchCases.map(group => {
              const isCollapsed = collapsedGroups[group.caseNumber] || false;
              const isSelected = selectedCaseNumber === group.caseNumber && !selectedCausa;

              return (
                <div key={group.caseNumber} className="border border-slate-800/80 bg-slate-950/20 rounded-xl overflow-hidden">
                  <div
                    onClick={() => {
                      setCollapsedGroups(prev => ({ ...prev, [group.caseNumber]: !prev[group.caseNumber] }));
                      setSelectedCaseNumber(group.caseNumber);
                      setSelectedCausa(null);
                      setSummaryViewMode("global");
                    }}
                    className={`flex items-center justify-between p-3 cursor-pointer border-b border-slate-800/40 hover:bg-slate-900/60 transition-colors ${
                      isSelected
                        ? "bg-slate-800/50 text-white"
                        : "bg-slate-900/40 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs select-none">{isCollapsed ? "📁" : "📂"}</span>
                      <span className="text-xs font-bold truncate" title={group.caseNumber}>
                        {group.caseNumber === "Sin Expediente" ? "Documentos sin Expediente" : group.caseNumber}
                      </span>
                      <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full font-bold">
                        {group.documents.length}
                      </span>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="p-2 space-y-1.5 bg-slate-950/10">
                      {group.documents.map((causa) => (
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
                          className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                            selectedCausa?.id === causa.id
                              ? "border-blue-500/50 bg-blue-500/10 text-white"
                              : "border-slate-800 hover:border-slate-700 bg-slate-900/30 text-slate-300"
                          }`}
                        >
                          <p className="text-[11px] font-semibold truncate" title={causa.filename}>{causa.filename}</p>
                          <div className="flex items-center justify-between mt-1 text-[9px] text-slate-500">
                            <span>Folio {causa.start_folio || 1}</span>
                            <span>{causa.date || "Sin Fecha"}</span>
                          </div>
                        </div>
                      ))}
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
      <div className="flex-1 flex flex-col min-w-0 h-full gap-4">
        {selectedCausa || selectedCaseNumber ? (
          <>
            {/* Encabezado Propio (Superior) */}
            <div className="surface-card shrink-0 bg-slate-900/80 p-4 rounded-2xl flex justify-between items-center shadow-lg border border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-white mb-1">
                  {selectedCausa?.case_number || selectedCaseNumber || "Sin Expediente Asignado"}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-400">
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
              <div className="surface-card flex-1 min-h-0 flex flex-col rounded-2xl shadow-lg border border-slate-800 bg-slate-950 overflow-hidden relative">
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
              <div className="surface-card flex-1 p-8 rounded-2xl flex items-center justify-center text-center shadow-lg border border-slate-800">
                <div>
                  <svg className="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm font-bold text-white mb-2">Vista Global de la Causa: {selectedCaseNumber}</p>
                  <p className="text-xs text-slate-500">Haz clic en un folio en la lista izquierda para abrir el visualizador.</p>
                </div>
              </div>
            )}

            {/* Panel Inferior de Datos (Anclado al fondo con 3 pestañas) */}
            <div className="surface-card shrink-0 p-5 rounded-2xl shadow-lg border border-slate-800 bg-slate-900/90 transition-all duration-300">
              <div className={`flex items-center justify-between ${showSummary ? 'border-b border-slate-800/80 mb-4 pb-2' : ''}`}>
                <div className="flex gap-4">
                  <button
                    onClick={() => setSummaryViewMode("single")}
                    className={`pb-1 text-xs font-semibold border-b-2 transition-all ${
                      summaryViewMode === "single" ? "border-blue-500 text-white" : "border-transparent text-slate-400 hover:text-slate-300"
                    }`}
                  >
                    Datos del Folio
                  </button>
                  <button
                    onClick={() => setSummaryViewMode("global")}
                    className={`pb-1 text-xs font-semibold border-b-2 transition-all ${
                      summaryViewMode === "global" ? "border-blue-500 text-white" : "border-transparent text-slate-400 hover:text-slate-300"
                    }`}
                  >
                    Datos de la Causa
                  </button>
                  <button
                    onClick={() => setSummaryViewMode("ocr")}
                    className={`pb-1 text-xs font-semibold border-b-2 transition-all ${
                      summaryViewMode === "ocr" ? "border-blue-500 text-white" : "border-transparent text-slate-400 hover:text-slate-300"
                    }`}
                  >
                    Extracción OCR
                  </button>
                </div>
                <button
                  onClick={() => setShowSummary(!showSummary)}
                  className="text-[10px] font-semibold text-slate-400 hover:text-slate-300 flex items-center gap-1.5 transition-colors"
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
                <div className="overflow-y-auto max-h-[220px] scrollbar-thin scrollbar-thumb-slate-700 pr-2">
                  {summaryViewMode === "single" && (
                    selectedCausa ? (
                      <div className="grid grid-cols-2 gap-8">
                        <div>
                          <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Resumen del Folio</h4>
                          <div className="grid grid-cols-2 gap-y-2 text-xs">
                            <span className="text-slate-400">Tipo de documento</span>
                            <span className="text-white">{selectedCausa.document_type || "Demanda Civil"}</span>
                            <span className="text-slate-400">Fecha de ingreso</span>
                            <span className="text-white">{selectedCausa.date || "14/03/2021"}</span>
                            <span className="text-slate-400">Número de folio</span>
                            <span className="text-white">
                              {selectedCausa.start_folio !== undefined && selectedCausa.start_folio !== null
                                ? String(selectedCausa.start_folio).padStart(3, '0')
                                : "001"}
                            </span>
                            <span className="text-slate-400">Estado</span>
                            <span className="text-white">Registrado</span>
                          </div>
                        </div>
                        {searchAnalysisResult?.entities && (
                          <div>
                            <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Actores Procesales</h4>
                            <div className="grid grid-cols-2 gap-y-2 text-xs">
                              {searchAnalysisResult.entities.map((ent: any, i: number) => (
                                <React.Fragment key={i}>
                                  <span className="text-slate-400 capitalize">{ent.role}</span>
                                  <span className="text-white truncate" title={ent.name}>{ent.name}</span>
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
                           <span className="text-slate-400">RIT</span>
                           <span className="text-white">{searchAnalysisResult?.case_number || selectedCaseNumber}</span>
                           <span className="text-slate-400">Tribunal</span>
                           <span className="text-white">{searchAnalysisResult?.court_name || "Juzgado Civil"}</span>
                           <span className="text-slate-400">Materia</span>
                           <span className="text-white">{searchAnalysisResult?.crime_or_subject || "Ordinario Civil"}</span>
                           <span className="text-slate-400">Estado procesal</span>
                           <span className="text-white">En tramitación</span>
                         </div>
                       </div>
                       {searchAnalysisResult?.key_points && (
                         <div>
                            <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Acontecimientos Clave</h4>
                            <ul className="space-y-1.5">
                              {searchAnalysisResult.key_points.map((point: string, idx: number) => (
                                <li key={idx} className="flex gap-2 text-xs text-slate-300">
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
                    <div className="w-full h-full min-h-[140px] bg-[#0b1120] rounded-xl border border-slate-800 p-4 shadow-inner">
                      {selectedCausa ? (
                        <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
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
          <div className="surface-card flex-1 flex flex-col items-center justify-center rounded-2xl border border-slate-800">
            <h3 className="text-sm font-semibold text-white mb-1">Ningún expediente seleccionado</h3>
            <p className="text-xs text-slate-500">Selecciona una causa o folio para comenzar.</p>
          </div>
        )}
      </div>

      {/* =========================================
          SECCIÓN DERECHA: Asistente RAG (Retráctil)
      ========================================= */}
      {selectedCausa || selectedCaseNumber ? (
        <div 
          className={`shrink-0 h-full surface-card rounded-2xl shadow-xl border border-slate-800 transition-all duration-300 ease-in-out flex flex-col overflow-hidden
            ${showChatbot ? 'w-[380px]' : 'w-[45px] cursor-pointer hover:bg-slate-800/50 bg-slate-900/60'}
          `}
          onClick={() => !showChatbot && setShowChatbot(true)}
        >
          {showChatbot ? (
            <div className="p-5 flex flex-col h-full w-[380px]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide">ASISTENTE LIBRA · RAG</h3>
                </div>
                {/* Botón Ocultar con SVG hacia la derecha */}
                <button 
                  onClick={() => setShowChatbot(false)} 
                  className="text-[10px] font-semibold text-slate-400 hover:text-slate-300 flex items-center gap-1.5 transition-colors"
                >
                  Ocultar
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                 <p className="text-[10px] text-slate-500 mb-1">
                   Contexto del Asistente: <strong className="text-slate-300">Expediente Completo ({selectedCaseNumber})</strong>
                 </p>
              </div>

              <div className="flex-grow overflow-y-auto pr-2 space-y-4 mb-4 scrollbar-thin scrollbar-thumb-slate-700">
                {chatMessages.length === 0 && (
                  <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">IA · LIBRA</p>
                    <p className="text-xs text-white leading-relaxed font-medium">
                      He analizado el expediente {selectedCaseNumber}. ¿En qué puedo ayudarte a consultar sobre esta causa?
                    </p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                        msg.sender === "user"
                          ? "bg-[#1e293b] text-white border border-slate-700/50"
                          : "bg-[#0b1120] text-slate-200 border border-slate-800"
                      }`}
                    >
                      {msg.sender !== "user" && <p className="text-[9px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">IA · LIBRA</p>}
                      {msg.sender === "user" ? msg.text : renderMarkdown(msg.text)}
                    </div>
                  </div>
                ))}
                {isChatSending && (
                  <div className="flex justify-start">
                    <div className="bg-[#0b1120] text-slate-400 border border-slate-800 rounded-xl px-4 py-3 text-[10px] flex items-center gap-2">
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

              <div className="flex gap-2 shrink-0 pt-2 border-t border-slate-800/80">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                  placeholder="Consulta sobre el expediente..."
                  className="flex-grow bg-[#0b1120] border border-slate-800 rounded-lg px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors shadow-inner"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={isChatSending || !chatInput.trim()}
                  className="bg-[#1e293b] hover:bg-slate-700 disabled:opacity-40 text-white rounded-lg px-4 py-2 flex items-center justify-center transition-colors border border-slate-700"
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
              {/* SVG apuntando hacia la izquierda para indicar "Mostrar" */}
              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              <span 
                className="text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase whitespace-nowrap"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              >
                ASISTENTE RAG
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="w-[380px] shrink-0 h-full surface-card rounded-2xl border border-slate-800 flex items-center justify-center text-slate-500 text-xs text-center p-6">
          Selecciona un expediente para interactuar con el asistente virtual de la causa.
        </div>
      )}
      
    </div>
  );
};