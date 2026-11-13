# Barely Legal — Mutual NDA Creator (frontend)

A Next.js prototype (Jira BL-3). The user fills in a form, the Mutual NDA updates live with their details, and they can download the finished document.

## How it works

- The NDA text comes from the repo's top-level [`templates/`](../templates) directory (`Mutual-NDA-coverpage.md` and `Mutual-NDA.md`), read once on the server by `lib/templates.ts`.
- `lib/mnda.ts` fills the cover page template with the form values (purpose, effective date, terms, governing law, jurisdiction, modifications and both parties' details). The legal wording is never edited; only placeholders, term checkboxes and the signature table are filled in.
- `components/MndaCreator.tsx` renders the form, a live preview, and the downloads:
  - **Download Markdown** saves the completed document as `Mutual-NDA.md`.
  - **Download PDF** opens the browser print dialog (choose "Save as PDF"); a print stylesheet hides the form.

## Getting started

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
```

Run it from the `frontend/` directory, because the app reads `../templates` relative to it.

## Scripts

| Command         | What it does                 |
| --------------- | ---------------------------- |
| `npm run dev`   | Start the dev server         |
| `npm run build` | Production build             |
| `npm test`      | Unit tests for `lib/mnda.ts` |
| `npm run lint`  | ESLint                       |

## License

The NDA templates are from [Common Paper](https://commonpaper.com) under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). This is a prototype and not legal advice.
