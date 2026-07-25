"use client";

import { RoleWorkspace } from "../../../components/roles/RoleWorkspace";
import { useLibra } from "../../../hooks/useLibra";

export default function PublicoDashboardPage() {
  const state = useLibra();
  return <RoleWorkspace state={state} />;
}
