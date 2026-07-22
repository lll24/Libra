import { useState, useEffect } from "react";
import { Entity, JudicialFileAnalysis, ChatMessage, UserRole } from "@/types";
import { api } from "../services/api";

const getBackendUrl = () => {
  if (typeof window !== "undefined" && window.location.hostname) {
    return `http://${window.location.hostname}:8000`;
  }
  return "http://localhost:8000";
};

export const useLibra = () => {
  const BACKEND_URL = getBackendUrl();

  // Workflow steps
  const [currentStep, setCurrentStep] = useState<"upload" | "ocr_edit" | "analyzed">("upload");
  const [ocrMode, setOcrMode] = useState<"local" | "ai">("ai");
  const [viewMode, setViewMode] = useState<"analyzer" | "archive" | "search">("archive");
  const [sourceTab, setSourceTab] = useState<"doc" | "text">("doc");

  // Roles, Search & Incidents
  const [userRole, setUserRole] = useState<UserRole>("digital_secretary");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedSearchCase, setSelectedSearchCase] = useState<string | null>(null);
  const [isSearchingCausas, setIsSearchingCausas] = useState(false);
  const [selectedCausa, setSelectedCausa] = useState<any | null>(null);
  const [searchAnalysisResult, setSearchAnalysisResult] = useState<any | null>(null);
  const [showChatbot, setShowChatbot] = useState(false);
  const [incidentNote, setIncidentNote] = useState("");
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incidentsList, setIncidentsList] = useState<any[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [showIncidentsTab, setShowIncidentsTab] = useState(false);

  // File States
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [rawText, setRawText] = useState("");
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [result, setResult] = useState<JudicialFileAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Chat
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatSending, setIsChatSending] = useState(false);

  // Archive States
  const [archiveList, setArchiveList] = useState<any[]>([]);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [selectedArchiveItem, setSelectedArchiveItem] = useState<any | null>(null);
  const [archiveItemText, setArchiveItemText] = useState<string>("");
  const [originalArchiveItemText, setOriginalArchiveItemText] = useState<string>("");
  const [isUpdatingArchiveText, setIsUpdatingArchiveText] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState("");

  // Zoom
  const [imageZoom, setImageZoom] = useState(1);

  const getPdfUrl = (url: string) => {
    if (!url) return "";
    return url.includes("#") ? url : `${url}#view=FitH`;
  };

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    if (fileUrl && fileUrl.startsWith("blob:")) {
      URL.revokeObjectURL(fileUrl);
    }
    setFileUrl(URL.createObjectURL(selectedFile));
    setImageZoom(1);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const runLocalOcr = async () => {
    if (!file) return;
    setIsProcessingOcr(true);
    setError(null);
    try {
      const data = await api.runOcr(BACKEND_URL, file, ocrMode);
      setRawText(data.text);
      setArchiveId(data.id);
      setCurrentStep("ocr_edit");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ocurrió un error al procesar el OCR.");
    } finally {
      setIsProcessingOcr(false);
    }
  };

  const triggerAnalysisDirectly = async (textToAnalyze: string, idToAnalyze: string) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const data = await api.analyzeText(BACKEND_URL, textToAnalyze, idToAnalyze);
      setResult(data);
      setCurrentStep("analyzed");
      setChatMessages([
        { sender: "ai", text: "Hola. He extraído la información del expediente judicial. ¿Qué deseas consultar sobre él?" }
      ]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al realizar el análisis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runAnalysis = async () => {
    if (!rawText.trim()) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      if (archiveId) {
        try {
          await api.saveArchiveText(BACKEND_URL, archiveId, rawText);
        } catch (saveErr) {
          console.error("Error al actualizar texto editado:", saveErr);
        }
      }
      const data = await api.analyzeText(BACKEND_URL, rawText, archiveId);
      setResult(data);
      if (userRole === "digital_secretary") {
        alert("Cambios guardados y expediente guardado en base de datos correctamente.");
        resetWorkflow();
      } else {
        setCurrentStep("analyzed");
        setChatMessages([
          { sender: "ai", text: "Hola. He extraído la información del escrito judicial. ¿Qué deseas consultar sobre él?" }
        ]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al procesar el análisis de la IA.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !rawText || isChatSending) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setIsChatSending(true);
    try {
      const caseNum = selectedCausa?.case_number || selectedArchiveItem?.case_number || archiveId;
      const data = await api.sendChatQuery(BACKEND_URL, rawText, userMsg, caseNum);
      setChatMessages((prev) => [...prev, { sender: "ai", text: data.answer }]);
    } catch (err: any) {
      console.error(err);
      setChatMessages((prev) => [...prev, { sender: "ai", text: "Error de comunicación con la IA. Por favor, reintenta." }]);
    } finally {
      setIsChatSending(false);
    }
  };

  const validateDocumentDirectly = async (id: string) => {
    try {
      await api.validateDocument(BACKEND_URL, id);
      alert("Expediente validado y guardado permanentemente en la base de datos.");
      resetWorkflow();
      fetchArchiveList();
      fetchIncidents();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const submitIncident = async (id: string, note: string) => {
    if (!note.trim()) return;
    try {
      await api.submitIncident(BACKEND_URL, id, note);
      alert("Incidente reportado exitosamente. Se ha notificado al Secretario Digital.");
      setShowIncidentModal(false);
      setIncidentNote("");
      fetchIncidents();
      fetchArchiveList();
      if (selectedArchiveItem && selectedArchiveItem.id === id) {
        setSelectedArchiveItem((prev: any) => prev ? { ...prev, status: 'incident' } : null);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const fetchIncidents = async () => {
    try {
      const data = await api.fetchIncidents(BACKEND_URL);
      setIncidentsList(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleResolveIncident = async (incidentId: number) => {
    try {
      await api.resolveIncident(BACKEND_URL, incidentId);
      alert("Incidente resuelto correctamente.");
      fetchIncidents();
      fetchArchiveList();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const saveDraftOnly = async () => {
    if (!rawText.trim() || !archiveId) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      await api.saveArchiveText(BACKEND_URL, archiveId, rawText);
      alert("Texto corregido guardado como Borrador en la base de datos.");
      resetWorkflow();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const searchCausas = async (query: string) => {
    setIsSearchingCausas(true);
    setSelectedSearchCase(null);
    setSelectedCausa(null);
    try {
      const data = await api.searchCausas(BACKEND_URL, query);
      setSearchResults(data);
      if (data.length === 0 && query.trim() !== "") {
        alert("No se encontraron causas registradas con ese número de caso o cédula.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSearchingCausas(false);
    }
  };

  const resetWorkflow = () => {
    if (fileUrl && fileUrl.startsWith("blob:")) {
      URL.revokeObjectURL(fileUrl);
    }
    setFile(null);
    setFileUrl(null);
    setArchiveId(null);
    setRawText("");
    setResult(null);
    setChatMessages([]);
    setError(null);
    setCurrentStep("upload");
    setImageZoom(1);
    setSelectedSearchCase(null);
  };

  const fetchArchiveList = async () => {
    setIsLoadingArchive(true);
    setError(null);
    try {
      const data = await api.fetchArchiveList(BACKEND_URL);
      setArchiveList(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al cargar el archivero.");
    } finally {
      setIsLoadingArchive(false);
    }
  };

  const selectArchiveItem = async (item: any) => {
    setSelectedArchiveItem(item);
    setArchiveItemText("");
    setOriginalArchiveItemText("");
    setError(null);
    try {
      const text = await api.fetchArchiveItemText(BACKEND_URL, item.id);
      setArchiveItemText(text);
      setOriginalArchiveItemText(text);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al cargar el texto.");
    }
  };

  const updateArchiveItemText = async () => {
    if (!selectedArchiveItem) return;
    setIsUpdatingArchiveText(true);
    setError(null);
    try {
      await api.saveArchiveText(BACKEND_URL, selectedArchiveItem.id, archiveItemText);
      alert("Texto guardado en el servidor correctamente.");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al guardar el texto.");
    } finally {
      setIsUpdatingArchiveText(false);
    }
  };

  const analyzeArchiveItem = async () => {
    if (!selectedArchiveItem || !archiveItemText.trim()) return;
    setIsAnalyzing(true);
    setError(null);
    setImageZoom(1);
    try {
      await api.saveArchiveText(BACKEND_URL, selectedArchiveItem.id, archiveItemText);
      const data = await api.analyzeText(BACKEND_URL, archiveItemText, selectedArchiveItem.id);
      setResult(data);
      setRawText(archiveItemText);
      setArchiveId(selectedArchiveItem.id);
      setFileUrl(selectedArchiveItem.file_url);
      setFile({
        name: selectedArchiveItem.filename,
        size: selectedArchiveItem.size,
        type: selectedArchiveItem.filename.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/png"
      } as any);

      if (userRole === "digital_secretary") {
        alert("Cambios guardados y expediente re-analizado por la IA correctamente. El incidente (si existía) ha sido resuelto.");
        setSelectedArchiveItem(null);
        setArchiveItemText("");
        setOriginalArchiveItemText("");
        fetchArchiveList();
        fetchIncidents();
      } else {
        setCurrentStep("analyzed");
        setViewMode("analyzer");
        setChatMessages([
          { sender: "ai", text: "Hola. He analizado el expediente judicial desde el archivero. ¿Qué deseas consultar sobre él?" }
        ]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al procesar el análisis de la IA.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    searchCausas("");
    fetchArchiveList();
  }, []);

  return {
    BACKEND_URL,
    currentStep,
    setCurrentStep,
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
    setSearchResults,
    selectedSearchCase,
    setSelectedSearchCase,
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
    setResult,
    error,
    setError,
    dragActive,
    handleDrag,
    handleDrop,
    handleFileChange,
    runLocalOcr,
    triggerAnalysisDirectly,
    runAnalysis,
    sendChatMessage,
    validateDocumentDirectly,
    submitIncident,
    fetchIncidents,
    handleResolveIncident,
    saveDraftOnly,
    searchCausasAction: searchCausas,
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
  };
};
