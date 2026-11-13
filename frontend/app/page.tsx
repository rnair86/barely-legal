import MndaCreator from "@/components/MndaCreator";
import { getMndaTemplates } from "@/lib/templates";

export default async function Home() {
  const { coverPage, standardTerms } = await getMndaTemplates();

  return (
    <main className="flex-1">
      <header className="no-print border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <h1 className="text-2xl font-semibold text-zinc-900">Mutual NDA Creator</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Fill in the details and the Mutual Non-Disclosure Agreement updates live. Download it when you&apos;re done.
          </p>
        </div>
      </header>
      <MndaCreator coverTemplate={coverPage} termsTemplate={standardTerms} />
      <footer className="no-print mx-auto max-w-7xl px-4 pb-8 text-xs text-zinc-500">
        Based on the Common Paper Mutual NDA (Version 1.0), used under{" "}
        <a className="underline" href="https://creativecommons.org/licenses/by/4.0/">
          CC BY 4.0
        </a>
        . This is a prototype and not legal advice.
      </footer>
    </main>
  );
}
