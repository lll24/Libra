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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn">
      <div className="relative w-full max-w-md mx-4 p-8 rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Glow decorativo */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

        {/* Botón de cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Encabezado */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center mx-auto mb-3 bg-slate-50 shadow-inner">
            <span className="text-xl">⚖️</span>
          </div>
          <h3 className="text-lg font-black tracking-tight text-slate-800">
            Iniciar Sesión
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Ingresa tus credenciales del Poder Judicial
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@libra.gob"
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
              required
            />
          </div>

          {error && (
            <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 text-xs leading-normal animate-shake">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/25 transition-all disabled:opacity-50"
          >
            {isLoading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 leading-normal">
            El acceso de consulta general (Usuario Lector) no requiere credenciales.
          </p>
        </div>
      </div>
    </div>
  );
};
