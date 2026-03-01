'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import type { DrawingResult } from '@/lib/types';

export default function DrawingDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [drawing, setDrawing] = useState<DrawingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [svgUrl, setSvgUrl] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [similar, setSimilar] = useState<DrawingResult[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/drawings/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setDrawing(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Fetch signed URLs once drawing is loaded
  useEffect(() => {
    if (!drawing) return;

    const fetchUrl = (path: string, bucket: string, setter: (url: string) => void) => {
      fetch('/api/files/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, bucket }),
      })
        .then((r) => r.json())
        .then((d) => d.url && setter(d.url))
        .catch(() => null);
    };

    fetchUrl(drawing.svg_path, 'drawings-svg', setSvgUrl);
    fetchUrl(drawing.pdf_path, 'drawings-pdf', setPdfUrl);
  }, [drawing]);

  const loadSimilar = useCallback(async () => {
    setSimilarLoading(true);
    try {
      const res = await fetch(`/api/drawings/${id}/similar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 6 }),
      });
      const data = await res.json();
      if (data.results) setSimilar(data.results);
    } catch {
      // ignore
    } finally {
      setSimilarLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-61px)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#ede9e3] border-t-[#f97316]" />
      </div>
    );
  }

  if (error || !drawing) {
    return (
      <div className="flex min-h-[calc(100vh-61px)] flex-col items-center justify-center gap-4">
        <p style={{ color: '#4a4440' }}>{error ?? 'Drawing not found'}</p>
        <Link href="/library" className="btn-secondary">Back to Library</Link>
      </div>
    );
  }

  const meta = drawing.metadata;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/library" className="btn-ghost">← Library</Link>
        <h1 className="flex-1 font-display text-2xl font-semibold" style={{ color: '#1c1916' }}>{drawing.title}</h1>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        {/* Preview */}
        <div>
          <div
            className="overflow-hidden rounded-xl"
            style={{
              maxWidth: drawing.orientation === 'portrait' ? '420px' : '600px',
              border: '2px solid #ede9e3',
              background: '#ffffff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            {svgUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={svgUrl}
                alt={drawing.title}
                className="h-auto w-full"
                style={{ aspectRatio: drawing.orientation === 'portrait' ? '210/297' : '297/210' }}
              />
            ) : (
              <div
                className="animate-pulse"
                style={{ aspectRatio: drawing.orientation === 'portrait' ? '210/297' : '297/210', background: '#f7f5f2' }}
              />
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {svgUrl && <a href={svgUrl} download={`${drawing.title}.svg`} className="btn-secondary">Download SVG</a>}
            {pdfUrl && <a href={pdfUrl} download={`${drawing.title}.pdf`} className="btn-secondary">Download PDF</a>}
            <button onClick={loadSimilar} disabled={similarLoading} className="btn-ghost">
              {similarLoading ? 'Loading…' : 'Find similar'}
            </button>
          </div>
        </div>

        {/* Metadata Panel */}
        <div className="space-y-4">
          <div className="card p-4 space-y-3">
            <p className="section-label">Drawing Info</p>
            <MetaRow label="Orientation" value={drawing.orientation} />
            <MetaRow label="Created" value={new Date(drawing.created_at).toLocaleDateString()} />
          </div>

          <div className="card p-4">
            <p className="section-label">Prompt</p>
            <p className="text-sm leading-relaxed" style={{ color: '#2e2a27' }}>{drawing.prompt}</p>
          </div>

          {meta && (
            <>
              {meta.depiction_summary && (
                <div className="card p-4">
                  <p className="section-label">Summary</p>
                  <p className="text-sm leading-relaxed" style={{ color: '#2e2a27' }}>{meta.depiction_summary}</p>
                </div>
              )}

              {meta.tags?.length > 0 && (
                <div className="card p-4">
                  <p className="section-label">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {meta.tags.map(tag => (
                      <span key={tag} className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'rgba(168,85,247,0.12)', color: '#7c3aed' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {meta.objects?.length > 0 && (
                <div className="card p-4">
                  <p className="section-label">Objects</p>
                  <div className="space-y-2">
                    {meta.objects.slice(0, 8).map((obj, i) => (
                      <div key={i} className="rounded-lg p-2" style={{ background: '#f7f5f2' }}>
                        <p className="text-xs font-bold" style={{ color: '#1c1916' }}>{obj.name}</p>
                        {obj.description && <p className="text-xs" style={{ color: '#4a4440' }}>{obj.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {similar.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 font-display text-xl font-semibold" style={{ color: '#1c1916' }}>Similar Drawings</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {similar.map(s => (
              <Link key={s.id} href={`/drawing/${s.id}`}
                className="block overflow-hidden rounded-xl transition-all hover:-translate-y-0.5"
                style={{ border: '2px solid #ede9e3', background: '#ffffff' }}
              >
                <div className={s.orientation === 'portrait' ? 'aspect-[210/297]' : 'aspect-[297/210]'} style={{ background: '#f7f5f2' }} />
                <div className="p-2">
                  <p className="truncate text-xs font-bold" style={{ color: '#1c1916' }}>{s.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs capitalize font-medium" style={{ color: '#9e978e' }}>{label}</span>
      <span className="text-right text-xs font-semibold" style={{ color: '#2e2a27' }}>{value}</span>
    </div>
  );
}
