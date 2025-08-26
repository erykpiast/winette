#!/usr/bin/env pnpx tsx

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LabelDSL } from '../src/backend/types/label-generation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get production URL from environment or use default
const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://winette.vercel.app';

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

async function testProductionRenderer() {
  try {
    console.log(`Testing production renderer at: ${PRODUCTION_URL}`);
    console.log('Sending render request...');

    const startTime = Date.now();

    const response = await fetch(`${PRODUCTION_URL}/api/render-label`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dsl: sampleDSL,
        debug: false,
      }),
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const pngBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(pngBuffer);

    console.log(`✅ Response received in ${responseTime}ms`);
    console.log(`📊 Status: ${response.status}`);
    console.log(`📏 Content-Type: ${response.headers.get('Content-Type')}`);
    console.log(`⏱️  Server render time: ${response.headers.get('X-Render-Time')}ms`);
    console.log(`📦 PNG size: ${buffer.length} bytes`);
    console.log(`🗜️  Cache-Control: ${response.headers.get('Cache-Control')}`);

    // Save the result
    const outputDir = join(__dirname, '..', 'tmp');
    await mkdir(outputDir, { recursive: true });

    const outputPath = join(outputDir, 'production-render.png');
    await writeFile(outputPath, buffer);

    console.log(`💾 Production render saved to: ${outputPath}`);

    return {
      success: true,
      responseTime,
      size: buffer.length,
      serverRenderTime: response.headers.get('X-Render-Time'),
    };
  } catch (error) {
    console.error('❌ Production test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function runLoadTest() {
  console.log('\n🔄 Running load test (3 concurrent requests)...');

  const promises = Array.from({ length: 3 }, (_, i) => testSingleRequest(i + 1));

  const results = await Promise.all(promises);

  const successful = results.filter((r) => r.success).length;
  const avgTime = results.filter((r) => r.success).reduce((sum, r) => sum + r.responseTime, 0) / successful;

  console.log(`\n📈 Load test results:`);
  console.log(`   Success rate: ${successful}/3 (${Math.round((successful / 3) * 100)}%)`);
  console.log(`   Average response time: ${Math.round(avgTime)}ms`);
}

async function testSingleRequest(requestNumber: number) {
  try {
    const startTime = Date.now();

    const response = await fetch(`${PRODUCTION_URL}/api/render-label`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dsl: sampleDSL,
        debug: false,
      }),
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    console.log(`   Request ${requestNumber}: ✅ ${responseTime}ms (${Buffer.from(buffer).length} bytes)`);

    return { success: true, responseTime };
  } catch (error) {
    console.log(`   Request ${requestNumber}: ❌ ${error instanceof Error ? error.message : 'Failed'}`);
    return { success: false, responseTime: 0 };
  }
}

async function main() {
  console.log('🚀 Production Renderer Test\n');

  // Single request test
  await testProductionRenderer();

  // Load test
  await runLoadTest();

  console.log('\n✨ Test complete!');
}

main();
