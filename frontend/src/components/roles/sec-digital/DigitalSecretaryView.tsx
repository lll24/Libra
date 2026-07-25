"use client";

import { useLibra } from "../../../hooks/useLibra";
import { DigitalSecretaryAnalyzerPanel } from "./DigitalSecretaryAnalyzerPanel";
import { DigitalSecretaryArchivePanel } from "./DigitalSecretaryArchivePanel";

type LibraHookState = ReturnType<typeof useLibra>;

interface DigitalSecretaryViewProps {
  state: LibraHookState;
}

export const DigitalSecretaryView = ({ state }: DigitalSecretaryViewProps) => {
  const { viewMode } = state;

  return (
    <>
      {viewMode === "analyzer" && <DigitalSecretaryAnalyzerPanel state={state} />}
      {viewMode === "archive" && <DigitalSecretaryArchivePanel state={state} />}
    </>
  );
};
