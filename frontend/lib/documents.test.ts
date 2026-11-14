import { describe, expect, it } from "vitest";
import {
  applyTurn,
  buildGenericDocument,
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

describe("prepareBody / buildGenericDocument", () => {
  it("strips helper spans and puts lettered items on their own lines", () => {
    const out = prepareBody(doc.body);
    expect(out).not.toContain("<span");
    expect(out).toContain("a. First  \n        b. Second");
  });

  it("builds cover followed by the body", () => {
    const full = buildGenericDocument(doc, {});
    expect(full.indexOf("## Key Terms")).toBeLessThan(full.indexOf("First"));
    expect(full.endsWith("\n")).toBe(true);
  });
});
