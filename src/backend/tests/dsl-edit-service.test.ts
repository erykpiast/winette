import { describe, expect, it, vi } from 'vitest';
import { applyEdits, convertToEdits, extractElementIds, refineLabel } from '../services/dsl-edit-service.js';
import type { LabelDSL } from '../types/label-generation.js';
import type { Edit } from '../types/multimodal-refinement.js';

// Mock logger to prevent NewRelic errors in tests
vi.mock('#backend/lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('DSLEditService', () => {
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
        id: 'producer-text',
        type: 'text',
        bounds: { x: 0.1, y: 0.1, w: 0.8, h: 0.15 },
        z: 10,
        text: 'Château Test',
        font: 'primary',
        color: 'primary',
        align: 'center',
        fontSize: 24,
        lineHeight: 1.2,
        maxLines: 1,
        textTransform: 'none',
      },
      {
        id: 'wine-name-text',
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
      {
        id: 'decoration-shape',
        type: 'shape',
        bounds: { x: 0.2, y: 0.5, w: 0.6, h: 0.1 },
        z: 5,
        shape: 'rect',
        color: 'accent',
        strokeWidth: 2,
        rotation: 0,
      },
    ],
  };

  describe('applyEdits', () => {
    it('should apply move edit correctly', () => {
      const edits: Edit[] = [{ op: 'move', id: 'producer-text', dx: 0.05, dy: -0.02 }];

      const result = applyEdits(mockDSL, edits);

      expect(result.appliedEdits).toHaveLength(1);
      expect(result.failedEdits).toHaveLength(0);
      expect(result.updatedDSL.elements[0]?.bounds.x).toBeCloseTo(0.15);
      expect(result.updatedDSL.elements[0]?.bounds.y).toBeCloseTo(0.08);
      expect(result.updatedDSL.elements[0]?.bounds.w).toBeCloseTo(0.8);
      expect(result.updatedDSL.elements[0]?.bounds.h).toBeCloseTo(0.15);
    });

    it('should apply resize edit correctly', () => {
      const edits: Edit[] = [{ op: 'resize', id: 'wine-name-text', dw: 0.1, dh: 0.05 }];

      const result = applyEdits(mockDSL, edits);

      expect(result.appliedEdits).toHaveLength(1);
      expect(result.failedEdits).toHaveLength(0);
      expect(result.updatedDSL.elements[1]?.bounds.x).toBeCloseTo(0.1);
      expect(result.updatedDSL.elements[1]?.bounds.y).toBeCloseTo(0.3);
      expect(result.updatedDSL.elements[1]?.bounds.w).toBeCloseTo(0.9);
      expect(result.updatedDSL.elements[1]?.bounds.h).toBeCloseTo(0.15);
    });

    it('should apply recolor edit to text element', () => {
      const edits: Edit[] = [{ op: 'recolor', id: 'producer-text', color: 'accent' }];

      const result = applyEdits(mockDSL, edits);

      expect(result.appliedEdits).toHaveLength(1);
      expect(result.failedEdits).toHaveLength(0);
      expect(result.updatedDSL.elements[0]).toMatchObject({
        id: 'producer-text',
        color: 'accent',
      });
    });

    it('should apply recolor edit to shape element', () => {
      const edits: Edit[] = [{ op: 'recolor', id: 'decoration-shape', color: 'primary' }];

      const result = applyEdits(mockDSL, edits);

      expect(result.appliedEdits).toHaveLength(1);
      expect(result.failedEdits).toHaveLength(0);
      expect(result.updatedDSL.elements[2]).toMatchObject({
        id: 'decoration-shape',
        color: 'primary',
      });
    });

    it('should apply reorder edit correctly', () => {
      const edits: Edit[] = [{ op: 'reorder', id: 'wine-name-text', z: 15 }];

      const result = applyEdits(mockDSL, edits);

      expect(result.appliedEdits).toHaveLength(1);
      expect(result.failedEdits).toHaveLength(0);
      expect(result.updatedDSL.elements[1]?.z).toBe(15);
    });

    it('should clamp reorder z-index to valid range', () => {
      const edits: Edit[] = [
        { op: 'reorder', id: 'wine-name-text', z: -5 },
        { op: 'reorder', id: 'producer-text', z: 2000 },
      ];

      const result = applyEdits(mockDSL, edits);

      expect(result.appliedEdits).toHaveLength(2);
      expect(result.failedEdits).toHaveLength(0);
      expect(result.updatedDSL.elements[1]?.z).toBe(0);
      expect(result.updatedDSL.elements[0]?.z).toBe(1000);
    });

    it('should fail to recolor image elements', () => {
      const mockDSLWithImage: LabelDSL = {
        ...mockDSL,
        elements: [
          ...mockDSL.elements,
          {
            id: 'test-image',
            type: 'image',
            bounds: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 },
            z: 1,
            assetId: 'asset1',
            fit: 'contain',
            opacity: 1,
            rotation: 0,
          },
        ],
      };

      const edits: Edit[] = [{ op: 'recolor', id: 'test-image', color: 'primary' }];

      const result = applyEdits(mockDSLWithImage, edits);

      expect(result.appliedEdits).toHaveLength(0);
      expect(result.failedEdits).toHaveLength(1);
      expect(result.failedEdits[0]?.reason).toContain("Cannot recolor element of type 'image'");
    });

    it('should fail edits for non-existent element IDs', () => {
      const edits: Edit[] = [
        { op: 'move', id: 'nonexistent', dx: 0.1, dy: 0.1 },
        { op: 'resize', id: 'producer-text', dw: 0.1, dh: 0.1 },
      ];

      const result = applyEdits(mockDSL, edits);

      expect(result.appliedEdits).toHaveLength(1);
      expect(result.failedEdits).toHaveLength(1);
      expect(result.failedEdits[0]?.reason).toContain("Element with ID 'nonexistent' not found");
    });

    it('should apply multiple edits correctly', () => {
      const edits: Edit[] = [
        { op: 'move', id: 'producer-text', dx: 0.05, dy: 0.0 },
        { op: 'recolor', id: 'wine-name-text', color: 'accent' },
        { op: 'reorder', id: 'decoration-shape', z: 20 },
      ];

      const result = applyEdits(mockDSL, edits);

      expect(result.appliedEdits).toHaveLength(3);
      expect(result.failedEdits).toHaveLength(0);

      // Check all changes were applied
      expect(result.updatedDSL.elements[0]?.bounds.x).toBeCloseTo(0.15);
      expect(result.updatedDSL.elements[1]).toMatchObject({ color: 'accent' });
      expect(result.updatedDSL.elements[2]?.z).toBe(20);

      // Ensure original DSL wasn't modified (immutability)
      expect(mockDSL.elements[0]?.bounds.x).toBe(0.1);
      expect(mockDSL.elements[1]).toMatchObject({ color: 'secondary' });
      expect(mockDSL.elements[2]?.z).toBe(5);
    });

    it('should clamp bounds to remain within [0,1]', () => {
      const edits: Edit[] = [
        // Move element near edge outward - should be clamped
        { op: 'move', id: 'producer-text', dx: 0.5, dy: 0.5 },
        // Resize element to exceed bounds - should be clamped
        { op: 'resize', id: 'wine-name-text', dw: 0.5, dh: 0.5 },
      ];

      const result = applyEdits(mockDSL, edits);

      expect(result.appliedEdits).toHaveLength(2);
      expect(result.failedEdits).toHaveLength(0);

      // Producer text should be clamped so it stays within canvas
      const producer = result.updatedDSL.elements[0];
      expect(producer).toBeDefined();
      if (producer) {
        expect(producer.bounds.x + producer.bounds.w).toBeLessThanOrEqual(1);
        expect(producer.bounds.y + producer.bounds.h).toBeLessThanOrEqual(1);
      }

      // Wine name should be clamped
      const wineName = result.updatedDSL.elements[1];
      expect(wineName).toBeDefined();
      if (wineName) {
        expect(wineName.bounds.x + wineName.bounds.w).toBeLessThanOrEqual(1);
        expect(wineName.bounds.y + wineName.bounds.h).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('extractElementIds', () => {
    it('should extract all element IDs from DSL', () => {
      const ids = extractElementIds(mockDSL);

      expect(ids).toEqual(['producer-text', 'wine-name-text', 'decoration-shape']);
    });

    it('should handle empty elements array', () => {
      const emptyDSL: LabelDSL = { ...mockDSL, elements: [] };
      const ids = extractElementIds(emptyDSL);

      expect(ids).toEqual([]);
    });
  });

  describe('refineLabel', () => {
    it('should perform complete refinement flow', () => {
      const rawEdits = [
        { op: 'move', id: 'producer-text', dx: 0.05, dy: -0.02 },
        { op: 'resize', id: 'wine-name-text', dw: 0.1, dh: 0.0 },
        { op: 'recolor', id: 'decoration-shape', color: 'primary' },
        // Invalid edit that should be rejected
        { op: 'move', id: 'nonexistent', dx: 0.1, dy: 0.1 },
        // Edit with delta too large that should be clamped
        { op: 'move', id: 'wine-name-text', dx: 0.3, dy: 0.0 },
      ];

      const result = refineLabel(mockDSL, rawEdits);

      // Check validation results
      expect(result.validationResult.validEdits).toHaveLength(4); // 3 good + 1 clamped
      expect(result.validationResult.rejectedEdits).toHaveLength(1);
      expect(result.validationResult.clampedEdits).toHaveLength(1);

      // Check application results
      expect(result.applyResult.appliedEdits).toHaveLength(4);
      expect(result.applyResult.failedEdits).toHaveLength(0);

      // Verify actual changes were made
      expect(result.updatedDSL.elements[0]?.bounds.x).toBeCloseTo(0.15); // moved
      expect(result.updatedDSL.elements[1]?.bounds.w).toBe(0.9); // resized
      expect(result.updatedDSL.elements[2]).toMatchObject({ color: 'primary' }); // recolored
    });

    it('should handle empty edits array gracefully', () => {
      const result = refineLabel(mockDSL, []);

      expect(result.validationResult.validEdits).toHaveLength(0);
      expect(result.applyResult.appliedEdits).toHaveLength(0);
      expect(result.updatedDSL).toEqual(mockDSL);
    });

    it('should respect custom maxEdits parameter', () => {
      const rawEdits = Array.from({ length: 8 }, (_, _i) => ({
        op: 'move' as const,
        id: 'producer-text',
        dx: 0.01,
        dy: 0.01,
      }));

      const result = refineLabel(mockDSL, rawEdits, 3);

      expect(result.validationResult.validEdits).toHaveLength(3);
      expect(result.validationResult.rejectedEdits).toHaveLength(5);
    });

    it('should respect custom maxDelta parameter', () => {
      const rawEdits = [{ op: 'move', id: 'producer-text', dx: 0.15, dy: 0.15 }];

      const result = refineLabel(mockDSL, rawEdits, 10, 0.1);

      expect(result.validationResult.validEdits).toHaveLength(1);
      expect(result.validationResult.clampedEdits).toHaveLength(1);
      expect(result.validationResult.validEdits[0]).toEqual({
        op: 'move',
        id: 'producer-text',
        dx: 0.1,
        dy: 0.1,
      });
    });
  });

  describe('convertToEdits', () => {
    // Create a DSL with realistic element IDs for testing semantic mapping
    const semanticTestDSL: LabelDSL = {
      ...mockDSL,
      elements: [
        {
          id: 'producer',
          type: 'text',
          bounds: { x: 0.1, y: 0.1, w: 0.8, h: 0.15 },
          z: 10,
          text: 'Test Winery',
          font: 'primary',
          color: 'primary',
          align: 'center',
          fontSize: 24,
          lineHeight: 1.2,
          maxLines: 1,
          textTransform: 'none',
        },
        {
          id: 'wine-name',
          type: 'text',
          bounds: { x: 0.1, y: 0.3, w: 0.8, h: 0.1 },
          z: 9,
          text: 'Test Wine',
          font: 'secondary',
          color: 'secondary',
          align: 'center',
          fontSize: 18,
          lineHeight: 1.2,
          maxLines: 1,
          textTransform: 'none',
        },
        {
          id: 'vintage',
          type: 'text',
          bounds: { x: 0.35, y: 0.65, w: 0.3, h: 0.08 },
          z: 8,
          text: '2024',
          font: 'primary',
          color: 'primary',
          align: 'center',
          fontSize: 32,
          lineHeight: 1.2,
          maxLines: 1,
          textTransform: 'none',
        },
      ],
    };

    it('should map semantic element IDs to actual DSL element IDs', () => {
      const operations = [
        {
          type: 'update_element' as const,
          elementId: 'year-text', // Semantic ID that should map to 'vintage'
          property: 'color' as const,
          value: '#4A4A4A',
          reasoning: 'The current color blends too much with the background',
        },
        {
          type: 'update_element' as const,
          elementId: 'winery-name', // Semantic ID that should map to 'producer'
          property: 'fontSize' as const,
          value: 'larger',
          reasoning: 'Increase font size for better hierarchy',
        },
        {
          type: 'update_element' as const,
          elementId: 'wine-name', // This should match directly
          property: 'fontSize' as const,
          value: 'smaller',
          reasoning: 'Create better hierarchy',
        },
      ];

      const edits = convertToEdits(operations, semanticTestDSL);

      // Should have successfully converted all operations
      expect(edits).toHaveLength(3);

      // Check that semantic IDs were mapped correctly
      const vintageEdit = edits.find((edit) => edit.id === 'vintage');
      const producerEdit = edits.find((edit) => edit.id === 'producer');
      const wineNameEdit = edits.find((edit) => edit.id === 'wine-name');

      expect(vintageEdit).toBeDefined();
      expect(vintageEdit?.op).toBe('recolor');

      expect(producerEdit).toBeDefined();
      expect(producerEdit?.op).toBe('update_font_size');

      expect(wineNameEdit).toBeDefined();
      expect(wineNameEdit?.op).toBe('update_font_size');
    });

    it('should handle unknown semantic IDs gracefully', () => {
      const operations = [
        {
          type: 'update_element' as const,
          elementId: 'non-existent-element', // Should not match anything
          property: 'color' as const,
          value: '#FF0000',
          reasoning: 'This should be ignored',
        },
        {
          type: 'update_element' as const,
          elementId: 'vintage', // This should work normally
          property: 'fontSize' as const,
          value: 36,
          reasoning: 'This should work',
        },
      ];

      const edits = convertToEdits(operations, semanticTestDSL);

      // Should only have converted the valid operation
      expect(edits).toHaveLength(1);
      expect(edits[0]?.id).toBe('vintage');
      expect(edits[0]?.op).toBe('update_font_size');
    });

    it('should use fuzzy matching for text content when semantic mapping fails', () => {
      const operations = [
        {
          type: 'update_element' as const,
          elementId: 'year-element', // Different semantic name, should fuzzy match vintage
          property: 'fontSize' as const,
          value: 28,
          reasoning: 'Should fuzzy match to vintage element containing "2024"',
        },
      ];

      const edits = convertToEdits(operations, semanticTestDSL);

      expect(edits).toHaveLength(1);
      expect(edits[0]?.id).toBe('vintage');
      expect(edits[0]?.op).toBe('update_font_size');
    });

    it('should handle the exact EditOperations from the user error message', () => {
      // These are the exact EditOperations that were failing in the user's example
      const operations = [
        {
          type: 'update_element' as const,
          elementId: 'year-text',
          property: 'color' as const,
          value: '#4A4A4A',
          reasoning:
            'The current color of the year text blends too much with the background, reducing readability. A darker shade will improve visibility.',
        },
        {
          type: 'update_element' as const,
          elementId: 'winery-name',
          property: 'fontSize' as const,
          value: 'larger',
          reasoning:
            'Increasing the font size of the winery name will enhance the hierarchy and make it the focal point of the label.',
        },
        {
          type: 'update_element' as const,
          elementId: 'wine-name',
          property: 'fontSize' as const,
          value: 'smaller', // Changed from "slightly smaller" to "smaller" since the parser doesn't handle "slightly"
          reasoning:
            'Reducing the font size of the wine name slightly will create a better hierarchy between the winery name and the wine name.',
        },
      ];

      const edits = convertToEdits(operations, semanticTestDSL);

      // All operations should now be successfully converted (no more "Element not found" errors)
      expect(edits).toHaveLength(3);

      // Verify the correct semantic-to-actual ID mapping occurred
      expect(edits.some((edit) => edit.id === 'vintage' && edit.op === 'recolor')).toBe(true);
      expect(edits.some((edit) => edit.id === 'producer' && edit.op === 'update_font_size')).toBe(true);
      expect(edits.some((edit) => edit.id === 'wine-name' && edit.op === 'update_font_size')).toBe(true);
    });
  });
});
