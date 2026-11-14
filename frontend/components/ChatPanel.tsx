"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { applyTurn, localToday, type ChatTurn, type Doc, type DocState } from "@/lib/documents";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  state: DocState;
  messages: Message[];
  /** Called after every completed turn (success or failure) with the new state and chat. */
  onTurn: (state: DocState, messages: Message[]) => void;
}

export const GREETING: Message = {
  role: "assistant",
  content:
    "Hi! I can help you draft a legal agreement, such as an NDA, cloud service agreement, SLA, DPA or professional services agreement. Tell me what you need and I'll guide you through it, filling in the document as we talk.",
};

export default function ChatPanel({ state, messages, onTurn }: Props) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    const history = [...messages, { role: "user" as const, content: text }];
    onTurn(state, history);
    setInput("");
    setBusy(true);
    try {
      // The greeting is local UI only; the model gets the real conversation.
      const res = await api("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: history.slice(1),
          document: state.doc?.id ?? null,
          values: state.values,
          terms: state.terms,
          today: localToday(),
        }),
      });
      if (!res.ok) throw new Error(`Chat failed (${res.status})`);
      const data: ChatTurn = await res.json();
      let doc = state.doc;
      if (data.document && data.document !== doc?.id) {
        const docRes = await fetch(`/api/documents/${data.document}`);
        if (!docRes.ok) throw new Error(`Document load failed (${docRes.status})`);
        doc = (await docRes.json()) as Doc;
      }
      onTurn(applyTurn({ ...state, doc }, data), [...history, { role: "assistant", content: data.reply }]);
    } catch {
      onTurn(state, [
        ...history,
        { role: "assistant", content: "Sorry, something went wrong. Please try sending that again." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="no-print flex h-[32rem] flex-col rounded-lg border border-zinc-200 bg-white lg:sticky lg:top-4">
      <h2 className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold text-[#032147]">Chat</h2>
      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <p
              className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-left text-sm ${
                m.role === "user" ? "bg-[#209dd7] text-white" : "bg-zinc-100 text-zinc-900"
              }`}
            >
              {m.content}
            </p>
          </div>
        ))}
        {busy && <p className="text-sm text-[#888888]">Thinking...</p>}
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-zinc-200 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message"
          aria-label="Message"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#209dd7] focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="shrink-0 rounded-md bg-[#753991] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </section>
  );
}
