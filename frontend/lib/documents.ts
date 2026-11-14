/** Generic (non-NDA) document support: Key Terms cover page and chat-turn merging. */

import { applyUpdates, cleanMarkup, type MndaUpdates, type MndaValues } from "./mnda";

/** Mirrors backend `Document`. The NDA has `cover`; other documents have `terms`. */
export interface Doc {
  id: string;
  name: string;
  description: string;
  body: string;
  cover: string | null;
  terms: string[];
}

/** Everything the chat edits: the chosen document and its collected values. */
export interface DocState {
  doc: Doc | null;
  /** Mutual NDA fields. */
  values: MndaValues;
  /** Values for the other documents' terms, keyed by term name. */
  terms: Record<string, string>;
}

/** Response of POST /api/chat. */
export interface ChatTurn {
  reply: string;
  document: string | null;
  updates: MndaUpdates;
  termUpdates: { term: string; value: string }[];
}

const PARTY_TERMS = ["Provider", "Customer", "Company", "Partner"];

/** Merge one chat turn's field updates into the state (the document itself is fetched separately). */
export function applyTurn(state: DocState, turn: ChatTurn): DocState {
  const terms = { ...state.terms };
  for (const { term, value } of turn.termUpdates) {
    if (value.trim()) terms[term] = value.trim();
  }
  return { ...state, values: applyUpdates(state.values, turn.updates), terms };
}

const cell = (text: string) => text.trim().replace(/\|/g, "\\|").replace(/\s*\n\s*/g, ", ");

/** Cover page for a generic document: a Key Terms table and a signature block. */
export function renderKeyTerms(doc: Doc, terms: Record<string, string>): string {
  const value = (t: string) => cell(terms[t] ?? "") || `[${t}]`;
  const rows = doc.terms.map((t) => `| ${t} | ${value(t)} |`);
  const parties = doc.terms.filter((t) => PARTY_TERMS.includes(t)).slice(0, 2);
  const sig = [
    `|  | ${parties.map((p) => p.toUpperCase()).join(" | ")} |`,
    `|:--- | ${parties.map(() => ":----:").join(" | ")} |`,
    `| Company | ${parties.map(value).join(" | ")} |`,
    ...["Signature", "Print Name", "Title", "Date"].map((l) => `| ${l} | ${parties.map(() => "").join(" | ")} |`),
  ];
  return [
    `# ${doc.name}`,
    "## Key Terms",
    "The terms below are part of this agreement and are referred to throughout the Standard Terms that follow.",
    ["| Term | Value |", "|:--- | :--- |", ...rows].join("\n"),
    "## Signatures",
    sig.join("\n"),
  ].join("\n\n");
}

/** Template body as markdown: helper markup removed, lettered sub-items on their own lines. */
export function prepareBody(body: string): string {
  return cleanMarkup(body.replace(/\r\n/g, "\n")).replace(/\n(?=\s+[a-z]\. )/g, "  \n");
}

/** The complete document as a single markdown string (for download). */
export function buildGenericDocument(doc: Doc, terms: Record<string, string>): string {
  return `${renderKeyTerms(doc, terms)}\n\n${prepareBody(doc.body).trimEnd()}\n`;
}
