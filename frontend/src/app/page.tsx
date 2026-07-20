"use client";

import { useState, useEffect } from "react";

interface Entity {
  name: string;
  role: string;
  context?: string;
}

interface JudicialFileAnalysis {
  case_number?: string;
  court_name?: string;
  date?: string;
  crime_or_subject?: string;
  summary: string;
  entities: Entity[];
  key_points: string[];
}

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
}

export default function Home() {
  // Configuración del flujo de trabajo: 'upload' | 'ocr_edit' | 'analyzed'
  const [currentStep, setCurrentStep] = useState<"upload" | "ocr_edit" | "analyzed">("upload");
  const [ocrMode, setOcrMode] = useState<"local" | "ai">("ai");
  const [viewMode, setViewMode] = useState<"analyzer" | "archive" | "search">("analyzer");
  const [sourceTab, setSourceTab] = useState<"doc" | "text">("doc");
  
  // Roles, Buscador e Incidentes
  const [userRole, setUserRole] = useState<"digital_secretary" | "court_secretary" | "reader_user">("digital_secretary");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingCausas, setIsSearchingCausas] = useState(false);
  const [selectedCausa, setSelectedCausa] = useState<any | null>(null);
  const [searchAnalysisResult, setSearchAnalysisResult] = useState<any | null>(null);
  const [showChatbot, setShowChatbot] = useState(false);
  const [incidentNote, setIncidentNote] = useState("");
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incidentsList, setIncidentsList] = useState<any[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [showIncidentsTab, setShowIncidentsTab] = useState(false);
  
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [rawText, setRawText] = useState<string>("");
  const [result, setResult] = useState<JudicialFileAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Chat de consultas
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatSending, setIsChatSending] = useState(false);

  // Estados del Archivero
  const [archiveList, setArchiveList] = useState<any[]>([]);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [selectedArchiveItem, setSelectedArchiveItem] = useState<any | null>(null);
  const [archiveItemText, setArchiveItemText] = useState<string>("");
  const [originalArchiveItemText, setOriginalArchiveItemText] = useState<string>("");
  const [isUpdatingArchiveText, setIsUpdatingArchiveText] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState("");

  // Estado del Zoom para imágenes
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

  // Paso 1: Ejecutar OCR
  const runLocalOcr = async () => {
    if (!file) return;

    setIsProcessingOcr(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", ocrMode);

    try {
      const response = await fetch("http://localhost:8000/api/ocr", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Error al procesar el archivo mediante OCR.");
      }

      const data = await response.json();
      setRawText(data.text);
      setArchiveId(data.id);
      
      if (data.cached) {
        const wantsToView = window.confirm("Este archivo ya existe en el sistema. ¿Deseas ver su análisis directamente?");
        if (wantsToView) {
          triggerAnalysisDirectly(data.text, data.id);
          return;
        }
      }
      
      setCurrentStep("ocr_edit");
      setImageZoom(1);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "No se pudo conectar con el servidor backend en http://localhost:8000");
    } finally {
      setIsProcessingOcr(false);
    }
  };

  const triggerAnalysisDirectly = async (textToAnalyze: string, idToAnalyze: string) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:8000/api/analyze-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: textToAnalyze, id: idToAnalyze }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Error en el servidor al analizar el texto.");
      }

      const data: JudicialFileAnalysis = await response.json();
      setResult(data);
      setCurrentStep("analyzed");
      setChatMessages([
        { sender: "ai", text: "Hola. He recuperado el expediente judicial existente. ¿Qué deseas consultar sobre él?" }
      ]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al realizar el análisis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Paso 2: Ejecutar Análisis sobre texto editado/confirmado
  const runAnalysis = async () => {
    if (!rawText.trim()) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Guardar cualquier cambio realizado en la revisión
      if (archiveId) {
        try {
          await fetch(`http://localhost:8000/api/archive/${archiveId}/text`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: rawText }),
          });
        } catch (saveErr) {
          console.error("Error al actualizar texto editado:", saveErr);
        }
      }

      const response = await fetch("http://localhost:8000/api/analyze-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: rawText, id: archiveId }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Error en el servidor al analizar el texto.");
      }

      const data: JudicialFileAnalysis = await response.json();
      setResult(data);
      if (userRole === "digital_secretary") {
        alert("Expediente verificado y procesado por la IA correctamente.");
        resetWorkflow();
      } else {
        setCurrentStep("analyzed");
        setChatMessages([
          { sender: "ai", text: "Hola. He analizado el expediente judicial. ¿Qué información deseas consultar sobre él?" }
        ]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al realizar el análisis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Paso 3: Chat Q&A
  const sendChatMessage = async () => {
    if (!chatInput.trim() || !rawText || isChatSending) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setIsChatSending(true);

    try {
      const response = await fetch("http://localhost:8000/api/chat-query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document_text: rawText,
          question: userMsg,
        }),
      });

      if (!response.ok) {
        throw new Error("Error al consultar a la IA.");
      }

      const data = await response.json();
      setChatMessages((prev) => [...prev, { sender: "ai", text: data.answer }]);
    } catch (err: any) {
      console.error(err);
      setChatMessages((prev) => [...prev, { sender: "ai", text: "Error de comunicación con la IA. Por favor, reintenta." }]);
    } finally {
      setIsChatSending(false);
    }
  };

  // Funciones de Roles, Incidentes y Búsqueda
  const validateDocumentDirectly = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/documents/${id}/validate`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Error al validar el documento");
      alert("Documento validado definitivamente.");
      if (currentStep === "analyzed") {
        setResult((prev: any) => prev ? { ...prev, status: 'validated' } as any : null);
      }
      fetchArchiveList();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const submitIncident = async (id: string, note: string) => {
    if (!note.trim()) return;
    try {
      const response = await fetch(`http://localhost:8000/api/incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: id, note }),
      });
      if (!response.ok) throw new Error("Error al reportar incidente");
      alert("Incidente reportado correctamente.");
      setShowIncidentModal(false);
      setIncidentNote("");
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
      const response = await fetch("http://localhost:8000/api/incidents");
      if (!response.ok) throw new Error("Error al cargar incidentes");
      const data = await response.json();
      setIncidentsList(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleResolveIncident = async (incidentId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/incidents/${incidentId}/resolve`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Error al resolver incidente");
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
      const response = await fetch(`http://localhost:8000/api/archive/${archiveId}/text`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });
      if (!response.ok) throw new Error("Error al guardar el texto corregido.");
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
    try {
      const response = await fetch(`http://localhost:8000/api/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error("Error al buscar causas");
      const data = await response.json();
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
  

  useEffect(() => {
    fetchIncidents();
    searchCausas("");
  }, []);

  // Reset del flujo
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
  };

  // Funciones del Archivero
  const fetchArchiveList = async () => {
    setIsLoadingArchive(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:8000/api/archive");
      if (!response.ok) throw new Error("Error al obtener la lista del archivero.");
      const data = await response.json();
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
    setImageZoom(1);
    try {
      const response = await fetch(`http://localhost:8000/api/archive/${item.id}/text`);
      if (!response.ok) throw new Error("No se pudo cargar el texto del archivo.");
      const data = await response.json();
      setArchiveItemText(data.text);
      setOriginalArchiveItemText(data.text);
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
      const response = await fetch(`http://localhost:8000/api/archive/${selectedArchiveItem.id}/text`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: archiveItemText }),
      });
      if (!response.ok) throw new Error("Error al guardar el texto.");
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
      // Guardar cualquier cambio de texto primero
      await fetch(`http://localhost:8000/api/archive/${selectedArchiveItem.id}/text`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: archiveItemText }),
      });

      // Ejecutar el análisis
      const response = await fetch("http://localhost:8000/api/analyze-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: archiveItemText, id: selectedArchiveItem.id }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Error en el servidor al analizar el texto.");
      }

      const data: JudicialFileAnalysis = await response.json();
      setResult(data);
      setRawText(archiveItemText);
      setArchiveId(selectedArchiveItem.id);
      
      // Ajustar URL y mockear objeto File para visualización
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
      setError(err.message || "Error al analizar el expediente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helpers de colores de roles
  const getRoleBadgeStyle = (role: string) => {
    switch (role.toLowerCase()) {
      case "juez":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case "víctima":
      case "demandante":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "agresor":
      case "demandado":
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      case "abogado_defensor":
      case "abogado_acusador":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "testigo":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      default:
        return "bg-slate-500/20 text-slate-300 border-slate-500/30";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role.toLowerCase()) {
      case "juez": return "Juez";
      case "víctima": return "Víctima";
      case "demandante": return "Demandante";
      case "agresor": return "Agresor / Imputado";
      case "demandado": return "Demandado";
      case "abogado_defensor": return "Defensa Técnica";
      case "abogado_acusador": return "Acusación / Fiscal";
      case "testigo": return "Testigo";
      default: return role;
    }
  };

  return (
    <main className="min-h-screen bg-[#090d16] text-[#e2e8f0] font-sans relative">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-800/60 bg-[#090d16]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[96%] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              Δ
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                LIBRA <span className="text-xs bg-blue-500/20 text-blue-400 font-semibold px-2 py-0.5 rounded-full">v1.1</span>
              </h1>
              <p className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">Tribunal Supremo de Justicia</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Selector de Rol */}
            <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 rounded-lg p-1 mr-2">
              <span className="text-[9px] text-slate-500 font-bold px-1.5 uppercase">Rol:</span>
              <select
                value={userRole}
                onChange={(e) => {
                  const role = e.target.value as any;
                  setUserRole(role);
                  setShowIncidentsTab(false);
                  if (role === "reader_user") {
                    setViewMode("search");
                    searchCausas("");
                  } else if (role === "court_secretary") {
                    setViewMode("archive");
                    fetchArchiveList();
                  } else {
                    setViewMode("analyzer");
                  }
                  setError(null);
                }}
                className="bg-slate-950 text-xs text-slate-300 font-medium border border-slate-850 rounded px-1.5 py-0.5 focus:outline-none cursor-pointer"
              >
                <option value="digital_secretary">✍️ Secr. Digital</option>
                <option value="court_secretary">🕵️‍♀️ Secr. Tribunal</option>
                <option value="reader_user">📖 Abogado Lector</option>
              </select>
            </div>

            {/* Botones de Navegación según Rol */}
            {userRole === "digital_secretary" && (
              <>
                <button
                  onClick={() => {
                    setViewMode("analyzer");
                    setError(null);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    viewMode === "analyzer"
                      ? "bg-blue-600 border-blue-500 text-white font-semibold shadow-md shadow-blue-600/20"
                      : "bg-slate-800/60 border-slate-700 hover:bg-slate-700/80 text-slate-300"
                  }`}
                >
                  Analizador
                </button>
                <button
                  onClick={() => {
                    setViewMode("archive");
                    fetchArchiveList();
                    setError(null);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    viewMode === "archive"
                      ? "bg-blue-600 border-blue-500 text-white font-semibold shadow-md shadow-blue-600/20"
                      : "bg-slate-800/60 border-slate-700 hover:bg-slate-700/80 text-slate-300"
                  }`}
                >
                  🗄️ Archivero
                </button>
              </>
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
                    searchCausas("");
                    setError(null);
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
          <>
            {/* STEP 1: UPLOAD FILE */}
            {currentStep === "upload" && (
              <div className="max-w-2xl mx-auto mt-12 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-xl">
                <h2 className="text-xl font-bold text-white mb-2 text-center">Analizador Judicial Local</h2>
                <p className="text-slate-400 text-sm text-center mb-8">Sube tu archivo para realizar la lectura OCR aislada en el contenedor del sistema.</p>
                
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
                    dragActive
                      ? "border-blue-500 bg-blue-500/5"
                      : "border-slate-800 hover:border-slate-700 bg-slate-950/40"
                  }`}
                >
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.docx,image/*"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <svg className="w-12 h-12 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <div>
                        <span className="text-sm font-semibold text-blue-400 hover:text-blue-300">Arrastra o sube tu documento</span>
                        <p className="text-xs text-slate-500 mt-2">Formatos: PDF (digital/escaneado), DOCX o Imágenes</p>
                      </div>
                    </div>
                  </label>
                </div>

                {file && (
                  <div className="mt-6 p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <svg className="w-8 h-8 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{file.name}</p>
                        <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Selector de motor de lectura / OCR */}
                <div className="mt-6">
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-3">Motor de Lectura / OCR</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setOcrMode("local")}
                      className={`p-4 rounded-xl border text-left transition-all duration-200 flex flex-col gap-1 ${
                        ocrMode === "local"
                          ? "border-blue-500 bg-blue-500/10 text-white shadow-md shadow-blue-500/5"
                          : "border-slate-800 hover:border-slate-700 bg-slate-950/40 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-semibold text-sm">
                        <span className={`w-2.5 h-2.5 rounded-full ${ocrMode === "local" ? "bg-blue-400" : "bg-slate-600"}`} />
                        OCR Local (Tesseract)
                      </div>
                      <span className="text-xs text-slate-500 leading-normal">
                        Procesamiento local 100% privado en contenedor Docker. Rápido y seguro.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOcrMode("ai")}
                      className={`p-4 rounded-xl border text-left transition-all duration-200 flex flex-col gap-1 ${
                        ocrMode === "ai"
                          ? "border-purple-500 bg-purple-500/10 text-white shadow-md shadow-purple-500/5"
                          : "border-slate-800 hover:border-slate-700 bg-slate-950/40 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 font-semibold text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${ocrMode === "ai" ? "bg-purple-400" : "bg-slate-600"}`} />
                          OCR con IA (Gemini)
                        </div>
                        <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold tracking-wider uppercase">
                          Recomendado
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 leading-normal">
                        Máxima precisión. Ideal para escaneos borrosos, con sellos, tachaduras o firmas.
                      </span>
                    </button>

                  </div>
                </div>

                <button
                  onClick={runLocalOcr}
                  disabled={!file || isProcessingOcr}
                  className={`w-full mt-6 py-3.5 px-4 rounded-xl font-semibold text-white transition-all shadow-lg flex items-center justify-center gap-2 ${
                    ocrMode === "ai"
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-600/20"
                      : "bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 shadow-blue-600/20"
                  }`}
                >
                  {isProcessingOcr ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {ocrMode === "ai" ? "Procesando Lectura con Gemini..." : "Procesando Lectura OCR Local..."}
                    </>
                  ) : (
                    ocrMode === "ai" ? "Extraer Texto con IA (Gemini)" : "Extraer Texto con OCR Local"
                  )}
                </button>

                {error && (
                  <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg text-center">
                    {error}
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: OCR EDIT & CORRECT (Side-by-Side Layout) */}
            {currentStep === "ocr_edit" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full mx-auto">
                
                {/* Columna Izquierda: Visor del archivo original */}
                <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl flex flex-col h-[780px]">
                  <h3 className="text-sm font-bold text-white mb-3">Documento Original</h3>
                  <div className="flex-grow border border-slate-800 bg-slate-950/60 rounded-xl overflow-auto flex items-start justify-center relative">
                    {fileUrl ? (
                      file?.type === "application/pdf" || file?.name.toLowerCase().endsWith(".pdf") ? (
                        <iframe
                          src={getPdfUrl(fileUrl)}
                          className="w-full h-full border-none"
                          title="Visor PDF"
                        />
                      ) : file?.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(file?.name || "") ? (
                        <img
                          src={fileUrl}
                          alt="Vista previa del documento"
                          className="transition-all duration-200 object-contain p-2"
                          style={{
                            width: `${imageZoom * 100}%`,
                            height: 'auto',
                            maxHeight: 'none',
                            maxWidth: 'none',
                          }}
                        />
                      ) : (
                        <div className="text-center p-4 m-auto">
                          <svg className="w-12 h-12 text-slate-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-xs text-slate-400">Vista previa no disponible para este formato</p>
                          <p className="text-[10px] text-slate-600 mt-1">{file?.name}</p>
                        </div>
                      )
                    ) : (
                      <p className="text-xs text-slate-500 m-auto">Cargando visor...</p>
                    )}

                    {/* Botones de zoom para imágenes */}
                    {fileUrl && !(file?.type === "application/pdf" || file?.name.toLowerCase().endsWith(".pdf")) && (
                      <div className="absolute bottom-4 right-4 flex items-center gap-1 z-20 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-lg p-1.5 shadow-lg">
                        <button
                          onClick={() => setImageZoom(prev => Math.max(prev - 0.25, 0.5))}
                          className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition-colors"
                          title="Alejar"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs font-mono text-slate-300 min-w-[50px] text-center">
                          {Math.round(imageZoom * 100)}%
                        </span>
                        <button
                          onClick={() => setImageZoom(prev => Math.min(prev + 0.25, 3))}
                          className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition-colors"
                          title="Acercar"
                        >
                          +
                        </button>
                        <button
                          onClick={() => setImageZoom(1)}
                          className="ml-1 px-2 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-medium transition-colors"
                          title="Restaurar escala"
                        >
                          Reset
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Columna Derecha: Cuadro de edición de texto */}
                <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl flex flex-col h-[780px]">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h2 className="text-base font-bold text-white">Revisión y Corrección del OCR</h2>
                      <p className="text-[11px] text-slate-400">Edita el texto a la derecha comparándolo con el documento original a la izquierda.</p>
                    </div>
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-medium">Humano en el bucle</span>
                  </div>

                  <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="flex-grow w-full bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 leading-relaxed resize-none overflow-y-auto"
                    placeholder="Texto extraído del expediente..."
                  />

                  <div className="mt-4 flex justify-end gap-3">
                    <button
                      onClick={() => setCurrentStep("upload")}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 border border-slate-700 transition-all"
                    >
                      Volver a cargar
                    </button>
                    {userRole === "digital_secretary" ? (
                      <button
                        onClick={runAnalysis}
                        disabled={isAnalyzing || !rawText.trim()}
                        className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                      >
                        {isAnalyzing ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Procesando y Guardando...
                          </>
                        ) : (
                          "Confirmar y Guardar"
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={runAnalysis}
                        disabled={isAnalyzing || !rawText.trim()}
                        className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                      >
                        {isAnalyzing ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Analizando Ficha con Gemini...
                          </>
                        ) : (
                          "Confirmar y Analizar con IA"
                        )}
                      </button>
                    )}
                  </div>

                  {error && (
                    <div className="mt-3 p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] rounded-lg text-center">
                      {error}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* STEP 3: ANALYZED RESULT & CHAT */}
            {currentStep === "analyzed" && result && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full mx-auto">
                
                {/* Columna Izquierda: Visor del archivo original / Texto plano */}
                <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl flex flex-col h-[780px]">
                  <div className="flex border-b border-slate-800 mb-4">
                    <button
                      onClick={() => setSourceTab("doc")}
                      className={`pb-2 px-4 text-xs font-semibold border-b-2 transition-all ${
                        sourceTab === "doc"
                          ? "border-blue-500 text-blue-400"
                          : "border-transparent text-slate-400 hover:text-slate-300"
                      }`}
                    >
                      📄 Archivo Original
                    </button>
                    <button
                      onClick={() => setSourceTab("text")}
                      className={`pb-2 px-4 text-xs font-semibold border-b-2 transition-all ${
                        sourceTab === "text"
                          ? "border-blue-500 text-blue-400"
                          : "border-transparent text-slate-400 hover:text-slate-300"
                      }`}
                    >
                      📝 Texto Extraído
                    </button>
                  </div>
                  
                  <div className="flex-grow border border-slate-800 bg-slate-950/60 rounded-xl overflow-auto flex items-start justify-center relative">
                    {sourceTab === "doc" ? (
                      fileUrl ? (
                        file?.type === "application/pdf" || file?.name.toLowerCase().endsWith(".pdf") ? (
                          <iframe
                            src={getPdfUrl(fileUrl)}
                            className="w-full h-full border-none"
                            title="Visor PDF Análisis"
                          />
                        ) : file?.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(file?.name || "") ? (
                          <img
                            src={fileUrl}
                            alt="Vista previa del documento"
                            className="transition-all duration-200 object-contain p-2"
                            style={{
                              width: `${imageZoom * 100}%`,
                              height: 'auto',
                              maxHeight: 'none',
                              maxWidth: 'none',
                            }}
                          />
                        ) : (
                          <div className="text-center p-4 m-auto">
                            <svg className="w-12 h-12 text-slate-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-xs text-slate-400">Vista previa no disponible</p>
                            <p className="text-[10px] text-slate-600 mt-1">{file?.name}</p>
                          </div>
                        )
                      ) : (
                        <p className="text-xs text-slate-500 m-auto">Cargando visor...</p>
                      )
                    ) : (
                      <textarea
                        readOnly
                        value={rawText}
                        className="w-full h-full bg-transparent border-none p-4 text-xs font-mono text-slate-300 focus:outline-none leading-relaxed resize-none overflow-y-auto"
                      />
                    )}
                    
                    {/* Botones de zoom para imágenes */}
                    {sourceTab === "doc" && fileUrl && !(file?.type === "application/pdf" || file?.name.toLowerCase().endsWith(".pdf")) && (
                      <div className="absolute bottom-4 right-4 flex items-center gap-1 z-20 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-lg p-1.5 shadow-lg">
                        <button
                          onClick={() => setImageZoom(prev => Math.max(prev - 0.25, 0.5))}
                          className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition-colors"
                          title="Alejar"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs font-mono text-slate-300 min-w-[50px] text-center">
                          {Math.round(imageZoom * 100)}%
                        </span>
                        <button
                          onClick={() => setImageZoom(prev => Math.min(prev + 0.25, 3))}
                          className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition-colors"
                          title="Acercar"
                        >
                          +
                        </button>
                        <button
                          onClick={() => setImageZoom(1)}
                          className="ml-1 px-2 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-medium transition-colors"
                          title="Restaurar escala"
                        >
                          Reset
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Columna Derecha: Análisis y Chat */}
                <div className="lg:col-span-7 flex flex-col gap-6 h-[780px] overflow-y-auto pr-1">
                  
                  {/* Resumen Ejecutivo del Caso */}
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl flex flex-col justify-between shrink-0">
                    <div>
                      <h3 className="text-sm font-bold text-white mb-2">Resumen Ejecutivo del Caso</h3>
                      <p className="text-xs text-slate-300 leading-relaxed max-h-[120px] overflow-y-auto">{result.summary}</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-800/60">
                      <div>
                        <p className="text-[8px] text-slate-500 uppercase tracking-wider font-semibold">Expediente</p>
                        <p className="text-[11px] font-bold text-white truncate">{result.case_number || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-slate-500 uppercase tracking-wider font-semibold">Tribunal</p>
                        <p className="text-[11px] font-bold text-white truncate" title={result.court_name}>{result.court_name || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-slate-500 uppercase tracking-wider font-semibold">Asunto</p>
                        <p className="text-[11px] font-bold text-blue-400 truncate" title={result.crime_or_subject}>{result.crime_or_subject || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-slate-500 uppercase tracking-wider font-semibold">Fecha</p>
                        <p className="text-[11px] font-bold text-white truncate">{result.date || "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Entities */}
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl shrink-0">
                    <h3 className="text-sm font-bold text-white mb-3">Actores e Involucrados</h3>
                    {result.entities.length === 0 ? (
                      <p className="text-xs text-slate-500">No se identificaron actores clave.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {result.entities.map((entity, i) => (
                          <div key={i} className="bg-slate-950/50 border border-slate-800/80 p-3 rounded-xl">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-xs font-bold text-white truncate max-w-[140px]">{entity.name}</h4>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded border ${getRoleBadgeStyle(entity.role)}`}>
                                {getRoleLabel(entity.role)}
                              </span>
                            </div>
                            {entity.context && (
                              <p className="text-[10px] text-slate-400 mt-1 italic leading-relaxed truncate" title={entity.context}>
                                "{entity.context}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Acontecimientos Clave */}
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl shrink-0">
                    <h3 className="text-sm font-bold text-white mb-3">Acontecimientos Clave</h3>
                    <ul className="space-y-2">
                      {result.key_points.map((point, idx) => (
                        <li key={idx} className="flex gap-2 text-xs leading-relaxed text-slate-300">
                          <span className="flex-shrink-0 w-4.5 h-4.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-[10px]">
                            {idx + 1}
                          </span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Q&A CHAT INTERACTIVE PANEL (Ocultar para secretario digital) */}
                  {userRole !== "digital_secretary" ? (
                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl shadow-xl flex flex-col flex-grow min-h-[300px]">
                      <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2">
                        <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        <h3 className="text-xs font-bold text-white">Consultas del Expediente</h3>
                      </div>

                      {/* Message Box */}
                      <div className="flex-grow overflow-y-auto mb-3 p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3 min-h-[140px] max-h-[220px]">
                        {chatMessages.map((msg, i) => (
                          <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                                msg.sender === "user"
                                  ? "bg-blue-600 text-white rounded-tr-none"
                                  : "bg-slate-800/80 text-slate-200 border border-slate-700/60 rounded-tl-none"
                              }`}
                            >
                              {msg.text}
                            </div>
                          </div>
                        ))}
                        {isChatSending && (
                          <div className="flex justify-start">
                            <div className="bg-slate-800/80 text-slate-400 border border-slate-700/60 rounded-xl rounded-tl-none px-3 py-2 text-[10px] flex items-center gap-1.5">
                              <span className="flex gap-1">
                                <span className="w-1.5 h-1 bg-slate-400 rounded-full animate-bounce" />
                                <span className="w-1.5 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                                <span className="w-1.5 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                              </span>
                              Pensando...
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Chat Input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                          placeholder="Ej: ¿Cuáles son las pretensiones o qué pruebas hay?"
                          className="flex-grow bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                        <button
                          onClick={sendChatMessage}
                          disabled={isChatSending || !chatInput.trim()}
                          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 px-4 rounded-xl text-white font-semibold text-xs transition-all"
                        >
                          Enviar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl flex flex-col items-center justify-center gap-3 py-8 shrink-0">
                      <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <p className="text-xs text-slate-400 text-center max-w-[280px]">
                        Como **Secretario Digital**, tu rol es de digitalización y validación. Las consultas al chatbot están reservadas para los usuarios lectores y de tribunal.
                      </p>
                      {archiveId && !archiveId.includes("demo") && (
                        <button
                          onClick={() => validateDocumentDirectly(archiveId)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-600/20"
                        >
                          ✔️ Validar Definitivamente
                        </button>
                      )}
                    </div>
                  )}

                </div>

              </div>
            )}
          </>
        )}

        {/* VIEWMODE: ARCHIVE */}
        {viewMode === "archive" && (
          <div className="animate-fadeIn w-full">
            <h2 className="text-xl font-bold text-white mb-2">
              {showIncidentsTab && userRole === "digital_secretary" ? "⚠️ Incidentes Reportados (Abiertos)" : "🗄️ Archivero de Expedientes"}
            </h2>
            <p className="text-slate-400 text-xs mb-6">
              {showIncidentsTab && userRole === "digital_secretary"
                ? "Resuelve los incidentes marcados por las secretarias del tribunal."
                : "Visualiza y consulta los archivos físicos y textos guardados en la base de datos."}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full mx-auto">
              {/* Columna Izquierda: Lista de Archivos / Lista de Incidentes */}
              <div className="lg:col-span-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl flex flex-col h-[780px]">
                {!showIncidentsTab || userRole !== "digital_secretary" ? (
                  <>
                    <div className="mb-4">
                      <input
                        type="text"
                        value={archiveSearch}
                        onChange={(e) => setArchiveSearch(e.target.value)}
                        placeholder="Buscar en el archivero..."
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div className="flex-grow overflow-y-auto space-y-2 pr-1">
                      {isLoadingArchive ? (
                        <div className="text-center py-12">
                          <svg className="animate-spin h-6 w-6 text-blue-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <p className="text-xs text-slate-500">Cargando archivos...</p>
                        </div>
                      ) : archiveList.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-12">No hay archivos en el archivero.</p>
                      ) : (
                        [...archiveList]
                          .filter(item => item.filename.toLowerCase().includes(archiveSearch.toLowerCase()))
                          .sort((a, b) => {
                            if (a.status === 'incident' && b.status !== 'incident') return -1;
                            if (a.status !== 'incident' && b.status === 'incident') return 1;
                            return b.timestamp - a.timestamp;
                          })
                          .map((item) => (
                            <div
                              key={item.id}
                              onClick={() => {
                                selectArchiveItem(item);
                                setSelectedIncident(null);
                              }}
                              className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                                selectedArchiveItem?.id === item.id
                                  ? "border-blue-500 bg-blue-500/10 text-white"
                                  : "border-slate-800/80 hover:border-slate-700 bg-slate-950/40 text-slate-300"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold truncate max-w-[180px]" title={item.filename}>{item.filename}</p>
                                {item.status === 'validated' && <span className="text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold uppercase">Validado</span>}
                                {item.status === 'incident' && <span className="text-[8px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded font-bold uppercase">Incidente</span>}
                              </div>
                              <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
                                <span>{(item.size / 1024 / 1024).toFixed(2)} MB</span>
                                <span>{new Date(item.timestamp * 1000).toLocaleDateString()}</span>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Reportes de Fallos</h3>
                    <div className="flex-grow overflow-y-auto space-y-2 pr-1">
                      {incidentsList.filter(i => i.status === 'open').length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-12">No hay incidentes reportados sin resolver.</p>
                      ) : (
                        incidentsList
                          .filter(i => i.status === 'open')
                          .map((inc) => (
                            <div
                              key={inc.id}
                              onClick={() => {
                                setSelectedIncident(inc);
                                selectArchiveItem({
                                  id: inc.document_id,
                                  filename: inc.filename,
                                  file_url: `http://localhost:8000/api/files/${inc.document_id}`,
                                  size: 0
                                });
                              }}
                              className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                                selectedIncident?.id === inc.id
                                  ? "border-rose-500 bg-rose-500/10 text-white"
                                  : "border-slate-800/80 hover:border-slate-700 bg-slate-950/40 text-slate-300"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[8px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded font-bold uppercase">Abierto</span>
                                <span className="text-[9px] text-slate-500">{new Date(inc.created_at).toLocaleDateString()}</span>
                              </div>
                              <p className="text-xs font-semibold truncate mt-1.5" title={inc.filename}>{inc.filename}</p>
                              <p className="text-[10px] text-slate-400 mt-1 italic truncate">"{inc.note}"</p>
                            </div>
                          ))
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Columna Derecha: Detalle del Archivo Seleccionado */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                {selectedArchiveItem ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[780px]">
                    {/* Visualización del Archivo */}
                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl flex flex-col h-full">
                      <h3 className="text-xs font-bold text-white mb-2">Archivo Original</h3>
                      <div className="flex-grow border border-slate-800 bg-slate-950/60 rounded-xl overflow-auto flex items-start justify-center relative">
                        {selectedArchiveItem.filename.toLowerCase().endsWith(".pdf") ? (
                          <iframe
                            src={getPdfUrl(selectedArchiveItem.file_url)}
                            className="w-full h-full border-none"
                            title="Visor PDF Archivo"
                          />
                        ) : /\.(jpg|jpeg|png|webp|gif)$/i.test(selectedArchiveItem.filename) ? (
                          <img
                            src={selectedArchiveItem.file_url}
                            alt="Visualización de archivo"
                            className="transition-all duration-200 object-contain p-2"
                            style={{
                              width: `${imageZoom * 100}%`,
                              height: 'auto',
                              maxHeight: 'none',
                              maxWidth: 'none',
                            }}
                          />
                        ) : (
                          <div className="text-center p-4 m-auto">
                            <svg className="w-12 h-12 text-slate-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-xs text-slate-400">Vista previa no disponible para este formato</p>
                            <p className="text-[10px] text-slate-600 mt-1">{selectedArchiveItem.filename}</p>
                          </div>
                        )}

                        {/* Controles de zoom para imágenes en el archivero */}
                        {selectedArchiveItem && !(selectedArchiveItem.filename.toLowerCase().endsWith(".pdf")) && (
                          <div className="absolute bottom-4 right-4 flex items-center gap-1 z-20 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-lg p-1.5 shadow-lg">
                            <button
                              onClick={() => setImageZoom(prev => Math.max(prev - 0.25, 0.5))}
                              className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition-colors"
                              title="Alejar"
                            >
                              -
                            </button>
                            <span className="px-2 text-xs font-mono text-slate-300 min-w-[50px] text-center">
                              {Math.round(imageZoom * 100)}%
                            </span>
                            <button
                              onClick={() => setImageZoom(prev => Math.min(prev + 0.25, 3))}
                              className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition-colors"
                              title="Acercar"
                            >
                              +
                            </button>
                            <button
                              onClick={() => setImageZoom(1)}
                              className="ml-1 px-2 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-medium transition-colors"
                              title="Restaurar escala"
                            >
                              Reset
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Visualización y Edición de Texto */}
                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl flex flex-col h-full">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xs font-bold text-white">Texto Plano Extraído</h3>
                        <span className="text-[9px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                          {userRole === "digital_secretary" ? "Editable" : "Solo Lectura"}
                        </span>
                      </div>
                      {selectedArchiveItem.status === 'incident' && (
                        <div className="mb-2.5 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] rounded-xl text-left font-medium leading-normal">
                          <p className="font-bold mb-1">⚠️ INCIDENTE REPORTADO POR EL TRIBUNAL:</p>
                          <p className="italic">"{incidentsList.find(i => i.document_id === selectedArchiveItem.id && i.status === 'open')?.note || "Sin nota descriptiva"}"</p>
                        </div>
                      )}
                      <textarea
                        value={archiveItemText}
                        readOnly={userRole !== "digital_secretary"}
                        onChange={(e) => setArchiveItemText(e.target.value)}
                        className="flex-grow w-full bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 leading-relaxed resize-none overflow-y-auto"
                        placeholder="Cargando texto del archivo..."
                      />

                      <div className="mt-4 flex gap-2 justify-end">
                        {userRole === "digital_secretary" && (
                          <>
                            {archiveItemText !== originalArchiveItemText && (
                              <button
                                onClick={analyzeArchiveItem}
                                disabled={isAnalyzing || !archiveItemText.trim()}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 shadow-lg shadow-blue-600/20 transition-all flex items-center gap-1.5"
                              >
                                {isAnalyzing ? "Guardando..." : "💾 Guardar Cambios"}
                              </button>
                            )}
                            {archiveItemText === originalArchiveItemText && selectedArchiveItem.status === 'incident' && (
                              <button
                                onClick={() => {
                                  const inc = incidentsList.find(i => i.document_id === selectedArchiveItem.id && i.status === 'open');
                                  if (inc) {
                                    handleResolveIncident(inc.id);
                                  }
                                }}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5"
                              >
                                ✔️ Resolver Incidente (Validar)
                              </button>
                            )}
                          </>
                        )}
                        {userRole === "court_secretary" && (
                          <button
                            onClick={() => {
                              setShowIncidentModal(true);
                            }}
                            disabled={selectedArchiveItem.status === 'incident'}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-rose-600/20 transition-all flex items-center gap-1.5"
                          >
                            {selectedArchiveItem.status === 'incident' ? "⚠️ Incidente Reportado" : "⚠️ Reportar Incidente (Fallo OCR)"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 backdrop-blur-xl text-center flex flex-col items-center justify-center h-[780px]">
                    <svg className="w-16 h-16 text-slate-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h5l2 2h9a2 2 0 012 2v8a2 2 0 01-2 2H5z" />
                    </svg>
                    <h3 className="text-sm font-semibold text-white mb-1">Ningún archivo seleccionado</h3>
                    <p className="text-xs text-slate-500">Selecciona un expediente de la lista de la izquierda para ver su contenido y opciones.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEWMODE: SEARCH */}
        {viewMode === "search" && (
          <div className="animate-fadeIn w-full">
            <h2 className="text-xl font-bold text-white mb-2">🔍 Buscador de Causas (Base de Datos)</h2>
            <p className="text-slate-400 text-xs mb-6">
              Busca causas judiciales de forma segura por cédula de identidad, número de caso o nombre del imputado/víctima.
            </p>

            <div className="max-w-2xl mx-auto mb-8">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchCausas(searchQuery)}
                  placeholder="Introduce Cédula, Nombre o Número de Expediente..."
                  className="flex-grow bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  onClick={() => searchCausas(searchQuery)}
                  disabled={isSearchingCausas || !searchQuery.trim()}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 px-6 rounded-xl text-white font-semibold text-sm transition-all flex items-center gap-2"
                >
                  {isSearchingCausas ? "Buscando..." : "Buscar"}
                </button>
              </div>
            </div>

            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full mx-auto">
                {/* Lista de Resultados */}
                <div className="lg:col-span-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl flex flex-col h-[650px] overflow-y-auto space-y-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Resultados Encontrados ({searchResults.length})</h3>
                  {searchResults.map((causa) => (
                    <div
                      key={causa.id}
                      onClick={async () => {
                        setSelectedCausa(causa);
                        setRawText(causa.content);
                        setFileUrl(causa.file_url || `http://localhost:8000/api/files/${causa.id}`);
                        setFile({
                          name: causa.filename,
                          size: 0,
                          type: causa.filename.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/png"
                        } as any);
                        setShowChatbot(false);
                        setSearchAnalysisResult(null);
                        try {
                          const res = await fetch(`http://localhost:8000/api/documents/${causa.id}/analysis`);
                          if (res.ok) {
                            const data = await res.json();
                            setSearchAnalysisResult(data);
                          }
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        selectedCausa?.id === causa.id
                          ? "border-blue-500 bg-blue-500/10 text-white"
                          : "border-slate-800/80 hover:border-slate-700 bg-slate-950/40 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-blue-400">{causa.case_number || "Sin Expediente"}</span>
                        <span className="text-[9px] text-slate-500">{causa.date || "Sin Fecha"}</span>
                      </div>
                      <p className="text-xs font-semibold mt-1 truncate" title={causa.filename}>{causa.filename}</p>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{causa.summary}</p>
                    </div>
                  ))}
                </div>

                {/* Detalle del Expediente Seleccionado */}
                <div className="lg:col-span-8">
                  {selectedCausa ? (
                    <div className="flex flex-col gap-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[550px]">
                        {/* Archivo Original */}
                        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl flex flex-col h-full">
                          <h3 className="text-xs font-bold text-white mb-2">Archivo Original</h3>
                          <div className="flex-grow border border-slate-800 bg-slate-950/60 rounded-xl overflow-auto flex items-start justify-center relative">
                            {selectedCausa.filename.toLowerCase().endsWith(".pdf") ? (
                              <iframe
                                src={getPdfUrl(`http://localhost:8000/api/files/${selectedCausa.id}`)}
                                className="w-full h-full border-none"
                                title="Visor PDF Causa"
                              />
                            ) : (
                              <img
                                src={`http://localhost:8000/api/files/${selectedCausa.id}`}
                                alt="Visualización de causa"
                                className="object-contain p-2 w-full h-full"
                              />
                            )}
                          </div>
                        </div>

                        {/* Texto Plano */}
                        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl flex flex-col h-full">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="text-xs font-bold text-white">Texto Plano del Expediente</h3>
                            <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">Solo lectura</span>
                          </div>
                          <textarea
                            readOnly
                            value={selectedCausa.content}
                            className="flex-grow w-full bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 focus:outline-none leading-relaxed resize-none overflow-y-auto"
                          />
                        </div>
                      </div>

                      {/* Ficha Resumen de la IA (Si ya fue analizado) */}
                      {searchAnalysisResult && (
                        <div className="flex flex-col gap-6">
                          {/* Metadatos Básicos */}
                          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl shrink-0">
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="text-sm font-bold text-white">Ficha de Resumen Judicial (Procesado por IA)</h3>
                              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold uppercase">Completado</span>
                            </div>
                            
                            <div className="mb-4">
                              <h4 className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">Resumen Ejecutivo del Caso</h4>
                              <p className="text-xs text-slate-300 leading-relaxed">{searchAnalysisResult.summary}</p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-850 pt-4">
                              <div>
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Expediente</span>
                                <p className="text-[11px] font-bold text-white truncate">{searchAnalysisResult.case_number || "N/A"}</p>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Tribunal</span>
                                <p className="text-[11px] font-bold text-white truncate" title={searchAnalysisResult.court_name}>{searchAnalysisResult.court_name || "N/A"}</p>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Asunto</span>
                                <p className="text-[11px] font-bold text-blue-400 truncate" title={searchAnalysisResult.crime_or_subject}>{searchAnalysisResult.crime_or_subject || "N/A"}</p>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Fecha</span>
                                <p className="text-[11px] font-bold text-white truncate">{searchAnalysisResult.date || "N/A"}</p>
                              </div>
                            </div>
                          </div>

                          {/* Actores e Involucrados */}
                          {searchAnalysisResult.entities && searchAnalysisResult.entities.length > 0 && (
                            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl shrink-0">
                              <h3 className="text-xs font-bold text-white mb-3">Actores e Involucrados</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {searchAnalysisResult.entities.map((entity: any, i: number) => (
                                  <div key={i} className="bg-slate-950/50 border border-slate-800/80 p-3 rounded-xl">
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <h4 className="text-xs font-bold text-white truncate max-w-[140px]">{entity.name}</h4>
                                        {entity.cedula && <p className="text-[9px] text-slate-500">C.I.: {entity.cedula}</p>}
                                      </div>
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded border ${getRoleBadgeStyle(entity.role)}`}>
                                        {getRoleLabel(entity.role)}
                                      </span>
                                    </div>
                                    {entity.context && (
                                      <p className="text-[10px] text-slate-400 mt-1 italic leading-relaxed truncate" title={entity.context}>
                                        "{entity.context}"
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Acontecimientos Clave */}
                          {searchAnalysisResult.key_points && searchAnalysisResult.key_points.length > 0 && (
                            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl shrink-0">
                              <h3 className="text-xs font-bold text-white mb-3">Acontecimientos Clave</h3>
                              <ul className="space-y-2">
                                {searchAnalysisResult.key_points.map((point: string, idx: number) => (
                                  <li key={idx} className="flex gap-2 text-xs leading-relaxed text-slate-300">
                                    <span className="flex-shrink-0 w-4.5 h-4.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-[10px]">
                                      {idx + 1}
                                    </span>
                                    <span>{point}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Botón para habilitar Q&A con IA (Solo para Abogado Lector) */}
                      {userRole === "reader_user" && (
                        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-sm font-bold text-white">¿Deseas consultar sobre esta causa?</h3>
                              <p className="text-xs text-slate-400">Pregúntale al Asistente IA sobre los involucrados, cargos o fechas de este documento.</p>
                            </div>
                            <button
                              onClick={() => setShowChatbot(!showChatbot)}
                              className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold text-xs px-6 py-2.5 rounded-xl transition-all shadow-md shadow-blue-600/20"
                            >
                              {showChatbot ? "Cerrar Chatbot" : "💬 Consultar a la IA"}
                            </button>
                          </div>

                          {showChatbot && (
                            <div className="mt-6 border-t border-slate-850 pt-6">
                              <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-4 flex flex-col h-72">
                                <div className="flex-grow overflow-y-auto space-y-3 mb-3 p-1">
                                  {chatMessages.length === 0 && (
                                    <p className="text-xs text-slate-500 italic text-center py-12">
                                      Pregunta algo sobre el expediente (ej: ¿quién es el Juez de la causa?).
                                    </p>
                                  )}
                                  {chatMessages.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                                      <div
                                        className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                                          msg.sender === "user"
                                            ? "bg-blue-600 text-white rounded-tr-none"
                                            : "bg-slate-800/80 text-slate-200 border border-slate-700/60 rounded-tl-none"
                                        }`}
                                      >
                                        {msg.text}
                                      </div>
                                    </div>
                                  ))}
                                  {isChatSending && (
                                    <div className="flex justify-start">
                                      <div className="bg-slate-800/80 text-slate-400 border border-slate-700/60 rounded-xl rounded-tl-none px-3 py-2 text-[10px] flex items-center gap-1.5">
                                        <span className="flex gap-1">
                                          <span className="w-1.5 h-1 bg-slate-400 rounded-full animate-bounce" />
                                          <span className="w-1.5 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                                          <span className="w-1.5 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                                        </span>
                                        Buscando respuesta...
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                                    placeholder="Escribe tu consulta..."
                                    className="flex-grow bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                                  />
                                  <button
                                    onClick={sendChatMessage}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-xl text-xs font-semibold"
                                  >
                                    Enviar
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center h-[550px] flex flex-col items-center justify-center">
                      <svg className="w-16 h-16 text-slate-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <h3 className="text-sm font-semibold text-white mb-1">Causa no seleccionada</h3>
                      <p className="text-xs text-slate-500">Selecciona un expediente de la lista izquierda para visualizarlo.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/20 border border-slate-800/60 rounded-2xl p-12 text-center max-w-lg mx-auto mt-8">
                <p className="text-xs text-slate-500">
                  Introduce una búsqueda para listar las causas asociadas por cédula o expediente desde la base de datos de Postgres.
                </p>
              </div>
            )}
          </div>
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


