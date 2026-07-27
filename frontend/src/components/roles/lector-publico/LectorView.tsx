"use client";

import { useLibra } from "../../../hooks/useLibra";
import { getRoleBadgeStyle, getRoleLabel } from "@/types";
import { useState, useEffect } from "react";

type LibraHookState = ReturnType<typeof useLibra>;

interface LectorViewProps {
  state: LibraHookState;
}

export const LectorView = ({ state }: LectorViewProps) => {
  const getLightRoleBadgeStyle = (role: string) => {
    switch (role.toLowerCase()) {
      case "juez": return "bg-purple-100 text-purple-700 border-purple-200 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.05)]";
      case "víctima":
      case "demandante": return "bg-emerald-100 text-emerald-700 border-emerald-200 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.05)]";
      case "agresor":
      case "demandado": return "bg-rose-100 text-rose-700 border-rose-200 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.05)]";
      case "abogado_defensor":
      case "abogado_acusador": return "bg-blue-100 text-blue-700 border-blue-200 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.05)]";
      case "testigo": return "bg-amber-100 text-amber-700 border-amber-200 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.05)]";
      default: return "bg-slate-200 text-slate-700 border-slate-300 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.05)]";
    }
  };

  const {
    searchQuery,
    setSearchQuery,
    searchCausasAction,
    searchResults,
    isSearchingCausas,
  } = state;

  const [hasSearched, setHasSearched] = useState(false);
  const [selectedCase, setSelectedCase] = useState<any | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSelectedCase(null);
    await searchCausasAction(searchQuery);
    setHasSearched(true);
  };

  // Reset selected case if results change
  useEffect(() => {
    if (searchResults.length > 0) {
      setSelectedCase(searchResults[0]);
    } else {
      setSelectedCase(null);
    }
  }, [searchResults]);

  return (
    // Agregamos el fondo e2e8f0 para que coincida con el neumorfismo del sistema
    <div className="min-h-[calc(100vh-64px)] w-full bg-[#e2e8f0] py-8 px-4 animate-fadeIn flex flex-col items-center">
      <div className="w-full max-w-6xl">
        
        {/* Hero Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight text-[#1E293B] mb-2">
            Buscador de Involucrados en Causas Judiciales
          </h1>
          <p className="text-xs text-slate-500 max-w-xl mx-auto leading-relaxed">
            Consulta ciudadana para verificar si una persona natural figura en algún expediente judicial activo. Por motivos de privacidad y reserva legal, solo se muestra el rol del involucrado.
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex flex-col sm:flex-row gap-3 p-3 rounded-[1.5rem] neu-base">
            <div className="flex-grow relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Escribe el nombre completo o cédula de la persona..."
                className="w-full neu-pressed pl-12 pr-4 py-3.5 text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none rounded-xl transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isSearchingCausas}
              className="sm:w-40 neu-button-dark text-xs font-bold py-3.5 px-6 rounded-xl transition-all disabled:opacity-50"
            >
              {isSearchingCausas ? "Buscando..." : "Buscar Registro"}
            </button>
          </div>
        </form>

        {/* Results / Empty States */}
        <div className="neu-base rounded-[1.5rem] p-6 min-h-[400px] flex flex-col justify-stretch relative z-10">
          {isSearchingCausas ? (
            <div className="flex flex-col items-center justify-center py-20 flex-grow">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-700 rounded-full animate-spin mb-4" />
              <p className="text-xs text-slate-500">Buscando en los registros judiciales...</p>
            </div>
          ) : !hasSearched ? (
            <div className="text-center py-20 max-w-md mx-auto flex-grow flex flex-col justify-center items-center">
              <div className="w-24 h-24 mb-3 rounded-full neu-pressed flex items-center justify-center transition-all hover:shadow-[inset_6px_6px_12px_#c5cbd2,inset_-6px_-6px_12px_#ffffff]">
                <svg className="w-10 h-10 text-slate-500 drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-[#1E293B] mb-2 tracking-tight">Consulta de Registros</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Introduce el nombre completo o número de cédula para consultar las coincidencias. Los resultados respetan la normativa de protección de datos personales.
              </p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-20 max-w-md mx-auto flex-grow flex flex-col justify-center items-center">
              <div className="w-24 h-24 mb-3 rounded-full neu-pressed flex items-center justify-center transition-all hover:shadow-[inset_6px_6px_12px_#c5cbd2,inset_-6px_-6px_12px_#ffffff]">
                <svg className="w-10 h-10 text-slate-500 drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-[#1E293B] mb-2 tracking-tight">Sin Coincidencias</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                No se encontraron expedientes con personas con ese nombre o cédula participando en expedientes judiciales validados y activos.
              </p>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-6 flex-grow">
              {/* Panel Izquierdo: Lista de Expedientes */}
              <div className="w-full lg:w-[45%] flex flex-col lg:pr-6 relative">
                <div className="flex items-center justify-between mb-4 pb-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Expedientes Encontrados ({searchResults.length})
                  </h2>
                </div>
                <div className="space-y-3 overflow-y-auto max-h-[450px] pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                  {searchResults.map((causa: any) => {
                    const isSelected = selectedCase?.id === causa.id;
                    return (
                      <div
                        key={causa.id}
                        onClick={() => setSelectedCase(causa)}
                        className={`p-4 rounded-xl text-left cursor-pointer transition-all ${
                          isSelected
                            ? "bg-[#1e293b] text-white shadow-[inset_4px_4px_8px_rgba(0,0,0,0.4),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] border-transparent"
                            : "neu-base-sm hover:shadow-[4px_4px_8px_#c5cbd2,-4px_-4px_8px_#ffffff] text-slate-700"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm opacity-80">📁</span>
                            <span className="text-xs font-bold font-mono">
                              {causa.case_number || "Sin Expediente"}
                            </span>
                          </div>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                            isSelected 
                              ? "bg-slate-700/80 text-slate-200 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.3)]" 
                              : "bg-blue-100 text-blue-700 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]"
                          }`}>
                            {causa.entities?.length || 0} {causa.entities?.length === 1 ? "coincidencia" : "coincidencias"}
                          </span>
                        </div>
                        <p className={`text-[11px] mb-1.5 truncate ${isSelected ? "text-slate-300 font-medium" : "text-slate-500"}`}>
                          {causa.court_name || "Tribunal General"}
                        </p>
                        <div className={`flex items-center justify-between text-[9px] ${isSelected ? "text-slate-400" : "text-slate-400"}`}>
                          <span>{causa.crime_or_subject || "Materia Civil"}</span>
                          <span>{causa.date || "Sin Fecha"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Panel Derecho: Detalle de los Involucrados Coincidentes */}
              <div className="flex-1 flex flex-col pl-2 border-l border-slate-300/30 ml-4 lg:ml-0 lg:pl-6">
                <div className="flex items-center justify-between mb-4 pb-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Detalle del Involucrado Coincidente
                  </h2>
                </div>

                {selectedCase ? (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="neu-pressed-sm rounded-xl p-4 mb-4">
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Expediente Asociado</p>
                      <h3 className="text-xs font-bold text-slate-800 font-mono">{selectedCase.case_number}</h3>
                    </div>

                    <div className="space-y-4">
                      {selectedCase.entities?.map((entity: any, idx: number) => (
                        <div
                          key={idx}
                          className="neu-base-sm rounded-2xl p-5 relative overflow-hidden"
                        >
                          <div className="flex flex-col gap-4 relative z-10">
                            <div>
                              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">Nombre Completo</p>
                              <p className="text-sm font-bold text-[#1E293B] capitalize">{entity.name}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">Cédula</p>
                                <p className="text-xs text-slate-600 font-mono">{entity.cedula || "No registrada"}</p>
                              </div>
                              <div>
                                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">Rol en el Expediente</p>
                                <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border mt-0.5 ${getLightRoleBadgeStyle(entity.role)}`}>
                                  {getRoleLabel(entity.role)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex-grow flex items-center justify-center text-center p-8 neu-pressed rounded-2xl">
                    <p className="text-xs text-slate-500 font-medium italic opacity-70">
                      Selecciona un expediente de la lista izquierda para visualizar a los involucrados.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};