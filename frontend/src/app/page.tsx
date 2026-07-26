"use client";

import { useLibra } from "../hooks/useLibra";
import TopNavBar from "../components/TopNavBar";
import { RoleWorkspace } from "../components/roles/RoleWorkspace";
import { LoginModal } from "../components/LoginModal";

export default function Home() {
  const state = useLibra();
  const {
    userRole,
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
    isLoginOpen,
    setIsLoginOpen,
    loginAction,
    logoutAction,
  } = state;

  return (
    <main className="min-h-screen bg-[#090d16] text-[#e2e8f0] font-sans relative">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Navigation Bar */}
      <TopNavBar
        userRole={userRole}
        viewMode={viewMode}
        setViewMode={setViewMode}
        currentStep={currentStep}
        resetWorkflow={resetWorkflow}
        setShowIncidentsTab={setShowIncidentsTab}
        fetchArchiveList={fetchArchiveList}
        searchCausasAction={searchCausasAction}
        setError={setError}
        setIsLoginOpen={setIsLoginOpen}
        logoutAction={logoutAction}
      />

      <div className={userRole !== "reader_user" ? "w-full h-[calc(100vh-56px)]" : "max-w-[96%] mx-auto px-6 py-8"}>
        <RoleWorkspace state={state} />

        {showIncidentModal && selectedArchiveItem && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
            <div className={`border rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl transition-colors ${
              userRole === "court_secretary"
                ? "bg-[#e2e8f0] border-[#cbd5e1] shadow-[8px_8px_16px_#c5cbd2,-8px_-8px_16px_#ffffff]"
                : "bg-slate-900 border-slate-800"
            }`}>
              <h3 className={`text-sm font-bold mb-2 ${userRole === "court_secretary" ? "text-slate-800" : "text-white"}`}>
                ⚠️ Reportar Incidente de OCR
              </h3>
              <p className={`text-xs mb-4 leading-normal ${userRole === "court_secretary" ? "text-slate-600" : "text-slate-400"}`}>
                Describe el error que detectaste en el texto plano del expediente.
              </p>
              <textarea
                value={incidentNote}
                onChange={(e) => setIncidentNote(e.target.value)}
                placeholder="Ej: El nombre del acusado está mal escrito o el número de folio no coincide..."
                className={`w-full h-24 border rounded-xl p-3 text-xs focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 resize-none leading-relaxed ${
                  userRole === "court_secretary"
                    ? "bg-[#e2e8f0] border-transparent shadow-[inset_4px_4px_8px_#c5cbd2,inset_-4px_-4px_8px_#ffffff] text-slate-800 placeholder-slate-500"
                    : "bg-slate-950 border-slate-800 text-white placeholder-slate-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]"
                }`}
              />
              <div className="mt-4 flex gap-4 justify-end items-center">
                <button
                  onClick={() => {
                    setShowIncidentModal(false);
                    setIncidentNote("");
                  }}
                  className={`text-[11px] font-bold transition-all ${
                    userRole === "court_secretary"
                      ? "text-slate-500 hover:text-slate-700"
                      : "text-slate-400 hover:text-slate-300"
                  }`}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => submitIncident(selectedArchiveItem.id, incidentNote)}
                  disabled={!incidentNote.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-40 transition-all shadow-[4px_4px_8px_rgba(244,63,94,0.3),-2px_-2px_6px_rgba(255,255,255,0.8)] hover:shadow-[inset_2px_2px_4px_rgba(225,29,72,0.5),inset_-2px_-2px_4px_rgba(251,113,133,0.5)] active:scale-95"
                >
                  Reportar Incidente
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Login */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={loginAction}
      />
    </main>
  );
}