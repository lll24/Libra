"use client";

import { useLibra } from "../../../hooks/useLibra";
import { AnalyzerView } from "../../AnalyzerView";

type LibraHookState = ReturnType<typeof useLibra>;

interface AbogadoAnalyzerPanelProps {
  state: LibraHookState;
}

export const AbogadoAnalyzerPanel = ({ state }: AbogadoAnalyzerPanelProps) => {
  const {
    BACKEND_URL,
    currentStep,
    ocrMode,
    setOcrMode,
    sourceTab,
    setSourceTab,
    userRole,
    file,
    setFile,
    fileUrl,
    isProcessingOcr,
    isAnalyzing,
    rawText,
    setRawText,
    archiveId,
    result,
    error,
    dragActive,
    handleDrag,
    handleDrop,
    handleFileChange,
    runLocalOcr,
    runAnalysis,
    sendChatMessage,
    validateDocumentDirectly,
    showChatbot,
    setShowChatbot,
    chatInput,
    setChatInput,
    chatMessages,
    isChatSending,
    resetWorkflow,
    getPdfUrl,
    setViewMode,
  } = state;

  return (
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
      imageZoom={1}
      setImageZoom={(_value) => undefined}
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
      onBackToArchive={() => setViewMode("archive")}
    />
  );
};
