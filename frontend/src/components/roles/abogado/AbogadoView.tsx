"use client";

import { useLibra } from "../../../hooks/useLibra";
import { AbogadoAnalyzerPanel } from "./AbogadoAnalyzerPanel";
import { AbogadoSearchPanel } from "./AbogadoSearchPanel";

type LibraHookState = ReturnType<typeof useLibra>;

interface AbogadoViewProps {
  state: LibraHookState;
}

export const AbogadoView = ({ state }: AbogadoViewProps) => {
  const { viewMode } = state;

  if (viewMode === "search") {
    return <AbogadoSearchPanel state={state} />;
  }

  return <AbogadoAnalyzerPanel state={state} />;
};
