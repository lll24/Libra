"use client";

import { useLibra } from "../../../hooks/useLibra";
import { ArchiveView } from "../../ArchiveView";

type LibraHookState = ReturnType<typeof useLibra>;

interface AbogadoArchivePanelProps {
  state: LibraHookState;
}

export const AbogadoArchivePanel = ({ state }: AbogadoArchivePanelProps) => {
  return <ArchiveView state={state} />;
};
