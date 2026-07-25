"use client";

import { useLibra } from "../../../hooks/useLibra";
import { AnalyzerView } from "../../AnalyzerView";

type LibraHookState = ReturnType<typeof useLibra>;

interface DigitalSecretaryAnalyzerPanelProps {
  state: LibraHookState;
}

export const DigitalSecretaryAnalyzerPanel = ({ state }: DigitalSecretaryAnalyzerPanelProps) => {
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
    imageZoom,
    setImageZoom,
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
      onBackToArchive={() => {
        resetWorkflow();
        setViewMode("archive");
      }}
    />
  );
};
