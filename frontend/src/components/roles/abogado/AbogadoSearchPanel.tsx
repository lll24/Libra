"use client";

import { useLibra } from "../../../hooks/useLibra";
import { SearchView } from "../../SearchView";

type LibraHookState = ReturnType<typeof useLibra>;

interface AbogadoSearchPanelProps {
  state: LibraHookState;
}

export const AbogadoSearchPanel = ({ state }: AbogadoSearchPanelProps) => {
  const {
    BACKEND_URL,
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
    file,
    setFile,
    fileUrl,
    rawText,
    setRawText,
    userRole,
    getPdfUrl,
    setFileUrl,
    chatInput,
    setChatInput,
    chatMessages,
    isChatSending,
    sendChatMessage,
    submitIncident,
    searchCausasAction,
  } = state;

  return (
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
  );
};
