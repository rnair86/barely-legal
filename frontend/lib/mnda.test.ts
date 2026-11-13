import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildDocument,
  defaultValues,
  formatDate,
  renderCoverPage,
  renderStandardTerms,
  type MndaValues,
} from "./mnda";

// Tests run from frontend/; the real templates live one level up.
const read = (file: string) =>
  readFileSync(path.resolve(process.cwd(), "..", "templates", file), "utf8");
const cover = read("Mutual-NDA-coverpage.md");
const terms = read("Mutual-NDA.md");

const filled = (): MndaValues => ({
  ...defaultValues(),
  effectiveDate: "2026-11-12",
  governingLaw: "Delaware",
  jurisdiction: "courts located in New Castle, DE",
  party1: {
    company: "Acme Inc.",
    name: "Ada Lovelace",
    title: "CEO",
    noticeAddress: "ada@acme.test",
  },
  party2: {
    company: "Globex LLC",
    name: "Alan Turing",
    title: "CTO",
    noticeAddress: "1 Main St\nSpringfield",
  },
});

describe("formatDate", () => {
  it("formats an ISO date without timezone drift", () => {
    expect(formatDate("2026-11-12")).toBe("November 12, 2026");
    expect(formatDate("2026-01-01")).toBe("January 1, 2026");
  });

  it("returns an empty string for missing or invalid input", () => {
    expect(formatDate("")).toBe("");
    expect(formatDate("12/11/2026")).toBe("");
  });
});

describe("renderCoverPage", () => {
  it("fills in every field from the form", () => {
    const out = renderCoverPage(cover, filled());
    expect(out).toContain("November 12, 2026");
    expect(out).toContain("Governing Law: Delaware");
    expect(out).toContain("Jurisdiction: courts located in New Castle, DE");
    expect(out).toContain("| Print Name | Ada Lovelace | Alan Turing |");
    expect(out).toContain("| Company | Acme Inc. | Globex LLC |");
    expect(out).toContain("1 Main St, Springfield");
    expect(out).not.toContain("Today");
    expect(out).not.toContain("Fill in");
  });

  it("selects the expiry option with the chosen number of years", () => {
    const out = renderCoverPage(cover, { ...filled(), mndaTermYears: 3 });
    expect(out).toContain("- [x]     Expires 3 year(s) from Effective Date.");
    expect(out).toContain("- [ ]     Continues until terminated");
  });

  it("selects 'continues until terminated' when chosen", () => {
    const out = renderCoverPage(cover, { ...filled(), mndaTerm: "continues" });
    expect(out).toContain("- [ ]     Expires 1 year(s)");
    expect(out).toContain("- [x]     Continues until terminated");
  });

  it("handles the term of confidentiality options", () => {
    const years = renderCoverPage(cover, { ...filled(), confidentialityYears: 5 });
    expect(years).toContain("- [x]     5 year(s) from Effective Date, but in the case of trade secrets");
    expect(years).toContain("- [ ]     In perpetuity.");

    const forever = renderCoverPage(cover, { ...filled(), confidentiality: "perpetuity" });
    expect(forever).toContain("- [ ]     1 year(s) from Effective Date, but in the case of trade secrets");
    expect(forever).toContain("- [x]     In perpetuity.");
  });

  it("falls back to 1 year for invalid year counts", () => {
    const out = renderCoverPage(cover, { ...filled(), mndaTermYears: 0 });
    expect(out).toContain("Expires 1 year(s)");
  });

  it("shows bracketed placeholders for missing required values", () => {
    const out = renderCoverPage(cover, defaultValues());
    expect(out).toContain("[Effective Date]");
    expect(out).toContain("Governing Law: [State]");
    expect(out).toContain("Jurisdiction: [City or county and state]");
    expect(out).toContain("None.");
  });

  it("lists modifications when provided", () => {
    const out = renderCoverPage(cover, { ...filled(), modifications: "Section 4 is removed." });
    expect(out).toContain("Section 4 is removed.");
    expect(out).not.toContain("None.");
  });

  it("keeps user input literal, including $ patterns and pipes", () => {
    const out = renderCoverPage(cover, {
      ...filled(),
      governingLaw: "$& California",
      party1: { ...filled().party1, company: "A | B" },
    });
    expect(out).toContain("Governing Law: $& California");
    expect(out).toContain("A \\| B");
  });

  it("works with Windows line endings in the template", () => {
    const out = renderCoverPage(cover.replace(/\r?\n/g, "\r\n"), filled());
    expect(out).toContain("Governing Law: Delaware");
  });

  it("strips template helper markup", () => {
    const out = renderCoverPage(cover, filled());
    expect(out).not.toContain("<label>");
    expect(out).not.toContain("<span");
  });
});

describe("renderStandardTerms / buildDocument", () => {
  it("removes span markup but keeps the legal text", () => {
    const out = renderStandardTerms(terms);
    expect(out).not.toContain("<span");
    expect(out).toContain("solely for the Purpose");
  });

  it("joins the cover page and standard terms", () => {
    const doc = buildDocument(cover, terms, filled());
    expect(doc.indexOf("# Mutual Non-Disclosure Agreement")).toBeLessThan(
      doc.indexOf("# Standard Terms"),
    );
    expect(doc.endsWith("\n")).toBe(true);
  });
});
