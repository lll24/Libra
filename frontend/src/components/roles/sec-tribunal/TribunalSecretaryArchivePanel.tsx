"use client";

import React, { useState } from "react";
import { useLibra } from "../../../hooks/useLibra";

type LibraHookState = ReturnType<typeof useLibra>;

interface TribunalSecretaryArchivePanelProps {
  state: LibraHookState;
}

export const TribunalSecretaryArchivePanel = ({ state }: TribunalSecretaryArchivePanelProps) => {
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
    setShowIncidentModal,
    getPdfUrl,
    imageZoom,
    setImageZoom,
  } = state;

  const [collapsedGroups, setCollapsedGroups] = useState<{ [key: string]: boolean }>({});
  const [selectedCaseNumber, setSelectedCaseNumber] = useState<string | null>(null);
  const [showOcrPanel, setShowOcrPanel] = useState<boolean>(false);
  const [showSummary, setShowSummary] = useState<boolean>(true);
  const [summaryTab, setSummaryTab] = useState<"folio" | "causa">("folio");

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

  // Renderizador básico de Markdown
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

  return (
    <div className="animate-fadeIn w-full h-[calc(100vh-56px)] flex gap-6 mx-auto bg-[#e2e8f0] p-6 text-slate-800">

      {/* SECCIÓN IZQUIERDA: Archivero */}
      <div className="w-[320px] shrink-0 flex flex-col h-full rounded-[24px] bg-[#e2e8f0] shadow-[8px_8px_16px_#c5cbd2,-8px_-8px_16px_#ffffff] p-5 overflow-hidden">
        <div className="space-y-4 mb-5">
          <div className="relative rounded-xl bg-[#e2e8f0] shadow-[inset_4px_4px_8px_#c5cbd2,inset_-4px_-4px_8px_#ffffff] p-1 flex items-center">
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
                <div key={group.caseNumber} className="rounded-xl overflow-hidden bg-[#e2e8f0] shadow-[5px_5px_10px_#c5cbd2,-5px_-5px_10px_#ffffff]">
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
                              ? "bg-[#e2e8f0] shadow-[inset_4px_4px_8px_#c5cbd2,inset_-4px_-4px_8px_#ffffff] border-transparent"
                              : "bg-[#e2e8f0] shadow-[4px_4px_8px_#c5cbd2,-4px_-4px_8px_#ffffff] hover:shadow-[2px_2px_4px_#c5cbd2,-2px_-2px_4px_#ffffff]"
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
            <div className="bg-[#e2e8f0] shadow-[6px_6px_12px_#c5cbd2,-6px_-6px_12px_#ffffff] rounded-2xl p-4 flex justify-between items-center shrink-0">
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
              <button
                onClick={() => setShowIncidentModal(true)}
                className="bg-rose-500 text-white text-xs font-bold py-2 px-5 rounded-xl shadow-[4px_4px_8px_rgba(244,63,94,0.3),-2px_-2px_6px_rgba(255,255,255,0.8)] hover:shadow-[inset_2px_2px_4px_rgba(225,29,72,0.5),inset_-2px_-2px_4px_rgba(251,113,133,0.5)] flex flex-col items-center justify-center transition-all active:scale-95"
              >
                <span>Reportar Incidente</span>
                <span className="text-[9px] font-normal opacity-90">(Fallo OCR)</span>
              </button>
            </div>

            {/* Visor PDF/Imagen */}
            <div className="flex-1 bg-[#e2e8f0] shadow-[inset_6px_6px_12px_#c5cbd2,inset_-6px_-6px_12px_#ffffff] rounded-2xl overflow-hidden relative flex flex-col min-h-0 p-2 group">

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
            <div className="bg-[#e2e8f0] shadow-[6px_6px_12px_#c5cbd2,-6px_-6px_12px_#ffffff] rounded-2xl p-4 flex flex-col shrink-0">
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
                        {archiveList
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
          <div className="flex-1 flex items-center justify-center bg-[#e2e8f0] shadow-[inset_6px_6px_12px_#c5cbd2,inset_-6px_-6px_12px_#ffffff] rounded-2xl">
            <div className="text-center">
              <svg className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-500 font-medium">Selecciona un documento para visualizarlo</p>
            </div>
          </div>
        )}
      </div>

      {/* SECCIÓN DERECHA: Texto Plano (OCR) Toggle / Panel */}
      <div className={`shrink-0 flex transition-all duration-300 ${showOcrPanel ? "w-[350px]" : "w-[50px]"}`}>
        {!showOcrPanel ? (
          <div
            onClick={() => setShowOcrPanel(true)}
            className="w-full h-full bg-[#e2e8f0] shadow-[6px_6px_12px_#c5cbd2,-6px_-6px_12px_#ffffff] rounded-[24px] cursor-pointer hover:shadow-[inset_2px_2px_4px_#c5cbd2,inset_-2px_-2px_4px_#ffffff] flex flex-col items-center py-6 transition-all"
          >
            <span className="text-[10px] font-bold text-slate-500 tracking-widest mt-4" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              TEXTO PLANO (OCR)
            </span>
            <svg className="w-4 h-4 text-slate-500 mt-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </div>
        ) : (
          <div className="w-full h-full bg-[#e2e8f0] shadow-[8px_8px_16px_#c5cbd2,-8px_-8px_16px_#ffffff] rounded-[24px] flex flex-col overflow-hidden p-4">
            <div className="pb-3 flex justify-between items-center border-b border-[#cbd5e1] mb-3">
              <h3 className="text-xs font-bold text-slate-700">Texto Plano</h3>
              <div className="flex items-center gap-2">
                <span className="text-[9px] bg-[#e2e8f0] shadow-[inset_2px_2px_4px_#c5cbd2,inset_-2px_-2px_4px_#ffffff] text-slate-500 px-2 py-0.5 rounded font-semibold">Solo lectura</span>
                <button
                  onClick={() => setShowOcrPanel(false)}
                  className="text-[10px] text-slate-500 hover:text-slate-700 font-bold flex items-center gap-1"
                >
                  Ocultar {">"}
                </button>
              </div>
            </div>
            <div className="flex-1 bg-[#1e293b] rounded-xl shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5),inset_-4px_-4px_8px_rgba(255,255,255,0.05)] p-3 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600">
              <div className="w-full h-full text-[#e2e8f0] font-sans text-xs leading-relaxed p-1">
                {renderMarkdown(archiveItemText)}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
