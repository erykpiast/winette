#!/usr/bin/env tsx

/**
 * Simple test to check if MockImageAdapter produces actual images in renders
 */

import { writeFileSync } from 'fs';
import { MockImageAdapter } from '#backend/lib/langchain-pipeline/index.js';
import { renderToPng } from '#backend/lib/renderer.js';
import type { LabelDSL } from '#backend/types/label-generation.js';

async function testMockImages() {
  console.log('🖼️ Testing MockImageAdapter with different purposes...\n');

  const mockAdapter = new MockImageAdapter();

  // Generate some mock images with different purposes
  const backgroundImage = await mockAdapter.generate({
    id: 'test-bg',
    purpose: 'background',
    prompt: 'Beautiful vineyard landscape',
    aspect: '4:3',
  });

  const foregroundImage = await mockAdapter.generate({
    id: 'test-fg',
    purpose: 'foreground',
    prompt: 'Wine grapes',
    aspect: '3:2',
  });

  const decorationImage = await mockAdapter.generate({
    id: 'test-dec',
    purpose: 'decoration',
    prompt: 'Wine glass',
    aspect: '1:1',
  });

  console.log('Generated images:');
  console.log(`  Background: ${backgroundImage.url.slice(0, 50)}...`);
  console.log(`  Foreground: ${foregroundImage.url.slice(0, 50)}...`);
  console.log(`  Decoration: ${decorationImage.url.slice(0, 50)}...\n`);

  // Create a simple DSL with these images
  const testDSL: LabelDSL = {
    version: '1',
    canvas: {
      width: 300,
      height: 400,
      dpi: 96,
      background: '#f5f5f5',
    },
    palette: {
      primary: '#722F37',
      secondary: '#D4AF37',
      accent: '#2F4F2F',
      background: '#F5F5DC',
      temperature: 'warm',
      contrast: 'medium',
    },
    typography: {
      primary: {
        family: 'serif',
        weight: 600,
        style: 'normal',
        letterSpacing: 0.02,
      },
      secondary: {
        family: 'serif',
        weight: 400,
        style: 'normal',
        letterSpacing: 0.01,
      },
      hierarchy: {
        producerEmphasis: 'balanced',
        vintageProminence: 'featured',
        regionDisplay: 'integrated',
      },
    },
    elements: [
      {
        id: 'background',
        type: 'image',
        bounds: { x: 0, y: 0, w: 1, h: 0.6 },
        z: 0,
        assetId: 'test-bg',
        fit: 'cover',
        opacity: 0.8,
        rotation: 0,
      },
      {
        id: 'decoration',
        type: 'image',
        bounds: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 },
        z: 1,
        assetId: 'test-dec',
        fit: 'contain',
        opacity: 0.9,
        rotation: 0,
      },
      {
        id: 'foreground',
        type: 'image',
        bounds: { x: 0.6, y: 0.7, w: 0.35, h: 0.25 },
        z: 2,
        assetId: 'test-fg',
        fit: 'cover',
        opacity: 1.0,
        rotation: 0,
      },
      {
        id: 'title',
        type: 'text',
        bounds: { x: 0.1, y: 0.65, w: 0.8, h: 0.1 },
        z: 3,
        text: 'TEST WINE LABEL',
        font: 'primary',
        fontSize: 24,
        color: 'primary',
        align: 'center',
        lineHeight: 1.2,
        maxLines: 1,
        textTransform: 'uppercase',
      },
    ],
    assets: [
      {
        id: 'test-bg',
        type: 'image',
        url: backgroundImage.url,
        width: backgroundImage.width,
        height: backgroundImage.height,
      },
      {
        id: 'test-fg',
        type: 'image',
        url: foregroundImage.url,
        width: foregroundImage.width,
        height: foregroundImage.height,
      },
      {
        id: 'test-dec',
        type: 'image',
        url: decorationImage.url,
        width: decorationImage.width,
        height: decorationImage.height,
      },
    ],
  };

  console.log('🎨 Rendering test label...');
  const pngBuffer = await renderToPng(testDSL, { debug: false });

  const filename = `temp/test-mock-images-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
  writeFileSync(filename, pngBuffer);

  console.log(`✅ Test render saved: ${filename}`);
  console.log(`📊 File size: ${pngBuffer.length} bytes`);
  console.log(
    '\n✨ Test completed! Check the rendered image to see if actual mock images appear instead of placeholders.',
  );
}

// Run the test
testMockImages().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
