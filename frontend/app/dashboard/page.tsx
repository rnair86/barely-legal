"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api, type SavedSummary } from "@/lib/api";

export default function Dashboard() {
  const [docs, setDocs] = useState<SavedSummary[] | null>(null);

  useEffect(() => {
    api("/api/saved").then(async (res) => res.ok && setDocs(await res.json()));
  }, []);

  async function remove(id: number) {
    if (!window.confirm("Delete this document?")) return;
    const res = await api(`/api/saved/${id}`, { method: "DELETE" });
    if (res.ok) setDocs((d) => d && d.filter((x) => x.id !== id));
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[#032147]">My documents</h1>
          <Link href="/new/" className="rounded-md bg-[#753991] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            New document
          </Link>
        </div>
        {docs === null ? (
          <p className="mt-8 text-sm text-[#888888]">Loading...</p>
        ) : docs.length === 0 ? (
          <p className="mt-8 rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-[#888888]">
            You have no documents yet. Start one and it will be saved here automatically.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white shadow-sm">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <p className="font-medium text-[#032147]">{d.name}</p>
                  <p className="text-xs text-[#888888]">Updated {new Date(d.updated_at.replace(" ", "T") + "Z").toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <Link href={`/new/?id=${d.id}`} className="text-[#209dd7] hover:underline">
                    Open
                  </Link>
                  <button type="button" onClick={() => remove(d.id)} className="text-zinc-500 hover:text-red-600">
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
