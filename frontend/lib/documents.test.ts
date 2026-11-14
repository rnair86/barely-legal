import { describe, expect, it } from "vitest";
import {
  applyTurn,
  localToday,
  prepareBody,
  renderKeyTerms,
  type ChatTurn,
  type Doc,
  type DocState,
} from "./documents";
import { defaultValues } from "./mnda";

const doc: Doc = {
  id: "csa",
  name: "Cloud Service Agreement",
  description: "",
  cover: null,
  terms: ["Provider", "Customer", "Fees"],
  parties: ["Provider", "Customer"],
  body: '1. <span class="header_2">Service</span>\n    1. Text\n        a. First\n        b. Second\n',
};

const state = (terms: Record<string, string> = {}): DocState => ({ doc, values: defaultValues(), terms });

const turn = (over: Partial<ChatTurn>): ChatTurn => ({
  reply: "",
  document: null,
  updates: {},
  termUpdates: [],
  ...over,
});

describe("applyTurn", () => {
  it("merges term updates, trimming and ignoring blank values", () => {
    const out = applyTurn(
      state({ Fees: "$5" }),
      turn({
        termUpdates: [
          { term: "Provider", value: "  Acme " },
          { term: "Fees", value: "  " },
        ],
      }),
    );
    expect(out.terms).toEqual({ Fees: "$5", Provider: "Acme" });
  });

  it("trims term names so a padded name still lands on the right row", () => {
    const out = applyTurn(state(), turn({ termUpdates: [{ term: "  Provider\n", value: "Acme" }] }));
    expect(out.terms).toEqual({ Provider: "Acme" });
  });

  it("ignores empty or unknown term names, which could never be shown", () => {
    const out = applyTurn(
      state(),
      turn({
        termUpdates: [
          { term: "", value: "x" },
          { term: "   ", value: "x" },
          { term: "Target Uptime", value: "99.9%" },
          { term: "provider", value: "wrong case" },
        ],
      }),
    );
    expect(out.terms).toEqual({});
  });

  it("ignores term updates when no document is selected", () => {
    const out = applyTurn({ ...state(), doc: null }, turn({ termUpdates: [{ term: "Provider", value: "Acme" }] }));
    expect(out.terms).toEqual({});
  });

  it("applies NDA updates and keeps the document", () => {
    const out = applyTurn(state(), turn({ updates: { governingLaw: "Delaware" } }));
    expect(out.values.governingLaw).toBe("Delaware");
    expect(out.doc).toBe(doc);
  });
});

describe("renderKeyTerms", () => {
  it("shows filled values, placeholders for blanks, and the two parties in the signature block", () => {
    const md = renderKeyTerms(doc, { Provider: "Acme", Fees: "$5 | month" });
    expect(md).toContain("| Provider | Acme |");
    expect(md).toContain("| Customer | [Customer] |");
    expect(md).toContain("| Fees | $5 \\| month |");
    expect(md).toContain("|  | PROVIDER | CUSTOMER |");
    expect(md).toContain("| Company | Acme | [Customer] |");
  });
});

describe("prepareBody", () => {
  it("strips helper spans and puts lettered items on their own lines", () => {
    const out = prepareBody(doc.body);
    expect(out).not.toContain("<span");
    expect(out).toContain("a. First  \n        b. Second");
  });
});

describe("localToday", () => {
  it("formats the local calendar date, not the UTC one", () => {
    // Local time 21:30 on 13 Nov: in UTC-5 this is already 14 Nov in UTC.
    expect(localToday(new Date(2026, 10, 13, 21, 30))).toBe("2026-11-13");
    expect(localToday(new Date(2027, 0, 5, 0, 5))).toBe("2027-01-05");
  });
});
