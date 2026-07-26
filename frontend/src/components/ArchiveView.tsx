"use client";

import React, { useState } from "react";
import { useLibra } from "../hooks/useLibra";

type LibraHookState = ReturnType<typeof useLibra>;

interface ArchiveViewProps {
  state: LibraHookState;
}

export const ArchiveView = ({ state }: ArchiveViewProps) => {
  const {
    BACKEND_URL,
    archiveList,
    archiveSearch,
    setArchiveSearch,
    isLoadingArchive,
    selectedArchiveItem,
    selectArchiveItem,
    setSelectedArchiveItem,
    archiveItemText,
    setArchiveItemText,
    originalArchiveItemText,
    isUpdatingArchiveText,
    updateArchiveItemText,
    setShowIncidentModal,
    getPdfUrl,
    imageZoom,
    setImageZoom,
    userRole,
    resetWorkflow,
    setViewMode,
    analyzeArchiveItem,
    isAnalyzing,
    incidentsList,
  } = state;

  const [collapsedGroups, setCollapsedGroups] = useState<{ [key: string]: boolean }>({});
  const [selectedCaseNumber, setSelectedCaseNumber] = useState<string | null>(null);
  const [showOcrPanel, setShowOcrPanel] = useState<boolean>(false);
  const [showSummary, setShowSummary] = useState<boolean>(true);
  const [summaryTab, setSummaryTab] = useState<"folio" | "causa">("folio");
  
  // Nuevo estado para la vista de edición OCR completa
  const [isEditingExtraction, setIsEditingExtraction] = useState<boolean>(false);

  const onStartOcr = () => {
    resetWorkflow();
    setViewMode("analyzer");
  };

  // Drag-to-scroll logic
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ left: 0, top: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current || imageZoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.pageX, y: e.pageY });
    setScrollStart({
      left: scrollContainerRef.current.scrollLeft,
      top: scrollContainerRef.current.scrollTop,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const dx = e.pageX - dragStart.x;
    const dy = e.pageY - dragStart.y;
    scrollContainerRef.current.scrollLeft = scrollStart.left - dx;
    scrollContainerRef.current.scrollTop = scrollStart.top - dy;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

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

    (archiveList || []).forEach((item) => {
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
      if (item.status === "incident") groups[caseNum].hasIncident = true;
      if (item.timestamp > groups[caseNum].latestTimestamp) groups[caseNum].latestTimestamp = item.timestamp;
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

  // Filter groups by search
  const filteredGroups = groupedCases.filter(g =>
    g.caseNumber.toLowerCase().includes(archiveSearch.toLowerCase()) ||
    g.documents.some(d => d.filename.toLowerCase().includes(archiveSearch.toLowerCase()))
  );

  const activeIncident = selectedArchiveItem 
    ? (incidentsList || []).find(i => i.document_id === selectedArchiveItem.id && i.status === "open")
    : null;

  // Renderizador básico de Markdown para modo lectura
  const renderMarkdown = (text: string) => {
    if (!text) return <p className="text-slate-500 italic p-1">Sin texto extraído.</p>;
    
    return text.split('\n').map((line, lineIndex) => {
      if (line.trim() === '---') {
        return <hr key={lineIndex} className="border-slate-700/50 my-3" />;
      }
      
      let isHeader3 = false;
      let isHeader4 = false;
      let content = line;
      
      if (content.startsWith('### ')) {
        isHeader3 = true;
        content = content.replace('### ', '');
      } else if (content.startsWith('#### ')) {
        isHeader4 = true;
        content = content.replace('#### ', '');
      }
      
      const parts = content.split(/(\*\*.*?\*\*|<u>.*?<\/u>)/gi);
      
      const renderedParts = parts.map((part, partIndex) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={partIndex} className="text-white font-bold">{part.slice(2, -2)}</strong>;
        }
        if (part.toLowerCase().startsWith('<u>') && part.toLowerCase().endsWith('</u>')) {
          return <u key={partIndex} className="underline decoration-slate-400 underline-offset-2">{part.slice(3, -4)}</u>;
        }
        return <span key={partIndex}>{part}</span>;
      });
      
      if (isHeader3) {
        return <h3 key={lineIndex} className="text-[13px] font-bold text-blue-200 mt-4 mb-2">{renderedParts}</h3>;
      }
      if (isHeader4) {
        return <h4 key={lineIndex} className="text-[11px] font-bold text-blue-300 mt-3 mb-1">{renderedParts}</h4>;
      }
      
      return <div key={lineIndex} className="min-h-[1.1rem]">{renderedParts}</div>;
    });
  };

  // =========================================
  // RENDER CONDICIONAL: VISTA DE EDICIÓN OCR
  // =========================================
  if (isEditingExtraction && selectedArchiveItem) {
    return (
      <div className="animate-fadeIn w-full h-[calc(100vh-56px)] flex flex-col mx-auto bg-[#e2e8f0] p-6 text-slate-800">
        {/* Encabezado Superior */}
        <div className="mb-4 flex justify-between items-end">
          <div>
            <button 
              onClick={() => setIsEditingExtraction(false)}
              className="text-slate-500 hover:text-slate-700 font-bold flex items-center gap-1 text-xs mb-2 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              Volver al archivero
            </button>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Validación de Extracción OCR</h2>
            <p className="text-sm text-slate-500">Revisa y corrige el texto extraído antes de guardar en el expediente.</p>
          </div>
          <div className="flex gap-3">
            <span className="neu-pressed-sm text-slate-700 text-xs font-bold px-4 py-2 rounded-xl">
              Confianza OCR: {selectedArchiveItem.ocr_confidence || "94.2%"}
            </span>
            <span className="neu-pressed-sm text-slate-700 text-xs font-bold px-4 py-2 rounded-xl">
              Motor: {selectedArchiveItem.ocr_engine || "OCR Local"}
            </span>
          </div>
        </div>

        {/* Columnas de Validación */}
        <div className="flex flex-1 gap-6 min-h-0">
          
          {/* Columna Izquierda: Documento Original */}
          <div className="flex-1 flex flex-col rounded-[24px] neu-base overflow-hidden p-4">
            <div className="pb-3 flex justify-between items-center border-b border-[#cbd5e1] mb-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Documento Escaneado</h3>
              <span className="text-[9px] neu-pressed-xs text-slate-500 px-2 py-0.5 rounded font-bold">Solo lectura</span>
            </div>
            <div className="flex-1 neu-pressed rounded-2xl relative overflow-hidden flex items-center justify-center p-2">
              {selectedArchiveItem.filename?.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={getPdfUrl(`${BACKEND_URL}/api/files/${selectedArchiveItem.id}`)}
                  className="w-full h-full border-none absolute inset-0 rounded-xl"
                  title="Visor PDF Escaneado"
                />
              ) : (
                <img
                  src={`${BACKEND_URL}/api/files/${selectedArchiveItem.id}`}
                  alt="Visualización escaneada"
                  className="object-contain w-full h-full max-h-full rounded-xl"
                />
              )}
            </div>
          </div>

          {/* Columna Derecha: Editor OCR */}
          <div className="flex-1 flex flex-col rounded-[24px] neu-base overflow-hidden p-4">
            <div className="pb-3 flex justify-between items-center border-b border-[#cbd5e1] mb-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Editor OCR</h3>
              <span className="text-[10px] text-blue-600 bg-blue-100 px-2.5 py-1 rounded font-bold shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]">Editable</span>
            </div>
            <div className="pb-3">
              <p className="text-[11px] text-slate-500 font-medium">Formato Markdown. Usa **texto** para negrita, - item para listas.</p>
            </div>
            <div className="flex-1 flex flex-col mb-4">
              <textarea
                value={archiveItemText}
                onChange={(e) => setArchiveItemText(e.target.value)}
                className="flex-grow w-full bg-[#1e293b] text-slate-200 border-none rounded-xl p-4 text-xs font-mono focus:outline-none shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5),inset_-4px_-4px_8px_rgba(255,255,255,0.05)] leading-relaxed resize-none scrollbar-thin scrollbar-thumb-slate-600"
                placeholder="Escribe o corrige el texto aquí..."
              />
            </div>
            {/* Footer de Confirmación */}
            <div className="pt-4 border-t border-[#cbd5e1] flex justify-between items-center shrink-0">
              <span className="text-[11px] text-slate-500 font-medium">
                Los cambios se asociarán al expediente <strong className="text-slate-700">{selectedArchiveItem.case_number}</strong>
              </span>
              <button
                onClick={() => {
                  updateArchiveItemText();
                  setIsEditingExtraction(false);
                }}
                className="neu-button-dark text-xs font-bold py-3 px-6 rounded-xl shadow-md transition-all flex items-center gap-2"
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
  // RENDER NORMAL: VISTA DE TRES PANELES (ESTILO NEUMORPHISM)
  // =========================================
  return (
    <div className="animate-fadeIn w-full h-[calc(100vh-56px)] flex gap-6 mx-auto bg-[#e2e8f0] p-6 text-slate-800">

      {/* SECCIÓN IZQUIERDA: Archivero */}
      <div className="w-[320px] shrink-0 flex flex-col h-full rounded-[24px] neu-base p-5 overflow-hidden">
        
        {/* BOTÓN DIGITALIZAR NUEVO DOCUMENTO (SOLO DIGITAL_SECRETARY) */}
        {userRole === "digital_secretary" && (
          <button
            onClick={onStartOcr}
            className="w-full mb-5 py-3 rounded-xl text-xs font-bold neu-button-dark flex items-center justify-center gap-2"
          >
            + Digitalizar Nuevo Documento
          </button>
        )}

        <div className="space-y-4 mb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">Archivero</p>
          <div className="relative rounded-xl neu-pressed-sm p-1 flex items-center">
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
              className="w-full bg-transparent pl-9 pr-4 py-2.5 text-xs text-slate-700 placeholder:text-slate-500 focus:outline-none rounded-xl"
            />
          </div>
        </div>

        <div className="flex-grow overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-slate-300">
          {isLoadingArchive ? (
            <p className="text-xs text-slate-500 text-center py-12">Cargando archivero...</p>
          ) : filteredGroups.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-12">No se encontraron resultados.</p>
          ) : (
            filteredGroups.map(group => {
              const isCollapsed = collapsedGroups[group.caseNumber] || false;
              return (
                <div key={group.caseNumber} className="rounded-xl overflow-hidden neu-base">
                  <div
                    onClick={() => {
                      setCollapsedGroups(prev => ({ ...prev, [group.caseNumber]: !prev[group.caseNumber] }));
                      setSelectedCaseNumber(group.caseNumber);
                      setSelectedArchiveItem(null);
                    }}
                    className={`flex items-center justify-between p-3.5 cursor-pointer transition-colors ${selectedCaseNumber === group.caseNumber && !selectedArchiveItem
                        ? "bg-[#1e293b] text-white"
                        : "bg-[#1e293b] text-white hover:bg-[#0f172a]"
                      }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs select-none">{isCollapsed ? "📁" : "📂"}</span>
                      <span className="text-xs font-bold truncate" title={group.caseNumber}>
                        {group.caseNumber === "Sin Expediente" ? "Documentos sin Expediente" : group.caseNumber}
                      </span>
                      <span className="text-[9px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full font-bold ml-1">
                        {group.documents.length}
                      </span>
                    </div>
                    {/* Indicador parpadeante de Incidente en la carpeta */}
                    {group.hasIncident && (
                      <div className="w-3 h-3 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]" title="Contiene Incidentes"></div>
                    )}
                  </div>

                  {!isCollapsed && (
                    <div className="p-3 space-y-3 bg-[#e2e8f0]">
                      {group.documents.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            selectArchiveItem(item);
                            setSelectedCaseNumber(item.case_number);
                          }}
                          className={`p-3 rounded-xl cursor-pointer transition-all ${selectedArchiveItem?.id === item.id
                              ? "neu-pressed-sm border-transparent"
                              : "neu-base-sm hover:shadow-[2px_2px_4px_#c5cbd2,-2px_-2px_4px_#ffffff]"
                            }`}
                        >
                          <div className="flex justify-between items-start mb-1.5">
                            <p className="text-[11px] font-bold text-slate-800 truncate pr-2" title={item.filename}>{item.filename}</p>
                            {item.status === "draft" && <span className="text-[7px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded font-bold uppercase shrink-0 shadow-sm">Disponible</span>}
                            {item.status === "incident" && <span className="text-[7px] bg-rose-100 text-rose-700 px-1 py-0.5 rounded font-bold uppercase shrink-0 shadow-sm animate-pulse">Incidente</span>}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                            <span>{item.start_folio ? `Folio ${item.start_folio}` : "Sin folios"}</span>
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
      </div>

      {/* SECCIÓN CENTRAL: Documento y Datos */}
      <div className="flex-1 flex flex-col min-w-0 h-full gap-5 transition-all duration-300">
        {selectedArchiveItem ? (
          <>
            {/* Header del documento (Neumorfismo) */}
            <div className="neu-base rounded-2xl p-4 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  {selectedArchiveItem.case_number || "Sin Expediente Asignado"}
                </h2>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1 font-medium">
                  <span>Folio {selectedArchiveItem.start_folio || "-"}</span>
                  <span>•</span>
                  <span>{selectedArchiveItem.document_type || "Documento General"}</span>
                  <span>•</span>
                  <span>{new Date(selectedArchiveItem.timestamp * 1000).toLocaleDateString()}</span>
                </div>
              </div>
              {/* BOTÓN CONTEXTUAL POR ROL */}
              {userRole !== "digital_secretary" ? (
                <button
                  onClick={() => setShowIncidentModal(true)}
                  className="bg-rose-500 text-white text-xs font-bold py-2 px-5 rounded-xl shadow-[4px_4px_8px_rgba(244,63,94,0.3),-2px_-2px_6px_rgba(255,255,255,0.8)] hover:shadow-[inset_2px_2px_4px_rgba(225,29,72,0.5),inset_-2px_-2px_4px_rgba(251,113,133,0.5)] flex flex-col items-center justify-center transition-all active:scale-95"
                >
                  <span>Reportar Incidente</span>
                  <span className="text-[9px] font-normal opacity-90">(Fallo OCR)</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsEditingExtraction(true)}
                  className="bg-[#1e293b] text-white text-xs font-bold py-2.5 px-5 rounded-xl shadow-md hover:bg-[#c5a66d] hover:text-slate-900 transition-all"
                >
                  Editar Extracción
                </button>
              )}
            </div>

            {/* Alerta de incidente activa */}
            {selectedArchiveItem && activeIncident && (
               <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-700 flex flex-col gap-1.5 shrink-0 shadow-sm">
                  <span className="font-bold">⚠️ Nota de Incidente (Fallo reportado):</span>
                  <p className="italic bg-white p-2.5 rounded-lg border border-rose-100 leading-normal">
                    "{activeIncident.note}"
                  </p>
               </div>
            )}

            {/* Visor PDF/Imagen */}
            <div className="flex-1 neu-pressed rounded-2xl overflow-hidden relative flex flex-col min-h-0 p-2 group">
              {!selectedArchiveItem.filename?.toLowerCase().endsWith(".pdf") && (
                <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-[#e2e8f0] p-1.5 rounded-xl shadow-[4px_4px_8px_#c5cbd2,-4px_-4px_8px_#ffffff] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button
                    onClick={() => setImageZoom(Math.max(0.25, imageZoom - 0.25))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#e2e8f0] text-slate-600 font-bold hover:text-blue-600 shadow-[2px_2px_4px_#c5cbd2,-2px_-2px_4px_#ffffff] active:shadow-[inset_2px_2px_4px_#c5cbd2,inset_-2px_-2px_4px_#ffffff] transition-all"
                    title="Alejar"
                  >
                    -
                  </button>
                  <span className="flex items-center justify-center w-12 text-[10px] font-bold text-slate-500">
                    {Math.round(imageZoom * 100)}%
                  </span>
                  <button
                    onClick={() => setImageZoom(Math.min(5, imageZoom + 0.25))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#e2e8f0] text-slate-600 font-bold hover:text-blue-600 shadow-[2px_2px_4px_#c5cbd2,-2px_-2px_4px_#ffffff] active:shadow-[inset_2px_2px_4px_#c5cbd2,inset_-2px_-2px_4px_#ffffff] transition-all"
                    title="Acercar"
                  >
                    +
                  </button>
                </div>
              )}

              {selectedArchiveItem.filename?.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={getPdfUrl(`${BACKEND_URL}/api/files/${selectedArchiveItem.id}`)}
                  className="w-full h-full border-none rounded-xl"
                  title="Visor PDF"
                />
              ) : (
                <div
                  ref={scrollContainerRef}
                  className={`flex-1 min-h-0 w-full h-full overflow-auto ${imageZoom > 1 ? 'cursor-grab' : 'flex items-center justify-center'} ${isDragging ? 'cursor-grabbing' : ''}`}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUpOrLeave}
                  onMouseLeave={handleMouseUpOrLeave}
                >
                  <div style={{
                    width: `${imageZoom * 100}%`,
                    padding: '16px',
                    margin: imageZoom > 1 ? '0' : 'auto'
                  }}>
                    <img
                      src={`${BACKEND_URL}/api/files/${selectedArchiveItem.id}`}
                      alt="Visualización del documento"
                      draggable={false}
                      className="w-full h-auto shadow-sm rounded-lg block transition-transform duration-200"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Panel de Datos (Bottom) */}
            <div className="neu-base rounded-2xl p-4 flex flex-col shrink-0">
              <div className="flex justify-between items-center mb-3 border-b border-[#cbd5e1] pb-2">
                <div className="flex gap-5">
                  <button
                    onClick={() => { setSummaryTab("folio"); setShowSummary(true); }}
                    className={`text-xs font-bold transition-all relative ${summaryTab === "folio" && showSummary ? "text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    Datos del Folio
                    {summaryTab === "folio" && showSummary && <div className="absolute -bottom-[9px] left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"></div>}
                  </button>
                  <button
                    onClick={() => { setSummaryTab("causa"); setShowSummary(true); }}
                    className={`text-xs font-bold transition-all relative ${summaryTab === "causa" && showSummary ? "text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    Datos de la Causa
                    {summaryTab === "causa" && showSummary && <div className="absolute -bottom-[9px] left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"></div>}
                  </button>
                </div>
                <button
                  onClick={() => setShowSummary(!showSummary)}
                  className="text-[10px] text-slate-500 font-bold flex items-center gap-1 hover:text-slate-700"
                >
                  {showSummary ? "Ocultar ▼" : "Mostrar ▲"}
                </button>
              </div>

              {showSummary && (
                <div className="text-xs text-slate-700 leading-relaxed max-h-[100px] overflow-y-auto mt-2">
                  {summaryTab === "folio" ? (
                    <>
                      <h4 className="font-bold text-[10px] uppercase text-slate-500 mb-1">RESUMEN EJECUTIVO DEL FOLIO</h4>
                      <p>{selectedArchiveItem.summary || "Sin resumen disponible para este folio."}</p>
                    </>
                  ) : (
                    <div className="flex flex-col">
                      <h4 className="font-bold text-[10px] uppercase text-slate-500 mb-3">Documentos en el Expediente ({selectedArchiveItem.case_number})</h4>
                      <div className="space-y-3">
                        {(archiveList || [])
                          .filter((d: any) => d.case_number === selectedArchiveItem.case_number)
                          .map((doc: any) => (
                            <div key={doc.id} className="border-b border-slate-300 pb-2 last:border-0">
                              <span className="text-[10px] font-bold text-blue-600 block mb-1">📄 {doc.filename}</span>
                              <p className="text-xs text-slate-600">{doc.summary || "Sin resumen disponible."}</p>
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
          <div className="flex-1 flex items-center justify-center neu-pressed rounded-2xl">
            <div className="text-center">
              <svg className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-500 font-medium">Selecciona un documento para visualizarlo</p>
            </div>
          </div>
        )}
      </div>

      {/* SECCIÓN DERECHA: Texto Plano (OCR) Toggle / Panel (Oculto si no hay documento) */}
      {selectedArchiveItem && (
        <div className={`shrink-0 flex transition-all duration-300 ${showOcrPanel ? "w-[380px]" : "w-[50px]"}`}>
        {!showOcrPanel ? (
          <div
            onClick={() => setShowOcrPanel(true)}
            className="w-full h-full neu-base rounded-[24px] cursor-pointer hover:shadow-[inset_2px_2px_4px_#c5cbd2,inset_-2px_-2px_4px_#ffffff] flex flex-col items-center py-6 transition-all"
          >
            <span className="text-[10px] font-bold text-slate-500 tracking-widest mt-4" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              TEXTO PLANO (OCR)
            </span>
            <svg className="w-4 h-4 text-slate-500 mt-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </div>
        ) : (
          <div className="w-full h-full neu-base rounded-[24px] flex flex-col overflow-hidden p-4">
            <div className="pb-3 flex justify-between items-center border-b border-[#cbd5e1] mb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Texto Plano (OCR)</h3>
                {userRole !== "digital_secretary" && (
                  <span className="text-[9px] neu-pressed-xs text-slate-500 px-2 py-0.5 rounded font-semibold">Solo lectura</span>
                )}
              </div>
              <button
                onClick={() => setShowOcrPanel(false)}
                className="text-[10px] text-slate-500 hover:text-slate-700 font-bold flex items-center gap-1"
              >
                Ocultar {">"}
              </button>
            </div>
            
            {userRole === "digital_secretary" ? (
              <>
                <textarea
                  value={archiveItemText}
                  onChange={(e) => setArchiveItemText(e.target.value)}
                  className="flex-grow w-full bg-[#1e293b] border-none rounded-xl p-4 text-xs font-mono text-slate-300 focus:outline-none shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5),inset_-4px_-4px_8px_rgba(255,255,255,0.05)] leading-relaxed resize-none scrollbar-thin scrollbar-thumb-slate-600"
                  placeholder="Cargando texto del archivo..."
                />
                <div className="mt-5 flex gap-3 justify-end shrink-0">
                  <button
                    onClick={updateArchiveItemText}
                    disabled={isUpdatingArchiveText || archiveItemText === originalArchiveItemText}
                    className="px-4 py-2.5 rounded-lg text-xs font-semibold neu-base-sm text-slate-700 hover:text-slate-900 active:neu-pressed-sm disabled:opacity-50 transition-all w-full"
                  >
                    {isUpdatingArchiveText ? "Guardando..." : "Guardar Borrador"}
                  </button>
                  <button
                    onClick={analyzeArchiveItem}
                    disabled={isAnalyzing || !archiveItemText.trim()}
                    className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#c5a66d] text-slate-900 hover:bg-[#b0935d] shadow-[4px_4px_8px_#c5cbd2,-4px_-4px_8px_#ffffff] active:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.2)] disabled:opacity-50 transition-all w-full"
                  >
                    {isAnalyzing ? "Analizando..." : "Re-Analizar y Validar"}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 bg-[#1e293b] rounded-xl shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5),inset_-4px_-4px_8px_rgba(255,255,255,0.05)] p-3 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600">
                <div className="w-full h-full text-[#e2e8f0] font-sans text-xs leading-relaxed p-1">
                  {renderMarkdown(archiveItemText)}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
      )}

    </div>
  );
};
