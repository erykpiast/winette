#!/usr/bin/env pnpx tsx

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToPng } from '../src/backend/lib/renderer.js';
import type { LabelDSL } from '../src/backend/types/label-generation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sampleDSL: LabelDSL = {
  version: '1',
  canvas: {
    width: 400,
    height: 600,
    dpi: 144,
    background: '#f8f7f4',
  },
  palette: {
    primary: '#8B0000',
    secondary: '#4A4A4A',
    accent: '#DAA520',
    background: '#f8f7f4',
    temperature: 'warm',
    contrast: 'high',
  },
  typography: {
    primary: {
      family: 'Times New Roman',
      weight: 700,
      style: 'normal',
      letterSpacing: 0.02,
    },
    secondary: {
      family: 'Arial',
      weight: 400,
      style: 'normal',
      letterSpacing: 0.05,
    },
    hierarchy: {
      producerEmphasis: 'dominant',
      vintageProminence: 'featured',
      regionDisplay: 'prominent',
    },
  },
  assets: [],
  elements: [
    {
      id: 'producer',
      type: 'text',
      bounds: { x: 0.1, y: 0.05, w: 0.8, h: 0.12 },
      z: 10,
      text: 'CHATEAU MARGAUX',
      font: 'primary',
      color: 'primary',
      align: 'center',
      fontSize: 22,
      lineHeight: 1.1,
      maxLines: 1,
      textTransform: 'uppercase',
    },
    {
      id: 'wine-name',
      type: 'text',
      bounds: { x: 0.1, y: 0.25, w: 0.8, h: 0.18 },
      z: 9,
      text: 'Margaux',
      font: 'secondary',
      color: 'secondary',
      align: 'center',
      fontSize: 36,
      lineHeight: 1.2,
      maxLines: 2,
      textTransform: 'none',
    },
    {
      id: 'vintage',
      type: 'text',
      bounds: { x: 0.1, y: 0.5, w: 0.8, h: 0.08 },
      z: 8,
      text: '2018',
      font: 'primary',
      color: 'accent',
      align: 'center',
      fontSize: 28,
      lineHeight: 1.0,
      maxLines: 1,
      textTransform: 'none',
    },
    {
      id: 'divider',
      type: 'shape',
      bounds: { x: 0.25, y: 0.62, w: 0.5, h: 0.002 },
      z: 5,
      shape: 'line',
      color: 'primary',
      strokeWidth: 1,
      rotation: 0,
    },
    {
      id: 'appellation',
      type: 'text',
      bounds: { x: 0.1, y: 0.7, w: 0.8, h: 0.06 },
      z: 7,
      text: 'APPELLATION MARGAUX CONTRÔLÉE',
      font: 'secondary',
      color: 'secondary',
      align: 'center',
      fontSize: 12,
      lineHeight: 1.2,
      maxLines: 1,
      textTransform: 'uppercase',
    },
    {
      id: 'region',
      type: 'text',
      bounds: { x: 0.1, y: 0.82, w: 0.8, h: 0.06 },
      z: 6,
      text: 'Bordeaux, France',
      font: 'secondary',
      color: 'secondary',
      align: 'center',
      fontSize: 14,
      lineHeight: 1.0,
      maxLines: 1,
      textTransform: 'none',
    },
    {
      id: 'frame',
      type: 'shape',
      bounds: { x: 0.05, y: 0.02, w: 0.9, h: 0.96 },
      z: 1,
      shape: 'rect',
      color: 'primary',
      strokeWidth: 2,
      rotation: 0,
    },
  ],
};

async function main() {
  try {
    console.log('Rendering sample label...');
    const startTime = Date.now();

    const pngBuffer = await renderToPng(sampleDSL, { debug: true });

    const renderTime = Date.now() - startTime;
    console.log(`Rendered in ${renderTime}ms, output size: ${pngBuffer.length} bytes`);

    const outputDir = join(__dirname, '..', 'tmp');
    await mkdir(outputDir, { recursive: true });

    const outputPath = join(outputDir, 'sample-label.png');
    await writeFile(outputPath, pngBuffer);

    console.log(`Sample label saved to: ${outputPath}`);
  } catch (error) {
    console.error('Rendering failed:', error);
    process.exit(1);
  }
}

main();
