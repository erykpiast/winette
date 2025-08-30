import type { LabelDSL } from '../src/backend/types/label-generation.js';

// Mock DSL with realistic element IDs
const mockDSL: LabelDSL = {
  version: '1',
  canvas: {
    width: 400,
    height: 600,
    background: '#f5f5dc',
    dpi: 300,
  },
  palette: {
    primary: '#2c5530',
    secondary: '#8b4513',
    accent: '#d4af37',
    background: '#f5f5dc',
    temperature: 'warm',
    contrast: 'high',
  },
  typography: {
    primary: {
      family: 'Playfair Display',
      weight: 700,
      style: 'normal',
      letterSpacing: 0.02,
    },
    secondary: {
      family: 'Lato',
      weight: 400,
      style: 'normal',
      letterSpacing: 0.01,
    },
    hierarchy: {
      producerEmphasis: 'dominant',
      vintageProminence: 'featured',
      regionDisplay: 'integrated',
    },
  },
  assets: [],
  elements: [
    {
      id: 'producer',
      type: 'text',
      text: 'Château Example',
      font: 'primary',
      color: 'primary',
      bounds: { x: 0.1, y: 0.1, w: 0.8, h: 0.1 },
      fontSize: 32,
      align: 'center',
      lineHeight: 1.2,
      maxLines: 1,
      z: 10,
      textTransform: 'none',
    },
    {
      id: 'wine-name',
      type: 'text',
      text: 'Cabernet Sauvignon',
      font: 'secondary',
      color: 'secondary',
      bounds: { x: 0.1, y: 0.3, w: 0.8, h: 0.08 },
      fontSize: 24,
      align: 'center',
      lineHeight: 1.2,
      maxLines: 1,
      z: 10,
      textTransform: 'none',
    },
    {
      id: 'vintage',
      type: 'text',
      text: '2020',
      font: 'primary',
      color: 'primary',
      bounds: { x: 0.35, y: 0.5, w: 0.3, h: 0.08 },
      fontSize: 36,
      align: 'center',
      lineHeight: 1.2,
      maxLines: 1,
      z: 10,
      textTransform: 'none',
    },
    {
      id: 'separator',
      type: 'shape',
      shape: 'line',
      color: 'accent',
      bounds: { x: 0.3, y: 0.45, w: 0.4, h: 0.002 },
      strokeWidth: 2,
      rotation: 0,
      z: 5,
    },
  ],
};

console.log('Testing availableElements formatting...\n');

// Simulate what the refine prompt will receive
const availableElements = mockDSL.elements
  .map((el, index) => `${index + 1}. "${el.id}" (${el.type}${el.type === 'text' ? `: "${el.text}"` : ''})`)
  .join('\n');

console.log('AVAILABLE ELEMENT IDs:');
console.log(availableElements);

console.log('\nThis will help the LLM use correct element IDs like:');
console.log('- "producer" instead of "winery-name"');
console.log('- "vintage" instead of "year"');
console.log('- "separator" instead of "line-divider"');

console.log('\nElement count:', mockDSL.elements.length);
