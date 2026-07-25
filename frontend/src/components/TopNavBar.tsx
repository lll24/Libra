import React from 'react';

interface TopNavBarProps {
    userRole: string;
    setUserRole: (role: any) => void;
    viewMode: string;
    setViewMode: (mode: any) => void;
    currentStep: string;
    resetWorkflow: () => void;
    setShowIncidentsTab: (show: boolean) => void;
    fetchArchiveList: () => void;
    searchCausasAction: (query: string) => void;
    setError: (err: string | null) => void;
}

export default function TopNavBar({
    userRole,
    setUserRole,
    viewMode,
    setViewMode,
    currentStep,
    resetWorkflow,
    setShowIncidentsTab,
    fetchArchiveList,
    searchCausasAction,
    setError,
}: TopNavBarProps) {
    return (
        <header className="bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/70 sticky top-0 z-50 h-[56px] w-full flex items-center justify-between px-6 shadow-sm shadow-slate-950/50 transition-colors duration-300">

            {/* Sección Izquierda: Logo (Imagen) y Textos */}
            <div className="flex items-center gap-3">
                {/* Contenedor para el Logo - Más pequeño */}
                <div className="w-8 h-8 rounded-full border border-slate-600/50 flex items-center justify-center shrink-0 overflow-hidden bg-[#152347] shadow-inner">
                    <img
                        src="/4-nbg.jpg"
                        alt="Logo Libra"
                        className="w-full h-full object-cover"
                    />
                </div>

                <div className="flex flex-col justify-center">
                    <h1 className="text-[#c5ae73] font-bold text-[15px] tracking-wide leading-none font-title">
                        LIBRA
                    </h1>
                    <p className="text-slate-400 text-[10px] font-normal leading-tight font-sans mt-[2px]">
                        Expedientes Judiciales Digitales
                    </p>
                </div>
            </div>

            {/* Seccion Derecha: Botones y Rol */}
            <div className="flex items-center gap-4">

                {/* Botones eliminados para Secretaria de Tribunal según solicitud */}

                {/* Selector de Rol (Temporal) */}
                <div className="relative group">
                    {/* Botón más compacto */}
                    <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-800/80 hover:border-slate-700 transition-all duration-300 rounded-full px-3 py-1 cursor-pointer shadow-lg shadow-slate-950/20">
                        {/* Icono de Usuario */}
                        <svg className="w-3 h-3 text-[#c5ae73]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>

                        {/* Select Transparente Superpuesto */}
                        <select
                            value={userRole}
                            onChange={(e) => {
                                const role = e.target.value as any;
                                setUserRole(role);
                                resetWorkflow();
                                setShowIncidentsTab(false);
                                if (role === "digital_secretary" || role === "court_secretary") {
                                    setViewMode("archive");
                                } else if (role === "reader_user" || role === "abogado") {
                                    setViewMode("search");
                                }
                            }}
                            className="bg-transparent text-[12px] font-bold text-slate-100 focus:outline-none appearance-none pr-4 cursor-pointer font-sans transition-colors duration-200"
                            style={{ backgroundImage: 'none' }}
                        >
                            <option value="digital_secretary" className="bg-[#152347] text-white">Secretario Digital</option>
                            <option value="court_secretary" className="bg-[#152347] text-white">Secretaria de Tribunal</option>
                            <option value="reader_user" className="bg-[#152347] text-white">Usuario Lector</option>
                            <option value="abogado" className="bg-[#152347] text-white">Abogado</option>
                        </select>

                        {/* Flecha */}
                        <svg className="w-2.5 h-2.5 text-slate-400 absolute right-3 pointer-events-none transition-transform duration-300 group-hover:translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>

            </div>
        </header>
    );
}