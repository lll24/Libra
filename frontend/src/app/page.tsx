"use client";

import { useLibra } from "../hooks/useLibra";
import TopNavBar from "../components/TopNavBar";
import { RoleWorkspace } from "../components/roles/RoleWorkspace";

export default function Home() {
  const state = useLibra();
  const {
    userRole,
    setUserRole,
    viewMode,
    setViewMode,
    currentStep,
    resetWorkflow,
    setShowIncidentsTab,
    fetchArchiveList,
    searchCausasAction,
    setError,
    showIncidentModal,
    selectedArchiveItem,
    incidentNote,
    setIncidentNote,
    setShowIncidentModal,
    submitIncident,
  } = state;

  return (
    <main className="min-h-screen bg-[#090d16] text-[#e2e8f0] font-sans relative">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Navigation Bar */}
      <TopNavBar
        userRole={userRole}
        setUserRole={setUserRole}
        viewMode={viewMode}
        setViewMode={setViewMode}
        currentStep={currentStep}
        resetWorkflow={resetWorkflow}
        setShowIncidentsTab={setShowIncidentsTab}
        fetchArchiveList={fetchArchiveList}
        searchCausasAction={searchCausasAction}
        setError={setError}
      />

      <div className="max-w-[96%] mx-auto px-6 py-8">
        <RoleWorkspace state={state} />

        {showIncidentModal && selectedArchiveItem && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
              <h3 className="text-sm font-bold text-white mb-2">⚠️ Reportar Incidente de OCR</h3>
              <p className="text-xs text-slate-400 mb-4 leading-normal">
                Describe el error que detectaste en el texto plano del expediente **{selectedArchiveItem.filename}**.
              </p>
              <textarea
                value={incidentNote}
                onChange={(e) => setIncidentNote(e.target.value)}
                placeholder="Ej: El nombre del acusado está mal escrito o el número de folio no coincide..."
                className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 resize-none leading-relaxed"
              />
              <div className="mt-4 flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowIncidentModal(false);
                    setIncidentNote("");
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => submitIncident(selectedArchiveItem.id, incidentNote)}
                  disabled={!incidentNote.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 transition-all"
                >
                  Reportar Incidente
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}