// SERVER-SIDE ONLY — post-generation SVG normalization
// Uses @xmldom/xmldom for safe XML manipulation. No path geometry changes.
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import type { Orientation, Preset } from './types';

const A4: Record<Orientation, { w: string; h: string; vw: number; vh: number }> = {
  portrait:  { w: '210mm', h: '297mm', vw: 210, vh: 297 },
  landscape: { w: '297mm', h: '210mm', vw: 297, vh: 210 },
};

// Rewrite only the FIRST <svg ...> open tag to enforce A4 attributes.
// Preserves all non-dimensional attributes; never touches nested <svg> inside <symbol>.
function ensureSvgOpenTag(svg: string, orientation: Orientation): string {
  const dim = A4[orientation];
  const match = svg.match(/<svg\b[^>]*>/i);
  if (!match) return svg;

  const openTag = match[0];

  // Strip existing dimensional/namespace attrs, then re-inject them.
  let rebuilt = openTag
    .replace(/\bwidth\s*=\s*(["'])[^"']*\1/gi, '')
    .replace(/\bheight\s*=\s*(["'])[^"']*\1/gi, '')
    .replace(/\bviewBox\s*=\s*(["'])[^"']*\1/gi, '')
    .replace(/\bxmlns\s*=\s*(["'])[^"']*\1/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/>$/, '');

  // Check if xlink:href is used anywhere — only include xlink namespace if so.
  const needsXlink = /xlink:href/i.test(svg);

  rebuilt =
    `${rebuilt}` +
    ` xmlns="http://www.w3.org/2000/svg"` +
    (needsXlink ? ` xmlns:xlink="http://www.w3.org/1999/xlink"` : '') +
    ` width="${dim.w}" height="${dim.h}" viewBox="0 0 ${dim.vw} ${dim.vh}">`;

  return svg.replace(openTag, rebuilt);
}

// Strip all model-provided <style> blocks, then inject our own global style.
function injectGlobalStyle(doc: Document): void {
  const svgEl = doc.documentElement;
  if (!svgEl || svgEl.tagName.toLowerCase() !== 'svg') return;

  // Remove existing <style> blocks (models emit unreliable CSS).
  const styles = Array.from(svgEl.getElementsByTagName('style'));
  for (const s of styles) s.parentNode?.removeChild(s);

  const style = doc.createElement('style');
  style.appendChild(
    doc.createTextNode(
      'path, circle, rect, ellipse, polyline, polygon {\n' +
      '  vector-effect: non-scaling-stroke;\n' +
      '  stroke-linecap: round;\n' +
      '  stroke-linejoin: round;\n' +
      '}'
    )
  );

  const first = svgEl.firstChild;
  if (first) svgEl.insertBefore(style, first);
  else svgEl.appendChild(style);
}

// Remove <image>, <linearGradient>, <radialGradient> and fix broken url() fill references.
function stripImagesAndGradients(doc: Document): void {
  const svgEl = doc.documentElement;
  if (!svgEl) return;

  const removeAll = (tag: string) => {
    const nodes = Array.from(svgEl.getElementsByTagName(tag));
    for (const n of nodes) n.parentNode?.removeChild(n);
  };

  removeAll('image');
  removeAll('linearGradient');
  removeAll('radialGradient');

  // Fix fill/stroke references to now-removed gradients.
  const allEls = Array.from(svgEl.getElementsByTagName('*')) as Element[];
  for (const el of allEls) {
    const fill = el.getAttribute('fill');
    if (fill && /url\s*\(#/i.test(fill)) el.setAttribute('fill', 'none');

    const stroke = el.getAttribute('stroke');
    if (stroke && /url\s*\(#/i.test(stroke)) el.setAttribute('stroke', '#000000');
  }
}

// Preset-aware stroke/fill normalization at the element level.
// activity_dots: skip entirely — dots need fill="#000", guides need stroke="#cccccc".
// coloring_book / story_sketch: enforce black outlines, fill="none" (except background rect).
function normalizeStrokes(doc: Document, preset: Preset): void {
  if (preset === 'activity_dots') return;

  const svgEl = doc.documentElement;
  if (!svgEl) return;

  const shapeTagNames = ['path', 'circle', 'rect', 'ellipse', 'polyline', 'polygon'];
  const nodes: Element[] = [];
  for (const tag of shapeTagNames) {
    nodes.push(...(Array.from(svgEl.getElementsByTagName(tag)) as Element[]));
  }

  for (const el of nodes) {
    // Detect background rect: full-page rect with white/white fill.
    if (el.tagName.toLowerCase() === 'rect') {
      const w = parseFloat(el.getAttribute('width') ?? '0');
      const h = parseFloat(el.getAttribute('height') ?? '0');
      const fillAttr = (el.getAttribute('fill') ?? '').toLowerCase().trim();
      const isBgRect =
        (w >= 200 || w === 0) &&
        (h >= 270 || h === 0) &&
        (fillAttr === 'white' || fillAttr === '#fff' || fillAttr === '#ffffff' || fillAttr === '');
      if (isBgRect) {
        el.setAttribute('fill', '#ffffff');
        el.setAttribute('stroke', 'none');
        continue;
      }
    }

    const stroke = (el.getAttribute('stroke') ?? '').trim().toLowerCase();
    const strokeNone = stroke === '' || stroke === 'none';
    if (strokeNone) el.setAttribute('stroke', '#000000');

    const sw = (el.getAttribute('stroke-width') ?? '').trim();
    if (!sw) el.setAttribute('stroke-width', '1.5');

    el.setAttribute('fill', 'none');
  }
}

// Close open exterior outline paths (stroke-width 1.2+) by appending Z.
// Interior detail lines (thin strokes, fur, smiles) are intentionally open — do not close them.
// Only applied to coloring_book and story_sketch presets.
function closeOpenPaths(doc: Document, preset: Preset): number {
  if (preset === 'activity_dots') return 0;

  const paths = Array.from(doc.documentElement.getElementsByTagName('path')) as Element[];
  let closed = 0;

  for (const el of paths) {
    const d = (el.getAttribute('d') ?? '').trim();
    if (!d) continue;

    // Only close paths that look like exterior outlines (thick stroke or no stroke-width set yet).
    const sw = parseFloat(el.getAttribute('stroke-width') ?? '1.5');
    if (sw < 1.2) continue; // skip detail/interior lines

    const lastLetter = (d.match(/[a-zA-Z](?=[^a-zA-Z]*$)/) ?? [])[0];
    if (lastLetter && lastLetter !== 'Z' && lastLetter !== 'z') {
      el.setAttribute('d', d + ' Z');
      closed++;
    }
  }

  if (closed > 0) console.log(`[svg-normalize] auto-closed ${closed} exterior outline path(s)`);
  return closed;
}

// Detect open paths by checking the last command letter in each path's d attribute.
export function hasOpenPaths(svg: string): boolean {
  const pathTagRe = /<path\b[^>]*>/gi;
  let m: RegExpExecArray | null;

  while ((m = pathTagRe.exec(svg)) !== null) {
    const tag = m[0];
    const dMatch = tag.match(/\bd\s*=\s*(["'])([\s\S]*?)\1/i);
    if (!dMatch) continue;

    const d = dMatch[2].trim();
    if (!d) continue;

    const lastLetter = (d.match(/[a-zA-Z](?=[^a-zA-Z]*$)/) ?? [])[0];
    if (!lastLetter) continue;

    if (lastLetter !== 'Z' && lastLetter !== 'z') {
      console.warn(`[svg-normalize] open path detected (last command: '${lastLetter}')`);
      return true;
    }
  }

  return false;
}

export function normalizeSVG(svg: string, orientation: Orientation, preset: Preset): string {
  // Step 1: rewrite outer <svg> tag via conservative regex (first occurrence only).
  const rewritten = ensureSvgOpenTag(svg, orientation);

  // Steps 2–5: use xmldom for safe XML manipulation.
  const doc = new DOMParser().parseFromString(rewritten, 'image/svg+xml');

  injectGlobalStyle(doc);
  stripImagesAndGradients(doc);
  normalizeStrokes(doc, preset);
  closeOpenPaths(doc, preset);

  const result = new XMLSerializer().serializeToString(doc);

  console.log(`[svg-normalize] A4 ${orientation} enforced, preset=${preset}`);
  return result;
}
