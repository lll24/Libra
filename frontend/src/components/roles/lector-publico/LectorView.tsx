"use client";

import { useLibra } from "../../../hooks/useLibra";
import { getRoleBadgeStyle, getRoleLabel } from "@/types";
import { useState, useEffect } from "react";

type LibraHookState = ReturnType<typeof useLibra>;

interface LectorViewProps {
  state: LibraHookState;
}

export const LectorView = ({ state }: LectorViewProps) => {
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
    <div className="max-w-6xl mx-auto py-8 px-4 animate-fadeIn">
      {/* Hero Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black tracking-tight text-white mb-2 bg-gradient-to-r from-blue-400 via-indigo-200 to-purple-400 bg-clip-text text-transparent">
          Buscador de Involucrados en Causas Judiciales
        </h1>
        <p className="text-xs text-slate-400 max-w-xl mx-auto leading-relaxed">
          Consulta ciudadana para verificar si una persona natural figura en algún expediente judicial activo. Por motivos de privacidad y reserva legal, solo se muestra el rol del involucrado.
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex flex-col sm:flex-row gap-3 p-2 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-2xl backdrop-blur-md">
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
              className="w-full bg-transparent pl-12 pr-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none rounded-xl"
            />
          </div>
          <button
            type="submit"
            disabled={isSearchingCausas}
            className="sm:w-36 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/25 transition-all disabled:opacity-50"
          >
            {isSearchingCausas ? "Buscando..." : "Buscar Registro"}
          </button>
        </div>
      </form>

      {/* Results / Empty States */}
      <div className="surface-card border border-slate-800 rounded-2xl p-6 shadow-xl bg-slate-900/30 backdrop-blur-sm min-h-[400px] flex flex-col justify-stretch">
        {isSearchingCausas ? (
          <div className="flex flex-col items-center justify-center py-20 flex-grow">
            <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
            <p className="text-xs text-slate-400">Buscando en los registros judiciales...</p>
          </div>
        ) : !hasSearched ? (
          <div className="text-center py-20 max-w-md mx-auto flex-grow flex flex-col justify-center">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-sm font-bold text-slate-300 mb-2">Consulta de Registros</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Introduce el nombre completo o número de cédula para consultar las coincidencias. Los resultados respetan la normativa de protección de datos personales.
            </p>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="text-center py-20 max-w-md mx-auto flex-grow flex flex-col justify-center">
            <div className="text-4xl mb-4">ℹ️</div>
            <h3 className="text-sm font-bold text-slate-300 mb-2">Sin Coincidencias</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              No se encontraron expedientes con personas con ese nombre o cédula participando en expedientes judiciales validados y activos.
            </p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 flex-grow">
            {/* Panel Izquierdo: Lista de Expedientes */}
            <div className="w-full lg:w-[45%] flex flex-col border-r border-slate-800/60 lg:pr-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/60">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Expedientes Encontrados ({searchResults.length})
                </h2>
              </div>
              <div className="space-y-3 overflow-y-auto max-h-[450px] pr-2 scrollbar-thin scrollbar-thumb-slate-800">
                {searchResults.map((causa: any) => {
                  const isSelected = selectedCase?.id === causa.id;
                  return (
                    <div
                      key={causa.id}
                      onClick={() => setSelectedCase(causa)}
                      className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? "border-blue-500/50 bg-blue-500/10 text-white shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                          : "border-slate-800 hover:border-slate-700 bg-slate-950/20 text-slate-300"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">📁</span>
                          <span className="text-xs font-bold font-mono">
                            {causa.case_number || "Sin Expediente"}
                          </span>
                        </div>
                        <span className="text-[9px] bg-blue-500/15 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold">
                          {causa.entities?.length || 0} {causa.entities?.length === 1 ? "coincidencia" : "coincidencias"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mb-1.5 truncate">
                        {causa.court_name || "Tribunal General"}
                      </p>
                      <div className="flex items-center justify-between text-[9px] text-slate-500">
                        <span>{causa.crime_or_subject || "Materia Civil"}</span>
                        <span>{causa.date || "Sin Fecha"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Panel Derecho: Detalle de los Involucrados Coincidentes */}
            <div className="flex-1 flex flex-col pl-2">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/60">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Detalle del Involucrado Coincidente
                </h2>
              </div>

              {selectedCase ? (
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-4 mb-4">
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Expediente Asociado</p>
                    <h3 className="text-xs font-bold text-white font-mono">{selectedCase.case_number}</h3>
                  </div>

                  <div className="space-y-4">
                    {selectedCase.entities?.map((entity: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden"
                      >
                        {/* Glow decorativo del rol */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
                        
                        <div className="flex flex-col gap-4">
                          <div>
                            <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-1">Nombre Completo</p>
                            <p className="text-sm font-bold text-white capitalize">{entity.name}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-1">Cédula</p>
                              <p className="text-xs text-slate-300 font-mono">{entity.cedula || "No registrada"}</p>
                            </div>
                            <div>
                              <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-1">Rol en el Expediente</p>
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border mt-0.5 ${getRoleBadgeStyle(entity.role)}`}>
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
                <div className="flex-grow flex items-center justify-center text-center p-8 border border-dashed border-slate-800 rounded-2xl">
                  <p className="text-xs text-slate-500 italic">
                    Selecciona un expediente de la lista izquierda para visualizar a los involucrados.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
