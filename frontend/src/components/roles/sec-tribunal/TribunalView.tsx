"use client";

import { useLibra } from "../../../hooks/useLibra";
import { TribunalSecretaryArchivePanel } from "./TribunalSecretaryArchivePanel";

type LibraHookState = ReturnType<typeof useLibra>;

interface TribunalSecretaryViewProps {
  state: LibraHookState;
}

export const TribunalSecretaryView = ({ state }: TribunalSecretaryViewProps) => {
  const { viewMode } = state;

  return viewMode === "archive" ? <TribunalSecretaryArchivePanel state={state} /> : null;
};
