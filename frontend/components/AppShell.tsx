"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { getToken, signOut } from "@/lib/api";

export const DISCLAIMER =
  "Documents are drafts for convenience only and are subject to legal review. This is not legal advice.";

/** Signed-in page frame: redirects to sign in without a token; navbar plus draft disclaimer. */
export default function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  // localStorage exists only in the browser. The server/hydration snapshot is null
  // (unknown), so a page load with a valid token is not redirected before it is read.
  const signedIn = useSyncExternalStore(
    () => () => {},
    () => !!getToken(),
    () => null,
  );

  useEffect(() => {
    if (signedIn === false) router.replace("/signin/");
  }, [signedIn, router]);

  if (!signedIn) return null;

  return (
    <div className="flex flex-1 flex-col">
      <header className="no-print border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/dashboard/" className="text-lg font-semibold text-[#032147]">
            Prelegal
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard/" className="text-zinc-700 hover:text-[#209dd7]">
              My documents
            </Link>
            <Link href="/new/" className="rounded-md bg-[#753991] px-3 py-1.5 font-medium text-white hover:opacity-90">
              New document
            </Link>
            <button
              type="button"
              onClick={() => {
                signOut();
                router.replace("/signin/");
              }}
              className="text-zinc-600 hover:text-[#209dd7]"
            >
              Sign out
            </button>
          </nav>
        </div>
        <p role="note" className="border-t border-[#ecad0a]/40 bg-[#ecad0a]/15 px-4 py-2 text-center text-xs text-[#032147]">
          {DISCLAIMER}
        </p>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="no-print mx-auto w-full max-w-7xl px-4 py-6 text-xs text-[#888888]">
        Based on Common Paper standard agreements, used under{" "}
        <a className="underline" href="https://creativecommons.org/licenses/by/4.0/">
          CC BY 4.0
        </a>
        .
      </footer>
    </div>
  );
}
