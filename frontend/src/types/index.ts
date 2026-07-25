export interface Entity {
  name: string;
  role: string;
  context?: string;
  cedula?: string;
}

export interface JudicialFileAnalysis {
  case_number?: string;
  court_name?: string;
  date?: string;
  crime_or_subject?: string;
  summary: string;
  entities: Entity[];
  key_points: string[];
}

export interface ChatMessage {
  sender: "user" | "ai";
  text: string;
}

export type UserRole = "digital_secretary" | "court_secretary" | "reader_user" | "abogado";

export const getRoleBadgeStyle = (role: string) => {
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

export const getRoleLabel = (role: string) => {
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
