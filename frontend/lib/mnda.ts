/**
 * Pure helpers that fill the Common Paper Mutual NDA cover page template
 * (templates/Mutual-NDA-coverpage.md) with values entered by the user.
 *
 * The template's own wording is kept: only its bracketed placeholders, the
 * term checkboxes and the signature table are replaced. If the template ever
 * changes shape, `replaceLine` throws so the mismatch is caught by tests
 * rather than silently producing a wrong document.
 */

export interface Party {
  company: string;
  name: string;
  title: string;
  noticeAddress: string;
}

export interface MndaValues {
  purpose: string;
  /** ISO date (YYYY-MM-DD) or "" when not chosen yet. */
  effectiveDate: string;
  mndaTerm: "expires" | "continues";
  mndaTermYears: number;
  confidentiality: "years" | "perpetuity";
  confidentialityYears: number;
  governingLaw: string;
  jurisdiction: string;
  modifications: string;
  party1: Party;
  party2: Party;
}

export const DEFAULT_PURPOSE =
  "Evaluating whether to enter into a business relationship with the other party.";

const emptyParty = (): Party => ({
  company: "",
  name: "",
  title: "",
  noticeAddress: "",
});

export const defaultValues = (): MndaValues => ({
  purpose: DEFAULT_PURPOSE,
  effectiveDate: "",
  mndaTerm: "expires",
  mndaTermYears: 1,
  confidentiality: "years",
  confidentialityYears: 1,
  governingLaw: "",
  jurisdiction: "",
  modifications: "",
  party1: emptyParty(),
  party2: emptyParty(),
});

/** Placeholder shown while a required value has not been entered. */
const blank = (label: string) => `[${label}]`;

/** Normalize line endings so the regexes below work on any checkout. */
const normalize = (text: string) => text.replace(/\r\n/g, "\n");

function replaceLine(text: string, pattern: RegExp, replacement: string): string {
  if (!pattern.test(text)) {
    throw new Error(`Mutual NDA template changed: no match for ${pattern}`);
  }
  // Function replacer so "$" in user input is never treated specially.
  return text.replace(pattern, () => replacement);
}

/** "2026-11-12" -> "November 12, 2026" (no timezone shifting). */
export function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return "";
  const [, y, m, d] = match.map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

const years = (n: number) => (Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1);

/** Escape table-cell content: no pipes, no newlines. */
const cell = (text: string) =>
  text.trim().replace(/\|/g, "\\|").replace(/\s*\n\s*/g, ", ");

function signatureTable(p1: Party, p2: Party): string {
  const row = (label: string, a: string, b: string) =>
    `| ${label} | ${cell(a)} | ${cell(b)} |`;
  return [
    "|  | PARTY 1 | PARTY 2 |",
    "|:--- | :----: | :----: |",
    row("Signature", "", ""),
    row("Print Name", p1.name, p2.name),
    row("Title", p1.title, p2.title),
    row("Company", p1.company, p2.company),
    row("Notice Address (email or postal)", p1.noticeAddress, p2.noticeAddress),
    row("Date", "", ""),
  ].join("\n");
}

/** Turn the template's helper markup into plain markdown. */
export function cleanMarkup(text: string): string {
  return text
    .replace(/<label>([\s\S]*?)<\/label>/g, (_m, inner: string) => `*${inner.trim()}*`)
    .replace(/<span[^>]*>([\s\S]*?)<\/span>/g, "$1");
}

/** Fill the cover page template with the user's values. */
export function renderCoverPage(template: string, v: MndaValues): string {
  let out = normalize(template);

  out = replaceLine(
    out,
    /^\[Evaluating whether.*\]$/m,
    v.purpose.trim() || blank("Purpose"),
  );
  out = replaceLine(
    out,
    /^\[Today.s date\]$/m,
    formatDate(v.effectiveDate) || blank("Effective Date"),
  );

  const termYears = years(v.mndaTermYears);
  out = replaceLine(
    out,
    /^- \[[ x]\] +Expires \[.*\] from Effective Date\.$/m,
    `- [${v.mndaTerm === "expires" ? "x" : " "}]     Expires ${termYears} year(s) from Effective Date.`,
  );
  out = replaceLine(
    out,
    /^- \[[ x]\] +Continues until terminated.*$/m,
    `- [${v.mndaTerm === "continues" ? "x" : " "}]     Continues until terminated in accordance with the terms of the MNDA.`,
  );

  const confYears = years(v.confidentialityYears);
  out = replaceLine(
    out,
    /^- \[[ x]\] +\[.*\] from Effective Date, but in the case of trade secrets.*$/m,
    `- [${v.confidentiality === "years" ? "x" : " "}]     ${confYears} year(s) from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.`,
  );
  out = replaceLine(
    out,
    /^- \[[ x]\] +In perpetuity\.$/m,
    `- [${v.confidentiality === "perpetuity" ? "x" : " "}]     In perpetuity.`,
  );

  out = replaceLine(
    out,
    /^Governing Law: \[.*\]$/m,
    `Governing Law: ${v.governingLaw.trim() || blank("State")}`,
  );
  out = replaceLine(
    out,
    /^Jurisdiction: \[.*\]$/m,
    `Jurisdiction: ${v.jurisdiction.trim() || blank("City or county and state")}`,
  );
  out = replaceLine(
    out,
    /^List any modifications to the MNDA$/m,
    v.modifications.trim() || "None.",
  );

  out = replaceLine(
    out,
    /^\|\| PARTY 1[\s\S]*?(?=\n\n)/m,
    signatureTable(v.party1, v.party2),
  );

  return cleanMarkup(out);
}

/** The Standard Terms need no values; they refer to the cover page by name. */
export function renderStandardTerms(template: string): string {
  return cleanMarkup(normalize(template));
}

/** The complete document as a single markdown string (for download). */
export function buildDocument(
  coverTemplate: string,
  termsTemplate: string,
  v: MndaValues,
): string {
  return `${renderCoverPage(coverTemplate, v).trimEnd()}\n\n${renderStandardTerms(termsTemplate).trimEnd()}\n`;
}

/** Fields the AI changed in one turn; null or missing means "unchanged". */
export type MndaUpdates = {
  [K in keyof Omit<MndaValues, "party1" | "party2">]?: MndaValues[K] | null;
} & { party1?: PartyUpdates | null; party2?: PartyUpdates | null };
type PartyUpdates = { [K in keyof Party]?: string | null };

const definedEntries = (obj: object) =>
  Object.entries(obj).filter(([, v]) => v !== null && v !== undefined);

/** Merge the AI's updates into the current values, ignoring null fields. */
export function applyUpdates(values: MndaValues, updates: MndaUpdates): MndaValues {
  const { party1, party2, ...rest } = updates;
  return {
    ...values,
    ...Object.fromEntries(definedEntries(rest)),
    party1: { ...values.party1, ...Object.fromEntries(definedEntries(party1 ?? {})) },
    party2: { ...values.party2, ...Object.fromEntries(definedEntries(party2 ?? {})) },
  };
}
