import Link from 'next/link';

export default function SiteHeader() {
  return (
    <header className="w-full border-b border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-black/40 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight">Task Editor</Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="hover:underline underline-offset-4">Home</Link>
          <Link href="/requests" className="hover:underline underline-offset-4">Requests</Link>
        </nav>
      </div>
    </header>
  );
}
