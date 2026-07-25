"use client";

import { useLibra } from "../../../hooks/useLibra";
import { ArchiveView } from "./ArchiveView";

type LibraHookState = ReturnType<typeof useLibra>;

interface DigitalSecretaryArchivePanelProps {
  state: LibraHookState;
}

export const DigitalSecretaryArchivePanel = ({ state }: DigitalSecretaryArchivePanelProps) => {
  const {
    BACKEND_URL,
    userRole,
    setShowIncidentsTab,
    showIncidentsTab,
    incidentNote,
    setIncidentNote,
    showIncidentModal,
    setShowIncidentModal,
    incidentsList,
    selectedIncident,
    setSelectedIncident,
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
    submitIncident,
    fetchIncidents,
    handleResolveIncident,
    selectArchiveItem,
    analyzeArchiveItem,
    isAnalyzing,
    setError,
    imageZoom,
    setImageZoom,
    getPdfUrl,
    setViewMode,
    resetWorkflow,
  } = state;

  return (
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
      onStartOcr={() => {
        resetWorkflow();
        setViewMode("analyzer");
      }}
    />
  );
};
