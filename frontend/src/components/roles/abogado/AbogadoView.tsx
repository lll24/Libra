"use client";

import { useLibra } from "../../../hooks/useLibra";
import { AbogadoAnalyzerPanel } from "./AbogadoAnalyzerPanel";
import { AbogadoSearchPanel } from "./AbogadoSearchPanel";
import { AbogadoArchivePanel } from "./AbogadoArchivePanel";
import { AbogadoThemeWrapper } from "./AbogadoThemeWrapper";

type LibraHookState = ReturnType<typeof useLibra>;

interface AbogadoViewProps {
  state: LibraHookState;
}

export const AbogadoView = ({ state }: AbogadoViewProps) => {
  const { viewMode } = state;

  const renderPanel = () => {
    if (viewMode === "search") return <AbogadoSearchPanel state={state} />;
    if (viewMode === "archive") return <AbogadoArchivePanel state={state} />;
    return <AbogadoAnalyzerPanel state={state} />;
  };

  return (
    <AbogadoThemeWrapper>
      {renderPanel()}
    </AbogadoThemeWrapper>
  );
};