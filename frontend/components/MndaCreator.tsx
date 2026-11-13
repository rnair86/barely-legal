"use client";

import { useMemo, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  buildDocument,
  defaultValues,
  renderCoverPage,
  renderStandardTerms,
  type MndaValues,
  type Party,
} from "@/lib/mnda";

interface Props {
  coverTemplate: string;
  termsTemplate: string;
}

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-zinc-800">{label}</span>
      {hint && <span className="block text-xs text-zinc-500">{hint}</span>}
      {children}
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
      <legend className="px-1 text-sm font-semibold text-zinc-900">{title}</legend>
      {children}
    </fieldset>
  );
}

/** A "N years" number box paired with an alternative option, as radio buttons. */
function TermChoice<T extends string>(props: {
  name: string;
  value: T;
  onChange: (value: T) => void;
  years: number;
  onYearsChange: (years: number) => void;
  yearsOption: T;
  yearsLabel: string;
  otherOption: T;
  otherLabel: string;
}) {
  return (
    <div className="space-y-2 text-sm text-zinc-800">
      <label className="flex flex-wrap items-center gap-2">
        <input
          type="radio"
          name={props.name}
          checked={props.value === props.yearsOption}
          onChange={() => props.onChange(props.yearsOption)}
        />
        {props.yearsLabel}
        <input
          type="number"
          min={1}
          aria-label={`${props.name} years`}
          value={props.years}
          onChange={(e) => props.onYearsChange(Number(e.target.value))}
          className="w-16 rounded-md border border-zinc-300 px-2 py-1"
        />
        year(s)
      </label>
      <label className="flex items-center gap-2">
        <input
          type="radio"
          name={props.name}
          checked={props.value === props.otherOption}
          onChange={() => props.onChange(props.otherOption)}
        />
        {props.otherLabel}
      </label>
    </div>
  );
}

function PartyFields({
  title,
  party,
  onChange,
}: {
  title: string;
  party: Party;
  onChange: (key: keyof Party, value: string) => void;
}) {
  return (
    <Section title={title}>
      <Field label="Company">
        <input className={inputClass} value={party.company} onChange={(e) => onChange("company", e.target.value)} />
      </Field>
      <Field label="Signer name">
        <input className={inputClass} value={party.name} onChange={(e) => onChange("name", e.target.value)} />
      </Field>
      <Field label="Title">
        <input className={inputClass} value={party.title} onChange={(e) => onChange("title", e.target.value)} />
      </Field>
      <Field label="Notice address" hint="Email or postal address">
        <textarea
          rows={2}
          className={inputClass}
          value={party.noticeAddress}
          onChange={(e) => onChange("noticeAddress", e.target.value)}
        />
      </Field>
    </Section>
  );
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

  const set = <K extends keyof MndaValues>(key: K, value: MndaValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));
  const setParty = (which: "party1" | "party2") => (key: keyof Party, value: string) =>
    setValues((prev) => ({ ...prev, [which]: { ...prev[which], [key]: value } }));

  const coverMarkdown = useMemo(() => renderCoverPage(coverTemplate, values), [coverTemplate, values]);
  const termsMarkdown = useMemo(() => renderStandardTerms(termsTemplate), [termsTemplate]);

  const today = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    set("effectiveDate", `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  };

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[26rem_minmax(0,1fr)]">
      <form className="no-print space-y-4" onSubmit={(e) => e.preventDefault()}>
        <Section title="Agreement details">
          <Field label="Purpose" hint="How Confidential Information may be used">
            <textarea rows={3} className={inputClass} value={values.purpose} onChange={(e) => set("purpose", e.target.value)} />
          </Field>
          <Field label="Effective date">
            <div className="flex gap-2">
              <input type="date" className={inputClass} value={values.effectiveDate} onChange={(e) => set("effectiveDate", e.target.value)} />
              <button type="button" onClick={today} className="shrink-0 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-800 hover:bg-zinc-50">
                Today
              </button>
            </div>
          </Field>
        </Section>

        <Section title="MNDA term">
          <TermChoice
            name="mnda-term"
            value={values.mndaTerm}
            onChange={(v) => set("mndaTerm", v)}
            years={values.mndaTermYears}
            onYearsChange={(n) => set("mndaTermYears", n)}
            yearsOption="expires"
            yearsLabel="Expires"
            otherOption="continues"
            otherLabel="Continues until terminated"
          />
        </Section>

        <Section title="Term of confidentiality">
          <TermChoice
            name="confidentiality"
            value={values.confidentiality}
            onChange={(v) => set("confidentiality", v)}
            years={values.confidentialityYears}
            onYearsChange={(n) => set("confidentialityYears", n)}
            yearsOption="years"
            yearsLabel="For"
            otherOption="perpetuity"
            otherLabel="In perpetuity"
          />
        </Section>

        <Section title="Governing law & jurisdiction">
          <Field label="Governing law" hint="State, e.g. Delaware">
            <input className={inputClass} value={values.governingLaw} onChange={(e) => set("governingLaw", e.target.value)} />
          </Field>
          <Field label="Jurisdiction" hint="City or county and state, e.g. courts located in New Castle, DE">
            <input className={inputClass} value={values.jurisdiction} onChange={(e) => set("jurisdiction", e.target.value)} />
          </Field>
          <Field label="MNDA modifications" hint="Optional">
            <textarea rows={2} className={inputClass} value={values.modifications} onChange={(e) => set("modifications", e.target.value)} />
          </Field>
        </Section>

        <PartyFields title="Party 1" party={values.party1} onChange={setParty("party1")} />
        <PartyFields title="Party 2" party={values.party2} onChange={setParty("party2")} />
      </form>

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
