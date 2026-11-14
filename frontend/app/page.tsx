import DocumentCreator from "@/components/DocumentCreator";

export default function Home() {
  return (
    <main className="flex-1">
      <header className="no-print border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <h1 className="text-2xl font-semibold text-zinc-900">Legal Document Creator</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Chat with the assistant and your agreement fills in live. Download it when you&apos;re done.
          </p>
        </div>
      </header>
      <DocumentCreator />
      <footer className="no-print mx-auto max-w-7xl px-4 pb-8 text-xs text-zinc-500">
        Based on Common Paper standard agreements, used under{" "}
        <a className="underline" href="https://creativecommons.org/licenses/by/4.0/">
          CC BY 4.0
        </a>
        . This is a prototype and not legal advice.
      </footer>
    </main>
  );
}
