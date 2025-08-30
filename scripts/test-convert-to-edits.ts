import type { EditOperation } from '../src/backend/schema/langchain-pipeline-schemas.js';
import { convertToEdits } from '../src/backend/services/dsl-edit-service.js';
import type { LabelDSL } from '../src/backend/types/label-generation.js';

// Mock DSL for testing
const mockDSL: LabelDSL = {
  version: '1',
  canvas: {
    width: 400,
    height: 600,
    dpi: 144,
    background: '#ffffff',
  },
  palette: {
    primary: '#8B0000',
    secondary: '#2F4F4F',
    accent: '#DAA520',
    background: '#ffffff',
    temperature: 'warm',
    contrast: 'high',
  },
  typography: {
    primary: {
      family: 'Serif',
      weight: 700,
      style: 'normal',
      letterSpacing: 0.02,
    },
    secondary: {
      family: 'Sans',
      weight: 400,
      style: 'normal',
      letterSpacing: 0.01,
    },
    hierarchy: {
      producerEmphasis: 'dominant',
      vintageProminence: 'standard',
      regionDisplay: 'integrated',
    },
  },
  assets: [],
  elements: [
    {
      id: 'reserve-cabernet-sauvignon',
      type: 'text',
      bounds: { x: 0.1, y: 0.1, w: 0.8, h: 0.15 },
      z: 10,
      text: 'Reserve Cabernet Sauvignon',
      font: 'primary',
      color: 'primary',
      align: 'center',
      fontSize: 24,
      lineHeight: 1.2,
      maxLines: 1,
      textTransform: 'none',
    },
    {
      id: 'cabernet-sauvignon',
      type: 'text',
      bounds: { x: 0.1, y: 0.3, w: 0.8, h: 0.1 },
      z: 9,
      text: 'Cabernet Sauvignon',
      font: 'secondary',
      color: 'secondary',
      align: 'center',
      fontSize: 18,
      lineHeight: 1.2,
      maxLines: 1,
      textTransform: 'none',
    },
  ],
};

// User's reported test case
const operations: EditOperation[] = [
  {
    type: 'update_element',
    elementId: 'reserve-cabernet-sauvignon',
    property: 'color',
    value: '#4B2E2E',
  },
  {
    type: 'update_element',
    elementId: 'cabernet-sauvignon',
    property: 'fontSize',
    value: 'larger',
  },
];

console.log('Testing convertToEdits with user-reported operations...\n');
console.log('Input operations:', JSON.stringify(operations, null, 2));

const edits = convertToEdits(operations, mockDSL);

console.log('\nOutput edits:', JSON.stringify(edits, null, 2));
console.log('\nResult: Converted', operations.length, 'operations to', edits.length, 'edits');

if (edits.length === 0) {
  console.error('\nERROR: No edits were generated! This confirms the bug.');
  process.exit(1);
} else if (edits.length !== operations.length) {
  console.error(`\nERROR: Expected ${operations.length} edits, got ${edits.length}`);
  process.exit(1);
} else {
  console.log('\nSUCCESS: All operations were converted to edits!');

  // Verify the edit types
  const colorEdit = edits.find((e) => e.id === 'reserve-cabernet-sauvignon');
  const fontSizeEdit = edits.find((e) => e.id === 'cabernet-sauvignon');

  if (colorEdit && 'op' in colorEdit && colorEdit.op === 'recolor') {
    console.log('✓ Color update correctly converted to recolor operation');
  } else {
    console.error('✗ Color update not properly converted');
  }

  if (fontSizeEdit && 'op' in fontSizeEdit && fontSizeEdit.op === 'update_font_size') {
    console.log('✓ Font size update correctly converted to update_font_size operation');
  } else {
    console.error('✗ Font size update not properly converted');
  }
}
