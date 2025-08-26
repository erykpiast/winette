import fs from 'fs/promises';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { renderToPng } from '#backend/lib/renderer.js';
import type { LabelDSL } from '#backend/types/label-generation.js';

describe.skip('renderToPng', () => {
  const testOutputDir = path.join(process.cwd(), 'tmp', 'test-renders');

  beforeAll(async () => {
    await fs.mkdir(testOutputDir, { recursive: true });
  });

  afterAll(async () => {
    try {
      await fs.rm(testOutputDir, { recursive: true });
    } catch (_error) {
      // Ignore cleanup errors
    }
  });

  const createBaseDSL = (): LabelDSL => ({
    version: '1',
    canvas: {
      width: 400,
      height: 600,
      dpi: 144,
      background: '#ffffff',
    },
    palette: {
      primary: '#8B0000',
      secondary: '#4A4A4A',
      accent: '#DAA520',
      background: '#ffffff',
      temperature: 'warm',
      contrast: 'high',
    },
    typography: {
      primary: {
        family: 'serif',
        weight: 400,
        style: 'normal',
        letterSpacing: 0,
      },
      secondary: {
        family: 'sans-serif',
        weight: 300,
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
    elements: [],
  });

  it('renders empty canvas', async () => {
    const dsl = createBaseDSL();

    const pngBuffer = await renderToPng(dsl);
    expect(pngBuffer).toBeInstanceOf(Buffer);
    expect(pngBuffer.length).toBeGreaterThan(0);

    const outputPath = path.join(testOutputDir, 'empty-canvas.png');
    await fs.writeFile(outputPath, pngBuffer);
  }, 15000);

  it('renders text element', async () => {
    const dsl = createBaseDSL();
    dsl.elements = [
      {
        id: 'text-1',
        type: 'text',
        bounds: { x: 0.1, y: 0.1, w: 0.8, h: 0.2 },
        z: 1,
        text: 'Wine Producer',
        font: 'primary',
        color: 'primary',
        align: 'center',
        fontSize: 24,
        lineHeight: 1.2,
        maxLines: 1,
        textTransform: 'uppercase',
      },
    ];

    const pngBuffer = await renderToPng(dsl);
    expect(pngBuffer).toBeInstanceOf(Buffer);
    expect(pngBuffer.length).toBeGreaterThan(0);

    const outputPath = path.join(testOutputDir, 'text-element.png');
    await fs.writeFile(outputPath, pngBuffer);
  }, 15000);

  it('renders shape element', async () => {
    const dsl = createBaseDSL();
    dsl.elements = [
      {
        id: 'shape-1',
        type: 'shape',
        bounds: { x: 0.2, y: 0.4, w: 0.6, h: 0.1 },
        z: 1,
        shape: 'rect',
        color: 'accent',
        strokeWidth: 2,
        rotation: 0,
      },
      {
        id: 'line-1',
        type: 'shape',
        bounds: { x: 0.1, y: 0.6, w: 0.8, h: 0.005 },
        z: 2,
        shape: 'line',
        color: 'primary',
        strokeWidth: 1,
        rotation: 0,
      },
    ];

    const pngBuffer = await renderToPng(dsl);
    expect(pngBuffer).toBeInstanceOf(Buffer);
    expect(pngBuffer.length).toBeGreaterThan(0);

    const outputPath = path.join(testOutputDir, 'shape-elements.png');
    await fs.writeFile(outputPath, pngBuffer);
  }, 15000);

  it('renders complex layout with multiple elements', async () => {
    const dsl = createBaseDSL();
    dsl.elements = [
      {
        id: 'title',
        type: 'text',
        bounds: { x: 0.1, y: 0.05, w: 0.8, h: 0.15 },
        z: 10,
        text: 'Premium Vineyard',
        font: 'primary',
        color: 'primary',
        align: 'center',
        fontSize: 28,
        lineHeight: 1.1,
        maxLines: 1,
        textTransform: 'uppercase',
      },
      {
        id: 'wine-name',
        type: 'text',
        bounds: { x: 0.1, y: 0.25, w: 0.8, h: 0.2 },
        z: 9,
        text: 'Cabernet Sauvignon',
        font: 'secondary',
        color: 'secondary',
        align: 'center',
        fontSize: 32,
        lineHeight: 1.2,
        maxLines: 2,
        textTransform: 'none',
      },
      {
        id: 'vintage',
        type: 'text',
        bounds: { x: 0.1, y: 0.5, w: 0.8, h: 0.1 },
        z: 8,
        text: '2020',
        font: 'primary',
        color: 'accent',
        align: 'center',
        fontSize: 24,
        lineHeight: 1.0,
        maxLines: 1,
        textTransform: 'none',
      },
      {
        id: 'divider',
        type: 'shape',
        bounds: { x: 0.3, y: 0.65, w: 0.4, h: 0.002 },
        z: 5,
        shape: 'line',
        color: 'primary',
        strokeWidth: 1,
        rotation: 0,
      },
      {
        id: 'region',
        type: 'text',
        bounds: { x: 0.1, y: 0.75, w: 0.8, h: 0.08 },
        z: 7,
        text: 'Napa Valley',
        font: 'secondary',
        color: 'secondary',
        align: 'center',
        fontSize: 16,
        lineHeight: 1.0,
        maxLines: 1,
        textTransform: 'uppercase',
      },
    ];

    const pngBuffer = await renderToPng(dsl);
    expect(pngBuffer).toBeInstanceOf(Buffer);
    expect(pngBuffer.length).toBeGreaterThan(0);

    const outputPath = path.join(testOutputDir, 'complex-layout.png');
    await fs.writeFile(outputPath, pngBuffer);
  }, 15000);

  it('respects DPI scaling', async () => {
    const baseDSL = createBaseDSL();
    baseDSL.elements = [
      {
        id: 'test-text',
        type: 'text',
        bounds: { x: 0.1, y: 0.4, w: 0.8, h: 0.2 },
        z: 1,
        text: 'DPI Test',
        font: 'primary',
        color: 'primary',
        align: 'center',
        fontSize: 24,
        lineHeight: 1.2,
        maxLines: 1,
        textTransform: 'none',
      },
    ];

    const lowDpiDSL = { ...baseDSL, canvas: { ...baseDSL.canvas, dpi: 96 } };
    const highDpiDSL = { ...baseDSL, canvas: { ...baseDSL.canvas, dpi: 288 } };

    const [lowDpiBuffer, highDpiBuffer] = await Promise.all([renderToPng(lowDpiDSL), renderToPng(highDpiDSL)]);

    expect(lowDpiBuffer.length).toBeLessThan(highDpiBuffer.length);

    await fs.writeFile(path.join(testOutputDir, 'low-dpi.png'), lowDpiBuffer);
    await fs.writeFile(path.join(testOutputDir, 'high-dpi.png'), highDpiBuffer);
  }, 20000);

  it('handles text overflow correctly', async () => {
    const dsl = createBaseDSL();
    dsl.elements = [
      {
        id: 'overflow-single',
        type: 'text',
        bounds: { x: 0.1, y: 0.1, w: 0.3, h: 0.1 },
        z: 1,
        text: 'This is a very long text that should overflow',
        font: 'primary',
        color: 'primary',
        align: 'left',
        fontSize: 16,
        lineHeight: 1.2,
        maxLines: 1,
        textTransform: 'none',
      },
      {
        id: 'overflow-multi',
        type: 'text',
        bounds: { x: 0.1, y: 0.3, w: 0.3, h: 0.2 },
        z: 2,
        text: 'This is a very long text that should wrap to multiple lines but still respect maxLines',
        font: 'secondary',
        color: 'secondary',
        align: 'left',
        fontSize: 14,
        lineHeight: 1.4,
        maxLines: 3,
        textTransform: 'none',
      },
    ];

    const pngBuffer = await renderToPng(dsl);
    expect(pngBuffer).toBeInstanceOf(Buffer);

    const outputPath = path.join(testOutputDir, 'text-overflow.png');
    await fs.writeFile(outputPath, pngBuffer);
  }, 15000);

  it('validates element bounds', async () => {
    const dsl = createBaseDSL();
    dsl.elements = [
      {
        id: 'valid-bounds',
        type: 'text',
        bounds: { x: 0, y: 0, w: 1, h: 1 },
        z: 1,
        text: 'Valid bounds',
        font: 'primary',
        color: 'primary',
        align: 'center',
        fontSize: 16,
        lineHeight: 1.2,
        maxLines: 1,
        textTransform: 'none',
      },
    ];

    const pngBuffer = await renderToPng(dsl);
    expect(pngBuffer).toBeInstanceOf(Buffer);
    expect(pngBuffer.length).toBeGreaterThan(0);
  }, 15000);
});
