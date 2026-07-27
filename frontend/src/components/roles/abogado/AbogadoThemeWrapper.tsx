"use client";

import { ReactNode } from "react";

interface AbogadoThemeWrapperProps {
  children: ReactNode;
}

export const AbogadoThemeWrapper = ({ children }: AbogadoThemeWrapperProps) => {
  // Paleta de colores extraída de la vista del tribunal (estilo claro neumórfico)
  // - Fondo principal de la página: bg-[#e2e8f0]
  // - Fondo de tarjetas/paneles: bg-[#e2e8f0] con sombras neumórficas
  // - Texto base: text-slate-700 / text-[#334155]
  // - Texto de cabecera: text-slate-800 / text-[#1e293b]
  // - Texto de etiquetas: text-slate-600 / text-[#475569]

  return (
    <div className="bg-[#e2e8f0] min-h-screen">
      {/* Contenedor con estilos de texto base del tribunal en un fondo claro */}
      <div className="text-slate-800">
        {/* Efectos de brillo ("glow") sutiles y aclarados para fondo claro */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#e2e8f0]/40 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#e2e8f0]/40 rounded-full blur-[140px] pointer-events-none" />
        
        <div className="relative z-10 [&_h1]:text-slate-800 [&_h2]:text-slate-800 [&_h3]:text-slate-800 [&_p]:text-slate-700 [&_span]:text-slate-700 [&_label]:text-slate-600 [&_input]:text-slate-700 [&_textarea]:text-slate-700">
          {children}
        </div>
      </div>
    </div>
  );
};