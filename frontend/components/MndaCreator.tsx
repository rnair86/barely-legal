"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ChatPanel from "@/components/ChatPanel";
import {
  buildDocument,
  defaultValues,
  renderCoverPage,
  renderStandardTerms,
  type MndaValues,
} from "@/lib/mnda";

interface Props {
  coverTemplate: string;
  termsTemplate: string;
}

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

export default function MndaCreator({ coverTemplate, termsTemplate }: Props) {
  const [values, setValues] = useState<MndaValues>(defaultValues);

  const coverMarkdown = useMemo(() => renderCoverPage(coverTemplate, values), [coverTemplate, values]);
  const termsMarkdown = useMemo(() => renderStandardTerms(termsTemplate), [termsTemplate]);

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[26rem_minmax(0,1fr)]">
      <ChatPanel values={values} onValues={setValues} />

      <div className="space-y-4">
        <div className="no-print flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => download("Mutual-NDA.md", buildDocument(coverTemplate, termsTemplate, values), "text/markdown")}
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
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{coverMarkdown}</ReactMarkdown>
          </section>
          <section className="print-break">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{termsMarkdown}</ReactMarkdown>
          </section>
        </article>
      </div>
    </div>
  );
}
