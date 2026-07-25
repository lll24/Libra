"use client";

import { useLibra } from "../../hooks/useLibra";
import { AbogadoView } from "./abogado/AbogadoView";
import { LectorView } from "./lector-publico/LectorView";
import { DigitalSecretaryView } from "./sec-digital/DigitalSecretaryView";
import { TribunalSecretaryView } from "./sec-tribunal/TribunalView";

type LibraHookState = ReturnType<typeof useLibra>;

interface RoleWorkspaceProps {
  state: LibraHookState;
}

export const RoleWorkspace = ({ state }: RoleWorkspaceProps) => {
  switch (state.userRole) {
    case "abogado":
      return <AbogadoView state={state} />;
    case "reader_user":
      return <LectorView state={state} />;
    case "court_secretary":
      return <TribunalSecretaryView state={state} />;
    case "digital_secretary":
    default:
      return <DigitalSecretaryView state={state} />;
  }
};
