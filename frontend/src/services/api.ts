import { JudicialFileAnalysis, ChatMessage } from "../types";

export const api = {
  login: async (backendUrl: string, email: string, password: string): Promise<{ name: string; email: string; role: string }> => {
    const response = await fetch(`${backendUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Credenciales incorrectas.");
    }
    return response.json();
  },

  runOcr: async (backendUrl: string, file: File, ocrMode: string): Promise<{ text: string; id: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", ocrMode);

    const response = await fetch(`${backendUrl}/api/ocr`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Error al procesar el archivo mediante OCR.");
    }
    return response.json();
  },

  analyzeText: async (backendUrl: string, text: string, archiveId: string | null): Promise<JudicialFileAnalysis> => {
    const response = await fetch(`${backendUrl}/api/analyze-text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, id: archiveId }),
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Error en el servidor al analizar el texto.");
    }
    return response.json();
  },

  sendChatQuery: async (backendUrl: string, documentText: string, question: string, caseNumber?: string | null): Promise<{ answer: string }> => {
    const response = await fetch(`${backendUrl}/api/chat-query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        document_text: documentText,
        question: question,
        case_number: caseNumber || undefined,
      }),
    });
    if (!response.ok) {
      throw new Error("Error al consultar a la IA.");
    }
    return response.json();
  },

  validateDocument: async (backendUrl: string, id: string): Promise<void> => {
    const response = await fetch(`${backendUrl}/api/documents/${id}/validate`, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error("Error al validar el documento.");
    }
  },

  submitIncident: async (backendUrl: string, id: string, note: string): Promise<void> => {
    const response = await fetch(`${backendUrl}/api/incidents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ document_id: id, note }),
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Error al registrar el reporte.");
    }
  },

  fetchIncidents: async (backendUrl: string): Promise<any[]> => {
    const response = await fetch(`${backendUrl}/api/incidents`);
    if (!response.ok) {
      throw new Error("Error al cargar incidentes");
    }
    return response.json();
  },

  resolveIncident: async (backendUrl: string, incidentId: number): Promise<void> => {
    const response = await fetch(`${backendUrl}/api/incidents/${incidentId}/resolve`, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error("Error al resolver incidente");
    }
  },

  saveArchiveText: async (backendUrl: string, id: string, text: string): Promise<void> => {
    const response = await fetch(`${backendUrl}/api/archive/${id}/text`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      throw new Error("Error al guardar el texto.");
    }
  },

  searchCausas: async (backendUrl: string, query: string, role?: string): Promise<any[]> => {
    const roleParam = role ? `&role=${encodeURIComponent(role)}` : "";
    const response = await fetch(`${backendUrl}/api/search?q=${encodeURIComponent(query)}${roleParam}`);
    if (!response.ok) {
      throw new Error("Error al buscar causas");
    }
    return response.json();
  },

  fetchArchiveList: async (backendUrl: string): Promise<any[]> => {
    const response = await fetch(`${backendUrl}/api/archive`);
    if (!response.ok) {
      throw new Error("Error al obtener la lista del archivero.");
    }
    return response.json();
  },

  fetchArchiveItemText: async (backendUrl: string, id: string): Promise<string> => {
    const response = await fetch(`${backendUrl}/api/archive/${id}/text`);
    if (!response.ok) {
      throw new Error("Error al obtener el texto del documento.");
    }
    const data = await response.json();
    return data.text;
  },

  fetchDocumentAnalysis: async (backendUrl: string, id: string): Promise<any> => {
    const response = await fetch(`${backendUrl}/api/documents/${id}/analysis`);
    if (!response.ok) {
      throw new Error("Error al cargar el análisis del documento.");
    }
    return response.json();
  },
};
