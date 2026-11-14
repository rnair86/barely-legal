"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ChatPanel, { GREETING, type Message } from "@/components/ChatPanel";
import { api } from "@/lib/api";
import { prepareBody, renderKeyTerms, type DocState } from "@/lib/documents";
import { defaultValues, renderCoverPage, renderStandardTerms } from "@/lib/mnda";

const DRAFT_NOTICE = "*DRAFT: this document is subject to legal review and is not legal advice.*";

const initialState = (): DocState => ({ doc: null, values: defaultValues(), terms: {} });

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  // Some browsers (e.g. Safari) need the link in the DOM, and the URL must
  // outlive the click so the download can start.
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Cover and body markdown of the current document; the download is these two joined. */
function render({ doc, values, terms }: DocState) {
  if (!doc) return null;
  const draft = (cover: string) => `${DRAFT_NOTICE}

${cover}`;
  if (doc.cover) {
    return { cover: draft(renderCoverPage(doc.cover, values)), body: renderStandardTerms(doc.body) };
  }
  return { cover: draft(renderKeyTerms(doc, terms)), body: prepareBody(doc.body) };
}

/** `savedId` is an existing saved document to reopen; null starts a new one. */
export default function DocumentCreator({ savedId }: { savedId: number | null }) {
  const [state, setState] = useState<DocState>(initialState);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [loadError, setLoadError] = useState(false);
  const [loaded, setLoaded] = useState(savedId === null);
  // Id of this document on the server; set on the first save of a new document.
  const id = useRef(savedId);
  // Saves run one after another so a new document is created once and updates stay in order.
  const saves = useRef(Promise.resolve());
  const rendered = useMemo(() => render(state), [state]);

  // Reopen a saved document: the template comes from the catalog, the rest from the saved state.
  useEffect(() => {
    if (savedId === null) return;
    (async () => {
      const res = await api(`/api/saved/${savedId}`);
      if (!res.ok) return setLoadError(true);
      const saved = await res.json();
      const docRes = await fetch(`/api/documents/${saved.doc_id}`);
      if (!docRes.ok) return setLoadError(true);
      setState({ doc: await docRes.json(), values: saved.state.values, terms: saved.state.terms });
      setMessages(saved.state.messages);
      setLoaded(true);
    })();
  }, [savedId]);

  /** Apply a finished chat turn and autosave once a document has been chosen. */
  async function onTurn(next: DocState, nextMessages: Message[]) {
    setState(next);
    setMessages(nextMessages);
    if (!next.doc) return;
    const body = JSON.stringify({
      doc_id: next.doc.id,
      state: { values: next.values, terms: next.terms, messages: nextMessages },
    });
    saves.current = saves.current.then(async () => {
      const res =
        id.current === null
          ? await api("/api/saved", { method: "POST", body })
          : await api(`/api/saved/${id.current}`, { method: "PUT", body });
      if (res.ok && id.current === null) {
        id.current = (await res.json()).id;
        window.history.replaceState(null, "", `/new/?id=${id.current}`);
      }
    });
  }

  if (loadError) {
    return <p className="mx-auto max-w-7xl px-4 py-8 text-sm text-red-600">This document could not be loaded.</p>;
  }

  if (!loaded) return <p className="mx-auto max-w-7xl px-4 py-8 text-sm text-[#888888]">Loading...</p>;

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[26rem_minmax(0,1fr)]">
      <div className="space-y-3">
        <ChatPanel state={state} messages={messages} onTurn={onTurn} />
        {state.doc && (
          <button
            type="button"
            onClick={() => window.location.assign("/new/")}
            className="no-print text-sm text-[#209dd7] underline"
          >
            Start new document
          </button>
        )}
      </div>

      <div className="space-y-4">
        {rendered && state.doc ? (
          <>
            <div className="no-print flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  download(`${state.doc!.id}.md`, `${rendered.cover.trimEnd()}\n\n${rendered.body.trimEnd()}\n`, "text/markdown")
                }
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Download Markdown
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              >
                Download PDF
              </button>
              <span className="text-xs text-zinc-500">PDF opens your browser&apos;s print dialog — choose &quot;Save as PDF&quot;.</span>
            </div>

            <article aria-label="Document preview" className="doc rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
              <section>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{rendered.cover}</ReactMarkdown>
              </section>
              <section className="print-break">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{rendered.body}</ReactMarkdown>
              </section>
            </article>
          </>
        ) : (
          <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-sm text-[#888888]">
            Your document will appear here once you tell the assistant what you need.
          </p>
        )}
      </div>
    </div>
  );
}
