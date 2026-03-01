// SERVER-SIDE ONLY — Puppeteer-based PDF + thumbnail generation
import type { Orientation } from './types';
import sharp from 'sharp';

async function getBrowser() {
  // In Netlify Functions / Lambda environment use @sparticuz/chromium
  // In local dev use system Chrome via puppeteer
  if (process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY) {
    const chromium = await import('@sparticuz/chromium');
    const puppeteer = await import('puppeteer-core');
    return puppeteer.default.launch({
      args: chromium.default.args,
      defaultViewport: chromium.default.defaultViewport,
      executablePath: await chromium.default.executablePath(),
      headless: true,
    });
  } else {
    const puppeteer = await import('puppeteer-core');
    // Local dev: point to local Chrome install
    const executablePath =
      process.env.PUPPETEER_EXECUTABLE_PATH ??
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    return puppeteer.default.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
}

export async function svgToPdf(svg: string, orientation: Orientation): Promise<Buffer> {
  const browser = await getBrowser();
  try {
    const page = await browser.newPage();

    const html = buildHtml(svg, orientation);
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: orientation === 'landscape',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

export async function svgToThumbnail(svg: string, orientation: Orientation): Promise<Buffer> {
  const browser = await getBrowser();
  try {
    const page = await browser.newPage();

    // Thumbnail at 400x566 (portrait) or 566x400 (landscape)
    const [width, height] =
      orientation === 'portrait' ? [400, 566] : [566, 400];
    await page.setViewport({ width, height, deviceScaleFactor: 1 });

    const html = buildHtml(svg, orientation);
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const screenshot = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width, height },
    });

    return Buffer.from(screenshot);
  } finally {
    await browser.close();
  }
}

// ── Image-based variants (for coloring_book / story_sketch presets) ────────────

export async function imageToPdf(imageBase64: string, orientation: Orientation): Promise<Buffer> {
  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(buildHtmlFromImage(imageBase64, orientation), { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: orientation === 'landscape',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

// Thumbnail via sharp — much faster than a Puppeteer screenshot for raster images.
export async function imageToThumbnail(imageBase64: string, orientation: Orientation): Promise<Buffer> {
  const [w, h] = orientation === 'portrait' ? [400, 566] : [566, 400];
  const inputBuffer = Buffer.from(imageBase64, 'base64');
  return sharp(inputBuffer)
    .resize(w, h, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();
}

function buildHtmlFromImage(imageBase64: string, orientation: Orientation): string {
  const [pageW, pageH] = orientation === 'portrait' ? ['210mm', '297mm'] : ['297mm', '210mm'];
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${pageW}; height: ${pageH}; background: white; overflow: hidden; }
  img { display: block; width: 100%; height: 100%; object-fit: contain; }
</style>
</head>
<body><img src="data:image/png;base64,${imageBase64}"/></body>
</html>`;
}

// ── SVG-based variants (for activity_dots preset) ───────────────────────────

function buildHtml(svg: string, orientation: Orientation): string {
  const [pageW, pageH] =
    orientation === 'portrait' ? ['210mm', '297mm'] : ['297mm', '210mm'];

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${pageW};
    height: ${pageH};
    background: white;
    overflow: hidden;
  }
  svg {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
</head>
<body>${svg}</body>
</html>`;
}
