import React, { useState } from "react";
import { getRoleBadgeStyle, getRoleLabel } from "../types";

interface ArchiveViewProps {
  showIncidentsTab: boolean;
  setShowIncidentsTab: (show: boolean) => void;
  archiveList: any[];
  archiveSearch: string;
  setArchiveSearch: (search: string) => void;
  isLoadingArchive: boolean;
  selectedArchiveItem: any;
  setSelectedArchiveItem: (item: any) => void;
  archiveItemText: string;
  setArchiveItemText: (text: string) => void;
  setOriginalArchiveItemText: (text: string) => void;
  originalArchiveItemText: string;
  isUpdatingArchiveText: boolean;
  fetchArchiveList: () => void;
  updateArchiveItemText: () => void;
  validateDocumentDirectly: (id: string) => void;
  showIncidentModal: boolean;
  setShowIncidentModal: (show: boolean) => void;
  selectedIncident: any;
  setSelectedIncident: (inc: any) => void;
  incidentNote: string;
  setIncidentNote: (note: string) => void;
  submitIncidentNote: (id: string, note: string) => Promise<void>;
  userRole: string;
  BACKEND_URL: string;
  getPdfUrl: (url: string) => string;
  incidentsList: any[];
  selectArchiveItem: (item: any) => void;
  imageZoom: number;
  setImageZoom: React.Dispatch<React.SetStateAction<number>>;
  setError: (err: string | null) => void;
  fetchIncidents: () => void;
  handleResolveIncident: (incidentId: number) => void;
  analyzeArchiveItem: () => void;
  isAnalyzing: boolean;
  onStartOcr?: () => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  showIncidentsTab,
  setShowIncidentsTab,
  archiveList,
  archiveSearch,
  setArchiveSearch,
  isLoadingArchive,
  selectedArchiveItem,
  setSelectedArchiveItem,
  archiveItemText,
  setArchiveItemText,
  setOriginalArchiveItemText,
  originalArchiveItemText,
  isUpdatingArchiveText,
  fetchArchiveList,
  updateArchiveItemText,
  validateDocumentDirectly,
  showIncidentModal,
  setShowIncidentModal,
  selectedIncident,
  setSelectedIncident,
  incidentNote,
  setIncidentNote,
  submitIncidentNote,
  userRole,
  BACKEND_URL,
  getPdfUrl,
  incidentsList,
  selectArchiveItem,
  imageZoom,
  setImageZoom,
  setError,
  fetchIncidents,
  handleResolveIncident,
  analyzeArchiveItem,
  isAnalyzing,
  onStartOcr,
}) => {
  const [collapsedGroups, setCollapsedGroups] = useState<{ [key: string]: boolean }>({});
  const [selectedCaseNumber, setSelectedCaseNumber] = useState<string | null>(null);
  const [summaryViewMode, setSummaryViewMode] = useState<"single" | "global">("single");

  // Helper to group and sort cases
  const getGroupedCases = () => {
    const groups: {
      [key: string]: {
        caseNumber: string;
        documents: any[];
        hasIncident: boolean;
        latestTimestamp: number;
      };
    } = {};

    archiveList.forEach((item) => {
      const caseNum = item.case_number || "Sin Expediente";
      if (!groups[caseNum]) {
        groups[caseNum] = {
          caseNumber: caseNum,
          documents: [],
          hasIncident: false,
          latestTimestamp: 0,
        };
      }
      
      groups[caseNum].documents.push(item);
      
      if (item.status === "incident") {
        groups[caseNum].hasIncident = true;
      }
      
      if (item.timestamp > groups[caseNum].latestTimestamp) {
        groups[caseNum].latestTimestamp = item.timestamp;
      }
    });

    const groupedArray = Object.values(groups);

    // Sort: Incidents always on top, then by latest timestamp descending
    groupedArray.sort((a, b) => {
      if (a.hasIncident && !b.hasIncident) return -1;
      if (!a.hasIncident && b.hasIncident) return 1;
      return b.latestTimestamp - a.latestTimestamp;
    });

    // For each group, sort documents by folio range
    groupedArray.forEach((group) => {
      group.documents.sort((a, b) => {
        // Incidents inside the case folder also bubble to top
        if (a.status === "incident" && b.status !== "incident") return -1;
        if (a.status !== "incident" && b.status === "incident") return 1;
        
        const folioA = parseInt(a.start_folio) || 0;
        const folioB = parseInt(b.start_folio) || 0;
        if (folioA !== folioB) return folioA - folioB;
        
        return b.timestamp - a.timestamp;
      });
    });

    return groupedArray;
  };

  const groupedCases = getGroupedCases();
  const activeIncident = selectedArchiveItem 
    ? incidentsList.find(i => i.document_id === selectedArchiveItem.id && i.status === "open")
    : null;

  return (
    <>
      <div className="animate-fadeIn w-full">
        <h2 className="text-xl font-bold text-white mb-2">
          {showIncidentsTab && userRole === "digital_secretary" ? "⚠️ Incidentes Reportados (Abiertos)" : "🗄️ Archivero de Expedientes"}
        </h2>
        <p className="text-slate-400 text-xs mb-6">
          {showIncidentsTab && userRole === "digital_secretary"
            ? "Resuelve los incidentes marcados por las secretarias del tribunal."
            : "Visualiza y consulta los archivos físicos y textos guardados en la base de datos."}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full mx-auto">
          {/* Columna Izquierda: Lista de Archivos / Lista de Incidentes */}
          <div className="lg:col-span-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl flex flex-col h-[780px]">
            {!showIncidentsTab || userRole !== "digital_secretary" ? (
              <>
                {userRole === "digital_secretary" && onStartOcr && (
                  <button
                    onClick={onStartOcr}
                    className="w-full mb-4 py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 shrink-0"
                  >
                    ➕ Digitalizar Nuevo Documento (OCR)
                  </button>
                )}

                <div className="mb-4 shrink-0">
                  <input
                    type="text"
                    value={archiveSearch}
                    onChange={(e) => setArchiveSearch(e.target.value)}
                    placeholder="Buscar por nombre o expediente..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="flex-grow overflow-y-auto space-y-3 pr-1">
                  {isLoadingArchive ? (
                    <p className="text-xs text-slate-500 text-center py-12">Cargando archivero...</p>
                  ) : groupedCases.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-12">No se encontraron resultados.</p>
                  ) : (
                    groupedCases.map(group => {
                      const isCollapsed = collapsedGroups[group.caseNumber] || false;
                      return (
                        <div key={group.caseNumber} className="border border-slate-800/80 bg-slate-950/20 rounded-xl overflow-hidden">
                          {/* Folder/Case Header */}
                          <div
                            onClick={() => {
                              setCollapsedGroups(prev => ({ ...prev, [group.caseNumber]: !prev[group.caseNumber] }));
                              setSelectedCaseNumber(group.caseNumber);
                              setSelectedArchiveItem(null); // Enter case global view
                            }}
                            className={`flex items-center justify-between p-3 cursor-pointer border-b border-slate-800/40 hover:bg-slate-900/60 transition-colors ${
                              selectedCaseNumber === group.caseNumber && !selectedArchiveItem
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
                            {group.hasIncident && (
                              <span className="text-[8px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded font-bold shrink-0 animate-pulse">
                                ⚠️ Incidente
                              </span>
                            )}
                          </div>

                          {/* Documents List */}
                          {!isCollapsed && (
                            <div className="p-2 space-y-1.5 bg-slate-950/10">
                              {group.documents.map((item) => (
                                <div
                                  key={item.id}
                                  onClick={() => {
                                    selectArchiveItem(item);
                                    setSelectedCaseNumber(item.case_number);
                                    setSelectedIncident(null);
                                  }}
                                  className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                                    selectedArchiveItem?.id === item.id
                                      ? "border-blue-500 bg-blue-500/10 text-white"
                                      : "border-slate-900 hover:border-slate-800 bg-slate-950/30 text-slate-300"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-[11px] font-semibold truncate flex-grow" title={item.filename}>
                                      {item.filename}
                                    </p>
                                    {item.status === "draft" && <span className="text-[7px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1 py-0.5 rounded font-bold uppercase shrink-0">Disponible</span>}
                                    {item.status === "validated" && <span className="text-[7px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 py-0.5 rounded font-bold uppercase shrink-0">Validado</span>}
                                    {item.status === "incident" && <span className="text-[7px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1 py-0.5 rounded font-bold uppercase shrink-0">Incidente</span>}
                                  </div>
                                  <div className="flex items-center justify-between mt-1.5 text-[9px] text-slate-500">
                                    <span className="font-mono">
                                      {item.start_folio !== null && item.end_folio !== null
                                        ? `Folios: ${item.start_folio} - ${item.end_folio}`
                                        : "Sin folios"}
                                    </span>
                                    <span>{new Date(item.timestamp * 1000).toLocaleDateString()}</span>
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
              </>
            ) : (
              // Incidentes Tab (Digital Secretary Only)
              <>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 shrink-0">Incidentes Abiertos ({incidentsList.filter(i => i.status === "open").length})</h3>
                <div className="flex-grow overflow-y-auto space-y-3 pr-1">
                  {incidentsList.filter(i => i.status === "open").length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-12">No hay incidentes abiertos pendientes.</p>
                  ) : (
                    incidentsList
                      .filter(i => i.status === "open")
                      .map((inc) => (
                        <div
                          key={inc.id}
                          onClick={() => {
                            setSelectedIncident(inc);
                            const archItem = archiveList.find(a => a.id === inc.document_id);
                            if (archItem) {
                              selectArchiveItem(archItem);
                              setSelectedCaseNumber(archItem.case_number);
                            }
                          }}
                          className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                            selectedIncident?.id === inc.id
                              ? "border-rose-500 bg-rose-500/10 text-white"
                              : "border-slate-800/80 hover:border-slate-700 bg-slate-950/40 text-slate-300"
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/30 font-bold uppercase">Abierto</span>
                            <span className="text-[10px] text-slate-500">{new Date(inc.timestamp * 1000).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs font-semibold text-white truncate">{inc.filename}</p>
                          <p className="text-[11px] text-slate-400 mt-2 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 italic leading-relaxed">
                            "{inc.note}"
                          </p>
                        </div>
                      ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Columna Derecha: Detalle del Archivo Seleccionado o Vista Global */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {selectedArchiveItem || selectedCaseNumber ? (
              <>
                {selectedArchiveItem && activeIncident && (
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3.5 text-xs text-rose-300 flex flex-col gap-1.5 animate-fadeIn shrink-0 mb-2">
                    <div className="flex items-center gap-1.5 font-bold text-rose-400">
                      <span>⚠️ Nota de Incidente (Fallo reportado):</span>
                    </div>
                    <p className="italic bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/40 text-slate-350 leading-normal">
                      "{activeIncident.note}"
                    </p>
                  </div>
                )}

                {selectedArchiveItem ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[550px] shrink-0 animate-fadeIn">
                    {/* Visualizador de PDF */}
                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl flex flex-col h-full relative">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xs font-bold text-white">Visualizador</h3>
                        {selectedArchiveItem.status === "draft" && <span className="text-[8px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded font-bold uppercase">✔️ Disponible</span>}
                        {selectedArchiveItem.status === "validated" && <span className="text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold uppercase">✔️ Validado</span>}
                        {selectedArchiveItem.status === "incident" && <span className="text-[8px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded font-bold uppercase">⚠️ Incidente Abierto</span>}
                      </div>

                      <div className="flex-grow border border-slate-800 bg-slate-950/60 rounded-xl overflow-auto flex items-start justify-center relative">
                        {selectedArchiveItem.filename.toLowerCase().endsWith(".pdf") ? (
                          <iframe
                            src={getPdfUrl(`${BACKEND_URL}/api/files/${selectedArchiveItem.id}`)}
                            className="w-full h-full border-none"
                            title="Visor PDF Archivo"
                          />
                        ) : (
                          <img
                            src={`${BACKEND_URL}/api/files/${selectedArchiveItem.id}`}
                            alt="Visualización de causa"
                            className="object-contain p-2 w-full h-full"
                          />
                        )}
                      </div>
                    </div>

                    {/* Texto Plano */}
                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl flex flex-col h-full">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xs font-bold text-white">Texto Plano</h3>
                        {userRole !== "digital_secretary" && (
                          <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">Solo lectura</span>
                        )}
                      </div>

                      <textarea
                        value={archiveItemText}
                        onChange={(e) => setArchiveItemText(e.target.value)}
                        readOnly={userRole !== "digital_secretary"}
                        className="flex-grow w-full bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 leading-relaxed resize-none overflow-y-auto"
                        placeholder="Cargando texto del archivo..."
                      />

                      <div className="mt-4 flex gap-2 justify-end">
                        {userRole === "digital_secretary" && (
                          <>
                            <button
                              onClick={updateArchiveItemText}
                              disabled={isUpdatingArchiveText || archiveItemText === originalArchiveItemText}
                              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-40 transition-all"
                            >
                              {isUpdatingArchiveText ? "Guardando..." : "💾 Guardar Borrador"}
                            </button>
                            <button
                              onClick={analyzeArchiveItem}
                              disabled={isAnalyzing || !archiveItemText.trim()}
                              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:opacity-40 transition-all shadow-lg shadow-blue-600/20"
                            >
                              {isAnalyzing ? "Analizando..." : "✔️ Re-Analizar y Validar"}
                            </button>
                            {archiveItemText === originalArchiveItemText && selectedArchiveItem.status === "incident" && (
                              <button
                                onClick={() => {
                                  const inc = incidentsList.find(i => i.document_id === selectedArchiveItem.id && i.status === "open");
                                  if (inc) {
                                    handleResolveIncident(inc.id);
                                  }
                                }}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5"
                              >
                                ✔️ Resolver Incidente
                              </button>
                            )}
                          </>
                        )}
                        {userRole === "court_secretary" && (
                          <button
                            onClick={() => {
                              setShowIncidentModal(true);
                            }}
                            disabled={selectedArchiveItem.status === "incident"}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-rose-600/20 transition-all flex items-center gap-1.5"
                          >
                            {selectedArchiveItem.status === "incident" ? "⚠️ Incidente Reportado" : "⚠️ Reportar Incidente (Fallo OCR)"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/20 border border-slate-800/40 rounded-2xl p-8 text-center shrink-0 mb-4 animate-fadeIn">
                    <p className="text-xs text-slate-400">
                      📂 Vista Global de la Causa: <strong className="text-white">{selectedCaseNumber}</strong>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Haz clic en un folio en la lista de la izquierda para abrir el visualizador de PDF y su texto plano.
                    </p>
                  </div>
                )}

                {/* Ficha Resúmenes (Executive and Global) */}
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

                  {summaryViewMode === "single" ? (
                    <div>
                      {selectedArchiveItem ? (
                        <div>
                          <h4 className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">Resumen Ejecutivo del Folio</h4>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {selectedArchiveItem.summary || "Sin resumen disponible para este folio."}
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
                        {archiveList
                          .filter(d => d.case_number === selectedCaseNumber)
                          .map((doc, idx) => (
                            <div key={doc.id} className="border-b border-slate-800/40 pb-3 mb-3 last:border-b-0 last:mb-0 last:pb-0">
                              <span className="text-[10px] font-bold text-blue-400 block mb-1">
                                📄 {doc.filename} (Folios: {doc.start_folio || 1} - {doc.end_folio || 1})
                              </span>
                              <p className="text-xs text-slate-350 leading-relaxed">
                                {doc.summary || "Sin resumen disponible para este folio."}
                              </p>
                            </div>
                          ))}
                        {archiveList.filter(d => d.case_number === selectedCaseNumber).length === 0 && (
                          <p className="text-xs text-slate-500 italic">No hay documentos cargados en esta causa.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 backdrop-blur-xl text-center flex flex-col items-center justify-center h-[780px]">
                <svg className="w-16 h-16 text-slate-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h5l2 2h9a2 2 0 012 2v8a2 2 0 01-2 2H5z" />
                </svg>
                <h3 className="text-sm font-semibold text-white mb-1">Ningún expediente seleccionado</h3>
                <p className="text-xs text-slate-500">Selecciona una causa de la izquierda para ver su resumen global, o un folio para ver su documento.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
