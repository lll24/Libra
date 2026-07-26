import React from 'react';

interface TopNavBarProps {
    userRole: string;
    viewMode: string;
    setViewMode: (mode: any) => void;
    currentStep: string;
    resetWorkflow: () => void;
    setShowIncidentsTab: (show: boolean) => void;
    fetchArchiveList: () => void;
    searchCausasAction: (query: string) => void;
    setError: (err: string | null) => void;
    setIsLoginOpen: (open: boolean) => void;
    logoutAction: () => void;
}

export default function TopNavBar({
    userRole,
    viewMode,
    setViewMode,
    currentStep,
    resetWorkflow,
    setShowIncidentsTab,
    fetchArchiveList,
    searchCausasAction,
    setError,
    setIsLoginOpen,
    logoutAction,
}: TopNavBarProps) {

    const getRoleDisplayName = (role: string) => {
        switch (role) {
            case "digital_secretary":
                return "Secretario Digital";
            case "court_secretary":
                return "Secretaria de Tribunal";
            case "abogado":
                return "Abogado";
            default:
                return "Usuario Lector";
        }
    };

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

                {userRole === "reader_user" ? (
                    /* Botón Iniciar Sesión para el Usuario Lector */
                    <button
                        onClick={() => setIsLoginOpen(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[11px] font-bold py-1.5 px-4 rounded-full shadow-lg shadow-blue-500/10 transition-all active:scale-95"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 01-3-3h7a3 3 0 013 3v1" />
                        </svg>
                        Iniciar Sesión
                    </button>
                ) : (
                    /* Panel de Usuario Autenticado */
                    <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 rounded-full px-3 py-1 text-slate-300">
                        {/* Indicador de Rol */}
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-100 pr-2 border-r border-slate-800">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            {getRoleDisplayName(userRole)}
                        </div>

                        {/* Botón Cerrar Sesión */}
                        <button
                            onClick={logoutAction}
                            className="text-[10px] text-slate-400 hover:text-rose-400 font-bold transition-colors flex items-center gap-1"
                        >
                            Salir
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                )}

            </div>
        </header>
    );
}