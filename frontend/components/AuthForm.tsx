"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setToken } from "@/lib/api";

/** Shared sign in / sign up form. */
export default function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      setToken((await res.json()).token);
      router.replace("/dashboard/");
      return;
    }
    setError(
      res.status === 409
        ? "That email is already registered."
        : res.status === 401
          ? "Invalid email or password."
          : "Enter a valid email and a password of at least 8 characters.",
    );
    setBusy(false);
  }

  const field = "mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#209dd7] focus:outline-none";

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-3xl font-semibold text-[#032147]">Prelegal</h1>
        <p className="mt-1 text-center text-sm text-[#888888]">Draft legal agreements by chatting with an AI.</p>
        <form onSubmit={submit} className="mt-8 space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#032147]">{signup ? "Create your account" : "Sign in"}</h2>
          <label className="block text-sm font-medium text-zinc-700">
            Email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
          </label>
          <label className="block text-sm font-medium text-zinc-700">
            Password
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={field}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-[#753991] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {signup ? "Sign up" : "Sign in"}
          </button>
          <p className="text-center text-sm text-zinc-600">
            {signup ? "Already have an account? " : "New here? "}
            <Link href={signup ? "/signin/" : "/signup/"} className="text-[#209dd7] underline">
              {signup ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </form>
        <p className="mt-4 text-center text-xs text-[#888888]">Documents are drafts and are subject to legal review.</p>
      </div>
    </main>
  );
}
