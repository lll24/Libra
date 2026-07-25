import React, { useState } from "react";
import { getRoleBadgeStyle, getRoleLabel } from "../../../types";

interface ArchiveViewProps {
  showIncidentsTab: boolean;
  setShowIncidentsTab: (show: boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  archiveList: any[];
  archiveSearch: string;
  setArchiveSearch: (search: string) => void;
  isLoadingArchive: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectedArchiveItem: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const [showSummary, setShowSummary] = useState<boolean>(true);
  const [showOcrPanel, setShowOcrPanel] = useState<boolean>(true);
  
  // Nuevo estado para la vista de edición OCR completa
  const [isEditingExtraction, setIsEditingExtraction] = useState<boolean>(false);

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

    groupedArray.sort((a, b) => {
      if (a.hasIncident && !b.hasIncident) return -1;
      if (!a.hasIncident && b.hasIncident) return 1;
      return b.latestTimestamp - a.latestTimestamp;
    });

    groupedArray.forEach((group) => {
      group.documents.sort((a, b) => {
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


  // =========================================
  // RENDER CONDICIONAL: VISTA DE EDICIÓN OCR
  // =========================================
  if (isEditingExtraction && selectedArchiveItem) {
    return (
      <div className="animate-fadeIn w-full h-[calc(100vh-120px)] min-h-[700px] flex flex-col mx-auto">
        {/* Encabezado Superior */}
        <div className="mb-4 flex justify-between items-end">
          <div>
            <button 
              onClick={() => setIsEditingExtraction(false)}
              className="text-slate-400 hover:text-white flex items-center gap-1 text-xs mb-2 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              Volver al archivero
            </button>
            <h2 className="text-xl font-bold text-white mb-1">Validación de Extracción OCR</h2>
            <p className="text-sm text-slate-400">Revisa y corrige el texto extraído antes de guardar en el expediente.</p>
          </div>
          <div className="flex gap-3">
            <span className="bg-slate-900 border border-slate-700 text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm">
              Confianza OCR: {selectedArchiveItem.ocr_confidence || "94.2%"}
            </span>
            <span className="bg-slate-900 border border-slate-700 text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm">
              Motor: {selectedArchiveItem.ocr_engine || "OCR Local"}
            </span>
          </div>
        </div>

        {/* Columnas de Validación */}
        <div className="flex flex-1 gap-6 min-h-0">
          {/* Columna Izquierda: Documento Original */}
          <div className="flex-1 surface-card flex flex-col rounded-2xl shadow-xl border border-slate-800 overflow-hidden bg-slate-900/50">
            <div className="px-5 py-3 border-b border-slate-800 flex justify-between items-center bg-[#0a0f18]">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Documento Escaneado</h3>
              <span className="text-[9px] bg-slate-800 text-slate-400 px-2.5 py-1 rounded border border-slate-700 font-semibold">Solo lectura</span>
            </div>
            <div className="flex-1 p-4 bg-slate-950 relative overflow-hidden flex items-center justify-center">
              {selectedArchiveItem.filename?.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={getPdfUrl(`${BACKEND_URL}/api/files/${selectedArchiveItem.id}`)}
                  className="w-full h-full border-none absolute inset-0"
                  title="Visor PDF Escaneado"
                />
              ) : (
                <img
                  src={`${BACKEND_URL}/api/files/${selectedArchiveItem.id}`}
                  alt="Visualización escaneada"
                  className="object-contain w-full h-full max-h-full"
                />
              )}
            </div>
          </div>

          {/* Columna Derecha: Editor OCR (Tema Claro) */}
          <div className="flex-1 flex flex-col rounded-2xl shadow-xl border border-slate-200 overflow-hidden bg-white">
            <div className="px-5 py-3 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Editor OCR</h3>
              <span className="text-[10px] text-blue-700 bg-blue-100 px-2.5 py-1 rounded font-semibold border border-blue-200">Editable</span>
            </div>
            <div className="px-5 py-2 border-b border-slate-100 bg-white">
              <p className="text-[11px] text-slate-500">Formato Markdown. Usa **texto** para negrita, - item para listas.</p>
            </div>
            <div className="flex-1 p-5 bg-slate-50 flex flex-col">
              <textarea
                value={archiveItemText}
                onChange={(e) => setArchiveItemText(e.target.value)}
                className="flex-grow w-full bg-white border border-slate-200 rounded-xl p-4 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 leading-relaxed resize-none shadow-sm scrollbar-thin scrollbar-thumb-slate-300"
                placeholder="Escribe o corrige el texto aquí..."
              />
            </div>
            {/* Footer de Confirmación */}
            <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-between items-center">
              <span className="text-xs text-slate-500">
                Los cambios se asociarán al expediente <strong className="text-slate-800">{selectedArchiveItem.case_number}</strong>
              </span>
              <button
                onClick={() => {
                  updateArchiveItemText();
                  setIsEditingExtraction(false);
                }}
                className="bg-[#1e293b] hover:bg-[#0f172a] text-white text-xs font-semibold py-2.5 px-6 rounded-lg shadow-md transition-colors flex items-center gap-2"
              >
                Confirmar y Guardar 
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================
  // RENDER NORMAL: VISTA DE TRES PANELES
  // =========================================
  return (
    <div className="animate-fadeIn w-full h-[calc(100vh-120px)] min-h-[700px] flex gap-6 mx-auto">
      
      {/* SECCIÓN IZQUIERDA: Archivero */}
      <div className="w-[300px] shrink-0 surface-card p-6 flex flex-col h-full rounded-2xl shadow-xl overflow-hidden">
        {!showIncidentsTab || userRole !== "digital_secretary" ? (
          <>
            {userRole === "digital_secretary" && onStartOcr && (
              <button
                onClick={onStartOcr}
                className="w-full mb-5 py-3 rounded-xl text-xs font-semibold text-white bg-[#0e172a] hover:bg-[#c5ae73] hover:text-[#0f172a] hover:border-[#c5ae73] border border-slate-700 shadow-md transition-all flex items-center justify-center gap-2"
              >
                + Digitalizar Nuevo Documento
              </button>
            )}

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
                    value={archiveSearch}
                    onChange={(e) => setArchiveSearch(e.target.value)}
                    placeholder="Buscar expediente..."
                    className="w-full bg-transparent pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-800">
              {isLoadingArchive ? (
                <p className="text-xs text-slate-500 text-center py-12">Cargando archivero...</p>
              ) : groupedCases.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-12">No se encontraron resultados.</p>
              ) : (
                groupedCases.map(group => {
                  const isCollapsed = collapsedGroups[group.caseNumber] || false;
                  return (
                    <div key={group.caseNumber} className="border border-slate-800/80 bg-slate-950/20 rounded-xl overflow-hidden">
                      <div
                        onClick={() => {
                          setCollapsedGroups(prev => ({ ...prev, [group.caseNumber]: !prev[group.caseNumber] }));
                          setSelectedCaseNumber(group.caseNumber);
                          setSelectedArchiveItem(null);
                        }}
                        className={`flex items-center justify-between p-3 cursor-pointer border-b border-slate-800/40 hover:bg-slate-900/60 transition-colors ${
                          selectedCaseNumber === group.caseNumber && !selectedArchiveItem
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
                                  ? "border-blue-500/50 bg-blue-500/10 text-white"
                                  : "border-slate-800 hover:border-slate-700 bg-slate-900/30 text-slate-300"
                              }`}
                            >
                              <p className="text-[11px] font-semibold truncate" title={item.filename}>{item.filename}</p>
                              <div className="flex items-center justify-between mt-1 text-[9px] text-slate-500">
                                <span>Folio {item.start_folio}</span>
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
          <div className="flex-grow overflow-y-auto">{/* Lógica de incidentes aquí */}</div>
        )}
      </div>

      {/* =========================================
          SECCIÓN CENTRAL Y DERECHA (Con Bloqueo de Lector)
      ========================================= */}
      {["reader_user", "public_reader"].includes(userRole) ? (
        <>
          {/* PANEL CENTRAL BLOQUEADO */}
          <div className="flex-1 surface-card rounded-2xl shadow-xl border border-slate-800 bg-slate-900/40 flex flex-col items-center justify-center text-center p-8 backdrop-blur-sm">
            <div className="bg-amber-500/10 p-4 rounded-full mb-6 border border-amber-500/20">
              <svg className="w-16 h-16 text-amber-500 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-3 tracking-wide">
              Inicia sesión para acceder al contenido del expediente
            </h2>
            <p className="text-sm text-slate-400">
              Selecciona un rol con acceso en el Panel de Demostración
            </p>
          </div>

          {/* PANEL DERECHO BLOQUEADO */}
          <div className="w-[380px] shrink-0 surface-card rounded-2xl shadow-xl border border-slate-800 bg-slate-900/40 flex flex-col items-center justify-center text-center p-8 backdrop-blur-sm">
            <svg className="w-8 h-8 text-amber-500 mb-4 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              Panel bloqueado
            </p>
          </div>
        </>
      ) : (
        <>
          {/* =========================================
              SECCIÓN CENTRAL ORIGINAL: Encabezado + Visor + Datos 
          ========================================= */}
          <div className="flex-1 flex flex-col min-w-0 h-full gap-4">
            {selectedArchiveItem || selectedCaseNumber ? (
              <>
                {/* 1. Encabezado Propio (Superior) */}
                {selectedArchiveItem && (
                  <div className="surface-card shrink-0 bg-slate-900/80 p-4 rounded-2xl flex justify-between items-center shadow-lg border border-slate-800">
                    <div>
                      <h2 className="text-sm font-bold text-white mb-1">
                        {selectedArchiveItem.case_number || "Sin Expediente Asignado"}
                      </h2>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>Folio {selectedArchiveItem.start_folio || "-"}</span>
                        <span>•</span>
                        <span>{selectedArchiveItem.document_type || "Documento General"}</span>
                        <span>•</span>
                        <span>{new Date(selectedArchiveItem.timestamp * 1000).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    {/* Botón condicional por rol de usuario */}
                    {userRole !== "digital_secretary" ? (
                      <button
                        onClick={() => setShowIncidentModal(true)}
                        className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold py-2.5 px-5 rounded-lg transition-all shadow-lg shadow-rose-600/30"
                      >
                        Reportar Incidente
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsEditingExtraction(true)}
                        className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold py-2.5 px-5 rounded-lg transition-colors border border-slate-700 shadow-sm"
                      >
                        Editar Extracción
                      </button>
                    )}
                  </div>
                )}

                {/* Alerta de incidente activa */}
                {selectedArchiveItem && activeIncident && (
                   <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3.5 text-xs text-rose-300 flex flex-col gap-1.5 shrink-0">
                      <span className="font-bold">⚠️ Nota de Incidente (Fallo reportado):</span>
                      <p className="italic bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/40 leading-normal">
                        &quot;{activeIncident.note}&quot;
                      </p>
                   </div>
                )}

                {/* 2. Visualizador del Documento (Flexible) */}
                {selectedArchiveItem ? (
                  <div className="surface-card flex-1 min-h-0 flex flex-col rounded-2xl shadow-lg border border-slate-800 bg-slate-950 overflow-hidden relative">
                    {selectedArchiveItem.filename?.toLowerCase().endsWith(".pdf") ? (
                      <iframe
                        src={getPdfUrl(`${BACKEND_URL}/api/files/${selectedArchiveItem.id}`)}
                        className="w-full h-full border-none absolute inset-0"
                        title="Visor PDF"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-4">
                        <img
                          src={`${BACKEND_URL}/api/files/${selectedArchiveItem.id}`}
                          alt="Visualización de causa"
                          className="object-contain w-full h-full max-h-full"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="surface-card flex-1 p-8 rounded-2xl flex items-center justify-center text-center shadow-lg border border-slate-800">
                    <div>
                      <p className="text-sm font-bold text-white mb-2">Vista Global de la Causa: {selectedCaseNumber}</p>
                      <p className="text-xs text-slate-500">Haz clic en un folio en la lista izquierda para abrir el visualizador.</p>
                    </div>
                  </div>
                )}

                {/* 3. Panel Inferior de Datos (Anclado al fondo) */}
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
                  
                  {showSummary && (
                    <div className="overflow-y-auto max-h-[220px] scrollbar-thin scrollbar-thumb-slate-700 pr-2">
                      {summaryViewMode === "single" ? (
                        selectedArchiveItem ? (
                          <div>
                            <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Resumen del Folio</h4>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {selectedArchiveItem.summary || "Sin resumen disponible para este folio."}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic">Selecciona un folio de la lista izquierda.</p>
                        )
                      ) : (
                        <div>
                           <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-3">Documentos en el Expediente</h4>
                           <div className="space-y-3">
                            {archiveList.filter(d => d.case_number === selectedCaseNumber).map((doc) => (
                              <div key={doc.id} className="border-b border-slate-800/40 pb-2 last:border-0">
                                <span className="text-[10px] font-bold text-blue-400 block mb-1">📄 {doc.filename}</span>
                                <p className="text-xs text-slate-350">{doc.summary || "Sin resumen disponible."}</p>
                              </div>
                            ))}
                           </div>
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
              SECCIÓN DERECHA ORIGINAL: Texto OCR Retráctil
          ========================================= */}
          {selectedArchiveItem ? (
            <div 
              className={`shrink-0 h-full surface-card rounded-2xl shadow-xl border border-slate-800 transition-all duration-300 ease-in-out flex flex-col overflow-hidden
                ${showOcrPanel ? 'w-[380px]' : 'w-[45px] cursor-pointer hover:bg-slate-800/50 bg-slate-900/60'}
              `}
              onClick={() => !showOcrPanel && setShowOcrPanel(true)}
            >
              {showOcrPanel ? (
                <div className="p-5 flex flex-col h-full w-[380px]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wide">Texto Plano (OCR)</h3>
                      {userRole !== "digital_secretary" && (
                        <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                          Solo lectura
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={() => setShowOcrPanel(false)} 
                      className="text-[10px] font-semibold text-slate-400 hover:text-slate-300 flex items-center gap-1.5 transition-colors"
                    >
                      Ocultar
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  <textarea
                    value={archiveItemText}
                    onChange={(e) => setArchiveItemText(e.target.value)}
                    readOnly={userRole !== "digital_secretary"}
                    className="flex-grow w-full bg-[#0a0f18] border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500/50 leading-relaxed resize-none scrollbar-thin scrollbar-thumb-slate-700"
                    placeholder="Cargando texto del archivo..."
                  />

                  <div className="mt-5 flex gap-3 justify-end shrink-0">
                    {userRole === "digital_secretary" && (
                      <>
                        <button
                          onClick={updateArchiveItemText}
                          disabled={isUpdatingArchiveText || archiveItemText === originalArchiveItemText}
                          className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 disabled:opacity-40 transition-colors w-full"
                        >
                          {isUpdatingArchiveText ? "Guardando..." : "Guardar Borrador"}
                        </button>
                        <button
                          onClick={analyzeArchiveItem}
                          disabled={isAnalyzing || !archiveItemText.trim()}
                          className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#c5a66d] text-slate-900 hover:bg-[#b0935d] shadow-md disabled:opacity-40 transition-colors w-full"
                        >
                          {isAnalyzing ? "Analizando..." : "Re-Analizar y Validar"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 w-full flex flex-col items-center justify-start pt-6 gap-6">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span 
                    className="text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase whitespace-nowrap"
                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                  >
                    Texto Plano (OCR)
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="w-[380px] shrink-0 h-full surface-card rounded-2xl border border-slate-800 flex items-center justify-center text-slate-500 text-xs">
              Selecciona un folio para ver el texto OCR.
            </div>
          )}
        </>
      )}
      
    </div>
  );
};