"use client";

import { ReactNode } from "react";

interface AbogadoThemeWrapperProps {
  children: ReactNode;
}

export const AbogadoThemeWrapper = ({ children }: AbogadoThemeWrapperProps) => {
  // Paleta de colores extraída de image_0.png
  // - Fondo principal de la página: bg-[#f1f5f9] (un gris azulado muy claro)
  // - Fondo de tarjetas/paneles: bg-white (para el contenido)
  // - Acentos oscuros: bg-[#1d2b40] (para botones primarios/cabeceras de carpetas)
  // - Acentos claros: bg-[#e0f2fe] (el color verde-azulado sutil para etiquetas)
  // - Texto base: text-[#334155] (Slate-700, para el texto principal)
  // - Texto de cabecera: text-[#1e293b] (Slate-800, para títulos)
  // - Texto de etiquetas: text-[#475569] (Slate-600, para etiquetas de formulario)

  return (
    <div className="bg-[#e2e8f0] min-h-screen">
      {/* Contenedor con estilos de texto base claros en un fondo claro */}
      <div className="text-[#08101e]">
        {/* Efectos de brillo ("glow") sutiles y aclarados para fondo claro */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#e2e8f0]/40 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#e2e8f0]/40 rounded-full blur-[140px] pointer-events-none" />
        
        <div className="relative z-10 [&_h1]:text-[#e2e8f0] [&_h2]:text-[#e2e8f0] [&_h3]:text-[#e2e8f0] [&_p]:text-[#e2e8f0] [&_span]:text-[#e2e8f0] [&_label]:text-[#e2e8f0] [&_input]:text-[#334155] [&_textarea]:text-[#334155]">
          {children}
        </div>
      </div>
    </div>
  );
};