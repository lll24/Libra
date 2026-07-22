"use client";

import { useLibra } from "../hooks/useLibra";
import { AnalyzerView } from "../components/AnalyzerView";
import { ArchiveView } from "../components/ArchiveView";
import { SearchView } from "../components/SearchView";

export default function Home() {
  const {
    BACKEND_URL,
    currentStep,
    ocrMode,
    setOcrMode,
    viewMode,
    setViewMode,
    sourceTab,
    setSourceTab,
    userRole,
    setUserRole,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearchingCausas,
    selectedCausa,
    setSelectedCausa,
    searchAnalysisResult,
    setSearchAnalysisResult,
    showChatbot,
    setShowChatbot,
    incidentNote,
    setIncidentNote,
    showIncidentModal,
    setShowIncidentModal,
    incidentsList,
    selectedIncident,
    setSelectedIncident,
    showIncidentsTab,
    setShowIncidentsTab,
    file,
    setFile,
    fileUrl,
    setFileUrl,
    isProcessingOcr,
    isAnalyzing,
    rawText,
    setRawText,
    archiveId,
    result,
    error,
    setError,
    dragActive,
    handleDrag,
    handleDrop,
    handleFileChange,
    runLocalOcr,
    runAnalysis,
    sendChatMessage,
    validateDocumentDirectly,
    submitIncident,
    fetchIncidents,
    handleResolveIncident,
    searchCausasAction,
    resetWorkflow,
    fetchArchiveList,
    selectArchiveItem,
    updateArchiveItemText,
    analyzeArchiveItem,
    archiveList,
    isLoadingArchive,
    selectedArchiveItem,
    setSelectedArchiveItem,
    archiveItemText,
    setArchiveItemText,
    originalArchiveItemText,
    setOriginalArchiveItemText,
    isUpdatingArchiveText,
    archiveSearch,
    setArchiveSearch,
    imageZoom,
    setImageZoom,
    getPdfUrl,
    chatInput,
    setChatInput,
    chatMessages,
    setChatMessages,
    isChatSending,
  } = useLibra();

  return (
    <main className="min-h-screen bg-[#090d16] text-[#e2e8f0] font-sans relative">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-800/60 bg-[#090d16]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[96%] mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <span className="font-black text-white text-base tracking-wider">L</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide">LIBRA</h1>
              <p className="text-[10px] text-slate-400 font-medium">Expedientes Judiciales Digitales</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Selector de Rol */}
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-1.5 shadow-inner">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rol:</span>
              <select
                value={userRole}
                onChange={(e) => {
                  const role = e.target.value as any;
                  setUserRole(role);
                  resetWorkflow();
                  setShowIncidentsTab(false);
                  if (role === "digital_secretary" || role === "court_secretary") {
                    setViewMode("archive");
                  } else if (role === "reader_user") {
                    setViewMode("search");
                  }
                }}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
              >
                <option value="digital_secretary" className="bg-slate-900 text-white">🖨️ Secretario Digital</option>
                <option value="court_secretary" className="bg-slate-900 text-white">💼 Secretario de Tribunal</option>
                <option value="reader_user" className="bg-slate-900 text-white">📖 Abogado Lector</option>
              </select>
            </div>

            {/* Botones de Navegación según Rol */}
            {userRole === "digital_secretary" && (
              <button
                onClick={() => {
                  setViewMode("archive");
                  setShowIncidentsTab(false);
                  fetchArchiveList();
                  setError(null);
                }}
                className="hidden" // Hiddes buttons as digital secretary only has archivero
              />
            )}

            {userRole === "court_secretary" && (
              <>
                <button
                  onClick={() => {
                    setViewMode("archive");
                    setShowIncidentsTab(false);
                    fetchArchiveList();
                    setError(null);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    viewMode === "archive"
                      ? "bg-blue-600 border-blue-500 text-white font-semibold shadow-md shadow-blue-600/20"
                      : "bg-slate-800/60 border-slate-700 hover:bg-slate-700/80 text-slate-300"
                  }`}
                >
                  🗄️ Ver Expedientes
                </button>
                <button
                  onClick={() => {
                    setViewMode("search");
                    searchCausasAction("");
                  }}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    viewMode === "search"
                      ? "bg-blue-600 border-blue-500 text-white font-semibold shadow-md shadow-blue-600/20"
                      : "bg-slate-800/60 border-slate-700 hover:bg-slate-700/80 text-slate-300"
                  }`}
                >
                  🔍 Buscar Causas
                </button>
              </>
            )}

            {userRole === "reader_user" && (
              <button
                className="text-xs bg-blue-600 border border-blue-500 text-white font-semibold px-3 py-1.5 rounded-lg shadow-md shadow-blue-600/20"
                onClick={() => {
                  setViewMode("search");
                  searchCausasAction("");
                }}
              >
                🔍 Módulo de Búsqueda
              </button>
            )}

            {currentStep !== "upload" && viewMode === "analyzer" && userRole === "digital_secretary" && (
              <button
                onClick={resetWorkflow}
                className="text-xs bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg transition-all"
              >
                Nuevo documento
              </button>
            )}
            <div className="flex items-center gap-2 ml-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-slate-400 font-medium">Postgres Activo</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content Container */}
      <div className="max-w-[96%] mx-auto px-6 py-8">
        
        {viewMode === "analyzer" && (
          <AnalyzerView
            currentStep={currentStep}
            ocrMode={ocrMode}
            setOcrMode={setOcrMode}
            sourceTab={sourceTab}
            setSourceTab={setSourceTab}
            file={file}
            setFile={setFile}
            fileUrl={fileUrl}
            dragActive={dragActive}
            handleDrag={handleDrag}
            handleDrop={handleDrop}
            handleFileChange={handleFileChange}
            isProcessingOcr={isProcessingOcr}
            runLocalOcr={runLocalOcr}
            isAnalyzing={isAnalyzing}
            runAnalysis={runAnalysis}
            rawText={rawText}
            setRawText={setRawText}
            result={result}
            error={error}
            imageZoom={imageZoom}
            setImageZoom={setImageZoom}
            showChatbot={showChatbot}
            setShowChatbot={setShowChatbot}
            chatInput={chatInput}
            setChatInput={setChatInput}
            chatMessages={chatMessages}
            isChatSending={isChatSending}
            sendChatMessage={sendChatMessage}
            BACKEND_URL={BACKEND_URL}
            getPdfUrl={getPdfUrl}
            userRole={userRole}
            resetWorkflow={resetWorkflow}
            archiveId={archiveId}
            validateDocumentDirectly={validateDocumentDirectly}
            onBackToArchive={() => { resetWorkflow(); setViewMode("archive"); }}
          />
        )}

        {viewMode === "archive" && (
          <ArchiveView
            showIncidentsTab={showIncidentsTab}
            setShowIncidentsTab={setShowIncidentsTab}
            archiveList={archiveList}
            archiveSearch={archiveSearch}
            setArchiveSearch={setArchiveSearch}
            isLoadingArchive={isLoadingArchive}
            selectedArchiveItem={selectedArchiveItem}
            setSelectedArchiveItem={setSelectedArchiveItem}
            archiveItemText={archiveItemText}
            setArchiveItemText={setArchiveItemText}
            setOriginalArchiveItemText={setOriginalArchiveItemText}
            originalArchiveItemText={originalArchiveItemText}
            isUpdatingArchiveText={isUpdatingArchiveText}
            fetchArchiveList={fetchArchiveList}
            updateArchiveItemText={updateArchiveItemText}
            validateDocumentDirectly={validateDocumentDirectly}
            showIncidentModal={showIncidentModal}
            setShowIncidentModal={setShowIncidentModal}
            selectedIncident={selectedIncident}
            setSelectedIncident={setSelectedIncident}
            incidentNote={incidentNote}
            setIncidentNote={setIncidentNote}
            submitIncidentNote={submitIncident}
            userRole={userRole}
            BACKEND_URL={BACKEND_URL}
            getPdfUrl={getPdfUrl}
            incidentsList={incidentsList}
            selectArchiveItem={selectArchiveItem}
            imageZoom={imageZoom}
            setImageZoom={setImageZoom}
            setError={setError}
            fetchIncidents={fetchIncidents}
            handleResolveIncident={handleResolveIncident}
            analyzeArchiveItem={analyzeArchiveItem}
            isAnalyzing={isAnalyzing}
            onStartOcr={() => setViewMode("analyzer")}
          />
        )}

        {viewMode === "search" && (
          <SearchView
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchCausas={searchCausasAction}
            searchResults={searchResults}
            isSearchingCausas={isSearchingCausas}
            selectedCausa={selectedCausa}
            setSelectedCausa={setSelectedCausa}
            showChatbot={showChatbot}
            setShowChatbot={setShowChatbot}
            chatMessages={chatMessages}
            chatInput={chatInput}
            setChatInput={setChatInput}
            isChatSending={isChatSending}
            sendChatMessage={sendChatMessage}
            rawText={rawText}
            setRawText={setRawText}
            userRole={userRole}
            BACKEND_URL={BACKEND_URL}
            getPdfUrl={getPdfUrl}
            setFileUrl={setFileUrl}
            setFile={setFile}
            searchAnalysisResult={searchAnalysisResult}
            setSearchAnalysisResult={setSearchAnalysisResult}
            showIncidentModal={showIncidentModal}
            setShowIncidentModal={setShowIncidentModal}
            incidentNote={incidentNote}
            setIncidentNote={setIncidentNote}
            submitIncidentNote={submitIncident}
          />
        )}

        {/* Modal de Incidente */}
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
