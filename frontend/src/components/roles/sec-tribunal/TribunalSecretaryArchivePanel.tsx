"use client";

import { useLibra } from "../../../hooks/useLibra";
import { ArchiveView } from "../../ArchiveView";

type LibraHookState = ReturnType<typeof useLibra>;

interface TribunalSecretaryArchivePanelProps {
  state: LibraHookState;
}

export const TribunalSecretaryArchivePanel = ({ state }: TribunalSecretaryArchivePanelProps) => {
  return <ArchiveView state={state} />;
};
