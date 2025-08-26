import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import type { Element, LabelDSL } from '#backend/types/label-generation.js';

export interface RenderOptions {
  debug?: boolean;
  timeout?: number;
}

export async function renderToPng(dsl: LabelDSL, options: RenderOptions = {}): Promise<Buffer> {
  const { debug = false, timeout = 30000 } = options;

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;

  try {
    browser = await puppeteer.launch({
      args: process.env.NODE_ENV === 'production' 
        ? chromium.args
        : ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 1024 },
      executablePath: process.env.NODE_ENV === 'production' 
        ? await chromium.executablePath()
        : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true,
    });

    const page = await browser.newPage();

    const scale = dsl.canvas.dpi / 96;
    const widthPx = Math.round(dsl.canvas.width * scale);
    const heightPx = Math.round(dsl.canvas.height * scale);

    await page.setViewport({
      width: widthPx,
      height: heightPx,
      deviceScaleFactor: 1,
    });

    const html = generateHTML(dsl, widthPx, heightPx);

    if (debug) {
      console.log('Generated HTML:', html);
    }

    await page.setContent(html, { waitUntil: 'networkidle0', timeout });

    const screenshotBuffer = await page.screenshot({
      type: 'png',
      clip: {
        x: 0,
        y: 0,
        width: widthPx,
        height: heightPx,
      },
    });

    return screenshotBuffer as Buffer;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function generateHTML(dsl: LabelDSL, widthPx: number, heightPx: number): string {
  const sortedElements = [...dsl.elements].sort((a, b) => a.z - b.z);
  const elementsHtml = sortedElements.map((element) => generateElementHTML(element, dsl)).join('\n');

  let fontLinks = '';
  if (dsl.fonts?.primaryUrl) {
    fontLinks += `<link rel="preload" as="style" href="${dsl.fonts.primaryUrl}">\n`;
    fontLinks += `<link rel="stylesheet" href="${dsl.fonts.primaryUrl}">\n`;
  }
  if (dsl.fonts?.secondaryUrl) {
    fontLinks += `<link rel="preload" as="style" href="${dsl.fonts.secondaryUrl}">\n`;
    fontLinks += `<link rel="stylesheet" href="${dsl.fonts.secondaryUrl}">\n`;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      width: ${widthPx}px;
      height: ${heightPx}px;
      overflow: hidden;
      background: ${dsl.canvas.background};
      position: relative;
    }
    
    .canvas {
      width: ${widthPx}px;
      height: ${heightPx}px;
      position: relative;
      background: ${dsl.canvas.background};
    }
    
    .element {
      position: absolute;
      overflow: hidden;
    }
    
    .text-element {
      display: flex;
      align-items: center;
      word-wrap: break-word;
      overflow-wrap: break-word;
      hyphens: auto;
    }
    
    .image-element img {
      width: 100%;
      height: 100%;
      display: block;
    }
    
    .shape-element {
      border-style: solid;
    }
  </style>
  ${fontLinks}
</head>
<body>
  <div class="canvas">
    ${elementsHtml}
  </div>
</body>
</html>`.trim();
}

function generateElementHTML(element: Element, dsl: LabelDSL): string {
  const scale = dsl.canvas.dpi / 96;
  const left = Math.round(element.bounds.x * dsl.canvas.width * scale);
  const top = Math.round(element.bounds.y * dsl.canvas.height * scale);
  const width = Math.round(element.bounds.w * dsl.canvas.width * scale);
  const height = Math.round(element.bounds.h * dsl.canvas.height * scale);

  const baseStyle = `
    left: ${left}px;
    top: ${top}px;
    width: ${width}px;
    height: ${height}px;
    z-index: ${element.z};
  `;

  switch (element.type) {
    case 'text': {
      const typography = element.font === 'primary' ? dsl.typography.primary : dsl.typography.secondary;
      const color = dsl.palette[element.color];

      const fontStyle = `
        font-family: '${typography.family}', serif;
        font-weight: ${typography.weight};
        font-style: ${typography.style};
        letter-spacing: ${typography.letterSpacing}em;
        color: ${color};
        font-size: ${element.fontSize * scale}px;
        line-height: ${element.lineHeight};
        text-align: ${element.align};
        text-transform: ${element.textTransform};
      `;

      const textContent = element.text;

      if (element.maxLines > 1) {
        const style = `
          ${baseStyle}
          ${fontStyle}
          display: -webkit-box;
          -webkit-line-clamp: ${element.maxLines};
          -webkit-box-orient: vertical;
          overflow: hidden;
        `;
        return `<div class="element text-element" style="${style}">${escapeHtml(textContent)}</div>`;
      } else {
        const style = `
          ${baseStyle}
          ${fontStyle}
          white-space: nowrap;
          text-overflow: ellipsis;
        `;
        return `<div class="element text-element" style="${style}">${escapeHtml(textContent)}</div>`;
      }
    }

    case 'image': {
      const asset = dsl.assets.find((a) => a.id === element.assetId);
      if (!asset) {
        return `<div class="element" style="${baseStyle} background: #ff0000;"></div>`;
      }

      const transform = element.rotation !== 0 ? `transform: rotate(${element.rotation}deg);` : '';
      const opacity = element.opacity !== 1 ? `opacity: ${element.opacity};` : '';

      const objectFit = element.fit === 'cover' ? 'cover' : element.fit === 'fill' ? 'fill' : 'contain';

      const style = `
        ${baseStyle}
        ${transform}
        ${opacity}
      `;

      const imgStyle = `object-fit: ${objectFit};`;

      return `<div class="element image-element" style="${style}"><img src="${asset.url}" style="${imgStyle}" alt=""></div>`;
    }

    case 'shape': {
      const color = dsl.palette[element.color];
      const transform = element.rotation !== 0 ? `transform: rotate(${element.rotation}deg);` : '';

      if (element.shape === 'rect') {
        const style = `
          ${baseStyle}
          ${transform}
          background: ${element.strokeWidth === 0 ? color : 'transparent'};
          border: ${element.strokeWidth * scale}px solid ${color};
        `;
        return `<div class="element shape-element" style="${style}"></div>`;
      } else if (element.shape === 'line') {
        const style = `
          ${baseStyle}
          ${transform}
          border-top: ${element.strokeWidth * scale}px solid ${color};
        `;
        return `<div class="element shape-element" style="${style}"></div>`;
      }

      return '';
    }

    default:
      return '';
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
