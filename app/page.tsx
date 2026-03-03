import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex min-h-[calc(100vh-61px)] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 animate-bounce-soft text-6xl" aria-hidden="true">🤖</div>

      <h1 className="font-display text-5xl font-semibold sm:text-7xl" style={{ color: '#1c1916' }}>
        Robot Cooks Drawings
      </h1>

      <p className="mt-4 max-w-lg text-lg" style={{ color: '#4a4440' }}>
        Generate A4-printable coloring pages for kids. Export as PDF or image.
        Or explore the library of creations by other creative minds.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link href="/create" className="btn-primary">
          Start creating
        </Link>
        <Link href="/library" className="btn-secondary">
          Browse library
        </Link>
      </div>

      {/* 3-step feature strip */}
      <div className="mt-14 grid grid-cols-3 gap-8 max-w-lg w-full">
        <div className="flex flex-col items-center gap-2">
          <span className="text-4xl" aria-hidden="true">🖍️</span>
          <p className="text-sm font-bold" style={{ color: '#1c1916' }}>Choose a style</p>
          <p className="text-xs leading-snug" style={{ color: '#6b6460' }}>Coloring book, cartoon, or connect-the-dots</p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-4xl" aria-hidden="true">🤖</span>
          <p className="text-sm font-bold" style={{ color: '#1c1916' }}>AI generates it</p>
          <p className="text-xs leading-snug" style={{ color: '#6b6460' }}>High-quality line art in seconds</p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-4xl" aria-hidden="true">🖨️</span>
          <p className="text-sm font-bold" style={{ color: '#1c1916' }}>Print &amp; color</p>
          <p className="text-xs leading-snug" style={{ color: '#6b6460' }}>Download PNG or PDF, A4-ready</p>
        </div>
      </div>
    </div>
  );
}
