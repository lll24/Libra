"use client";

import React, { useState } from "react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (email: string, password: string) => Promise<void>;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await onLoginSuccess(email, password);
      setEmail("");
      setPassword("");
    } catch (err: any) {
      setError(err.message || "Credenciales incorrectas. Por favor, reintente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0f2d59]/70 bg-[radial-gradient(circle_at_center,rgba(15,45,89,0.95)_0%,rgba(7,11,25,0.98)_100%)] backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn">
      <div className="relative w-full max-w-[360px] mx-4 p-8 rounded-[32px] bg-[#edf2f7] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-[#cbd5e1]/45 overflow-hidden text-center flex flex-col items-center">
        
        {/* Botón de cerrar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors z-10"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Encabezado con Logotipo */}
        <div className="w-16 h-16 rounded-full border border-slate-200 flex items-center justify-center mb-4 bg-white shadow-[0_4px_10px_rgba(0,0,0,0.06)] overflow-hidden">
          <img 
            src="/3-nbg.png" 
            alt="Logo Libra" 
            className="w-[85%] h-[85%] object-contain"
          />
        </div>

        <h3 className="text-xl font-bold tracking-tight text-slate-900 mb-1">
          Sistema Libra
        </h3>
        <p className="text-xs text-slate-500 mb-6 font-medium">
          Acceso seguro a expedientes
        </p>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          
          {/* Input Usuario */}
          <div className="relative flex items-center bg-white border border-slate-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20 rounded-xl px-3.5 transition-all shadow-sm">
            <span className="text-slate-400 mr-2.5 shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nombre de usuario"
              className="w-full bg-transparent py-3.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
              required
            />
          </div>

          {/* Input Contraseña */}
          <div className="relative flex items-center bg-white border border-slate-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20 rounded-xl px-3.5 transition-all shadow-sm">
            <span className="text-slate-400 mr-2.5 shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña de acceso"
              className="w-full bg-transparent py-3.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
              required
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 text-xs leading-normal animate-shake">
              ⚠️ {error}
            </div>
          )}

          {/* Botón Ingresar */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-bold py-3.5 rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 mt-2"
          >
            {isLoading ? "Ingresando..." : "Ingresar al Sistema"}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-200/60 text-center w-full">
          <p className="text-[10px] text-slate-400 font-medium leading-normal">
            El acceso de consulta general (Usuario Lector) no requiere credenciales.
          </p>
        </div>
      </div>
    </div>
  );
};
