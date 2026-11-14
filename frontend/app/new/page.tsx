"use client";

import { useSyncExternalStore } from "react";
import AppShell from "@/components/AppShell";
import DocumentCreator from "@/components/DocumentCreator";

export default function NewDocument() {
  // The saved id comes from the URL; static export has no dynamic routes. The
  // server snapshot is null (not yet known), the client "" (new) or the id.
  const id = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("id") ?? "",
    () => null,
  );

  return <AppShell>{id !== null && <DocumentCreator savedId={id ? Number(id) : null} />}</AppShell>;
}
