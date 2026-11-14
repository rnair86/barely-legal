"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ChatPanel from "@/components/ChatPanel";
import { buildGenericDocument, prepareBody, renderKeyTerms, type DocState } from "@/lib/documents";
import { buildDocument, defaultValues, renderCoverPage, renderStandardTerms } from "@/lib/mnda";

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

/** Cover and body markdown for the preview, plus the full text for download. */
function render({ doc, values, terms }: DocState) {
  if (!doc) return null;
  if (doc.cover) {
    return {
      cover: renderCoverPage(doc.cover, values),
      body: renderStandardTerms(doc.body),
      full: buildDocument(doc.cover, doc.body, values),
    };
  }
  return {
    cover: renderKeyTerms(doc, terms),
    body: prepareBody(doc.body),
    full: buildGenericDocument(doc, terms),
  };
}

export default function DocumentCreator() {
  const [state, setState] = useState<DocState>(initialState);
  const rendered = useMemo(() => render(state), [state]);

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[26rem_minmax(0,1fr)]">
      <div className="space-y-3">
        <ChatPanel state={state} onState={setState} />
        {state.doc && (
          <button
            type="button"
            onClick={() => window.location.reload()}
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
                onClick={() => download(`${state.doc!.id}.md`, rendered.full, "text/markdown")}
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
