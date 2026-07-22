import React, { useState } from "react";
import { ChatMessage, getRoleBadgeStyle, getRoleLabel } from "@/types";

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
  const [summaryViewMode, setSummaryViewMode] = useState<"single" | "global">("single");

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
    <>
      <div className="animate-fadeIn w-full">
        <h2 className="text-xl font-bold text-white mb-2">🔍 Buscador de Causas (Base de Datos)</h2>
        <p className="text-slate-400 text-xs mb-6">
          Busca causas judiciales de forma segura por cédula de identidad, número de caso o nombre del imputado/víctima.
        </p>

        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchCausas(searchQuery)}
              placeholder="Introduce cédula, nombre o número de causa..."
              className="flex-grow bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              onClick={() => searchCausas(searchQuery)}
              disabled={isSearchingCausas}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold text-xs px-6 py-3 rounded-xl transition-all shadow-md shadow-blue-600/20"
            >
              {isSearchingCausas ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </div>

        {searchResults.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full mx-auto">
            {/* Lista de Resultados Agrupados */}
            <div className="lg:col-span-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl flex flex-col h-[650px] overflow-y-auto space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Resultados Encontrados ({searchResults.length})
              </h3>
              
              {groupedSearchCases.map(group => {
                const isCollapsed = collapsedGroups[group.caseNumber] || false;
                const isSelected = selectedCaseNumber === group.caseNumber && !selectedCausa;

                return (
                  <div key={group.caseNumber} className="border border-slate-800/80 bg-slate-950/20 rounded-xl overflow-hidden">
                    {/* Header de Causa */}
                    <div
                      onClick={() => {
                        setCollapsedGroups(prev => ({ ...prev, [group.caseNumber]: !prev[group.caseNumber] }));
                        setSelectedCaseNumber(group.caseNumber);
                        setSelectedCausa(null); // Clear selected single document to show global view!
                      }}
                      className={`flex items-center justify-between p-3 cursor-pointer border-b border-slate-800/40 hover:bg-slate-900/60 transition-colors ${
                        isSelected
                          ? "bg-blue-600/10 text-white border-blue-500/30"
                          : "bg-slate-900/40 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs select-none">
                          {isCollapsed ? "📁" : "📂"}
                        </span>
                        <span className="text-xs font-bold truncate" title={group.caseNumber}>
                          {group.caseNumber === "Sin Expediente" ? "Documentos sin Expediente" : `Causa: ${group.caseNumber}`}
                        </span>
                        <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full font-bold">
                          {group.documents.length}
                        </span>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Avoid double toggling accordion
                          setSelectedCaseNumber(group.caseNumber);
                          setSelectedCausa(null);
                          setSummaryViewMode("global");
                        }}
                        className="text-[9px] bg-blue-650 hover:bg-blue-600 text-white border border-blue-550 px-2 py-0.5 rounded font-bold shrink-0 transition-all shadow-sm"
                      >
                        🌐 Ver Global
                      </button>
                    </div>

                    {/* Lista de Documentos */}
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
                              setShowChatbot(true); // Keep chat visible
                              setSearchAnalysisResult(null);
                              setSummaryViewMode("single"); // Reset tab to single view on change
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
                                ? "border-blue-500 bg-blue-500/10 text-white"
                                : "border-slate-900 hover:border-slate-800 bg-slate-950/30 text-slate-300"
                            }`}
                          >
                            <p className="text-[11px] font-semibold truncate" title={causa.filename}>{causa.filename}</p>
                            <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{causa.summary}</p>
                            <div className="flex items-center justify-between mt-2 text-[9px] text-slate-500 font-mono">
                              <span>Folios: {causa.start_folio || 1} - {causa.end_folio || 1}</span>
                              <span>{causa.date || "Sin Fecha"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Detalle del Expediente Seleccionado */}
            <div className="lg:col-span-8">
              {selectedCausa || selectedCaseNumber ? (
                <div className="flex flex-col gap-6">
                  {selectedCausa ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[550px] animate-fadeIn">
                      {/* Archivo Original */}
                      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl flex flex-col h-full">
                        <h3 className="text-xs font-bold text-white mb-2">Archivo Original</h3>
                        <div className="flex-grow border border-slate-800 bg-slate-950/60 rounded-xl overflow-auto flex items-start justify-center relative">
                          {selectedCausa.filename.toLowerCase().endsWith(".pdf") ? (
                            <iframe
                              src={getPdfUrl(`${BACKEND_URL}/api/files/${selectedCausa.id}`)}
                              className="w-full h-full border-none"
                              title="Visor PDF Causa"
                            />
                          ) : (
                            <img
                              src={`${BACKEND_URL}/api/files/${selectedCausa.id}`}
                              alt="Visualización de causa"
                              className="object-contain p-2 w-full h-full"
                            />
                          )}
                        </div>
                      </div>

                      {/* Texto Plano */}
                      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl flex flex-col h-full">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-xs font-bold text-white">Texto Plano del Expediente</h3>
                          <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">Solo lectura</span>
                        </div>
                        <textarea
                          readOnly
                          value={selectedCausa.content}
                          className="flex-grow w-full bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 focus:outline-none leading-relaxed resize-none overflow-y-auto"
                        />
                      </div>
                    </div>
                  ) : (
                    // Hides PDF and plain text for global view!
                    <div className="bg-slate-900/20 border border-slate-800/40 rounded-2xl p-8 text-center shrink-0 mb-4 animate-fadeIn">
                      <p className="text-xs text-slate-400">
                        📂 Vista Global de la Causa: <strong className="text-white">{selectedCaseNumber}</strong>
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Haz clic en un folio en la lista de la izquierda para abrir el visualizador de PDF y su texto plano.
                      </p>
                    </div>
                  )}

                  {/* Ficha Resumen de la IA (resumen de cada folio y global) */}
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl shrink-0 text-left animate-fadeIn">
                    <div className="flex border-b border-slate-800/80 mb-4 shrink-0">
                      <button
                        onClick={() => setSummaryViewMode("single")}
                        className={`pb-2 px-4 text-xs font-semibold border-b-2 transition-all ${
                          summaryViewMode === "single"
                            ? "border-blue-500 text-blue-400 font-bold"
                            : "border-transparent text-slate-400 hover:text-slate-300"
                        }`}
                      >
                        📄 Resumen de este Folio
                      </button>
                      <button
                        onClick={() => setSummaryViewMode("global")}
                        className={`pb-2 px-4 text-xs font-semibold border-b-2 transition-all ${
                          summaryViewMode === "global"
                            ? "border-blue-500 text-blue-400 font-bold"
                            : "border-transparent text-slate-400 hover:text-slate-300"
                        }`}
                      >
                        🌐 Resumen Global de la Causa (Folios unidos)
                      </button>
                    </div>

                    <div className="mb-4">
                      {summaryViewMode === "single" ? (
                        <div>
                          {selectedCausa ? (
                            <div>
                              <h4 className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">Resumen Ejecutivo del Folio</h4>
                              <p className="text-xs text-slate-300 leading-relaxed">
                                {searchAnalysisResult?.summary || selectedCausa.summary}
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 italic">Selecciona un folio de la lista izquierda para ver su resumen individual.</p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <h4 className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-2">Resúmenes de los Folios del Expediente</h4>
                          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                            {searchResults
                              .filter(d => d.case_number === (selectedCausa?.case_number || selectedCaseNumber))
                              .map((doc, idx) => (
                                <div key={doc.id} className="border-b border-slate-800/40 pb-3 mb-3 last:border-b-0 last:mb-0 last:pb-0">
                                  <span className="text-[10px] font-bold text-blue-400 block mb-1">
                                    📄 {doc.filename} (Folios: {doc.start_folio || 1} - {doc.end_folio || 1})
                                  </span>
                                  <p className="text-xs text-slate-300 leading-relaxed">
                                    {doc.summary || "Sin resumen disponible para este folio."}
                                  </p>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-800/60 pt-4">
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Expediente</span>
                        <p className="text-[11px] font-bold text-white truncate">{searchAnalysisResult?.case_number || "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Tribunal</span>
                        <p className="text-[11px] font-bold text-white truncate" title={searchAnalysisResult?.court_name}>{searchAnalysisResult?.court_name || "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Asunto</span>
                        <p className="text-[11px] font-bold text-blue-400 truncate" title={searchAnalysisResult?.crime_or_subject}>{searchAnalysisResult?.crime_or_subject || "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Fecha</span>
                        <p className="text-[11px] font-bold text-white truncate">{searchAnalysisResult?.date || "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actores */}
                  {searchAnalysisResult?.entities?.length > 0 && (
                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl shrink-0">
                      <h3 className="text-xs font-bold text-white mb-3">Actores e Involucrados</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {searchAnalysisResult.entities.map((entity: any, i: number) => (
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
                    </div>
                  )}

                  {/* Acontecimientos Clave */}
                  {searchAnalysisResult?.key_points?.length > 0 && (
                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl shrink-0">
                      <h3 className="text-xs font-bold text-white mb-3">Acontecimientos Clave</h3>
                      <ul className="space-y-2">
                        {searchAnalysisResult.key_points.map((point: string, idx: number) => (
                          <li key={idx} className="flex gap-2 text-xs leading-relaxed text-slate-300">
                            <span className="flex-shrink-0 w-4.5 h-4.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-[10px]">
                              {idx + 1}
                            </span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Botón para habilitar Q&A con IA */}
                  {userRole === "reader_user" && (
                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl text-left animate-fadeIn">
                      <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2">
                        <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        <h3 className="text-xs font-bold text-white">Consultar a la IA (Chatbot del Expediente)</h3>
                      </div>

                      <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-4 flex flex-col h-72">
                        <div className="flex-grow overflow-y-auto space-y-3 mb-3 p-1">
                          {chatMessages.length === 0 && (
                            <p className="text-xs text-slate-500 italic text-center py-12">
                              Haz una pregunta sobre el expediente judicial global.
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
                                {msg.text}
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
                                Buscando respuesta...
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
                            placeholder="Escribe tu consulta sobre el expediente..."
                            className="flex-grow bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                          />
                          <button
                            onClick={sendChatMessage}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-xl text-xs font-semibold"
                          >
                            Enviar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center h-[550px] flex flex-col items-center justify-center">
                  <svg className="w-16 h-16 text-slate-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-white mb-1">Causa no seleccionada</h3>
                  <p className="text-xs text-slate-500">Selecciona un expediente de la lista izquierda para visualizarlo.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/20 border border-slate-800/60 rounded-2xl p-12 text-center max-w-lg mx-auto mt-8">
            <p className="text-xs text-slate-500">
              Introduce una búsqueda para listar las causas asociadas por cédula o expediente desde la base de datos de Postgres.
            </p>
          </div>
        )}
      </div>
    </>
  );
};