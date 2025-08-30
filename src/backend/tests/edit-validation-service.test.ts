import { describe, expect, it, vi } from 'vitest';
import { clampBounds, validateAndClampEdits } from '../services/edit-validation-service.js';
import type { Edit, EditValidationOptions } from '../types/multimodal-refinement.js';

// Mock logger to prevent NewRelic errors in tests
vi.mock('#backend/lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('EditValidationService', () => {
  const validOptions: EditValidationOptions = {
    maxEdits: 10,
    maxDelta: 0.2,
    existingElementIds: ['element1', 'element2', 'element3'],
  };

  describe('validateAndClampEdits', () => {
    it('should accept valid edits within constraints', () => {
      const rawEdits = [
        { op: 'move', id: 'element1', dx: 0.1, dy: -0.05 },
        { op: 'resize', id: 'element2', dw: 0.15, dh: 0.1 },
        { op: 'recolor', id: 'element3', color: 'primary' },
        { op: 'reorder', id: 'element1', z: 500 },
      ];

      const result = validateAndClampEdits(rawEdits, validOptions);

      expect(result.validEdits).toHaveLength(4);
      expect(result.rejectedEdits).toHaveLength(0);
      expect(result.clampedEdits).toHaveLength(0);
      expect(result.validEdits).toEqual(rawEdits);
    });

    it('should reject edits exceeding maximum limit', () => {
      const rawEdits = Array.from({ length: 15 }, (_, _i) => ({
        op: 'move' as const,
        id: 'element1',
        dx: 0.01,
        dy: 0.01,
      }));

      const result = validateAndClampEdits(rawEdits, validOptions);

      expect(result.validEdits).toHaveLength(10);
      expect(result.rejectedEdits).toHaveLength(5);
      expect(result.rejectedEdits[0]?.reason).toContain('Exceeded maximum edits limit of 10');
    });

    it('should reject edits for non-existent element IDs', () => {
      const rawEdits = [
        { op: 'move', id: 'nonexistent', dx: 0.1, dy: 0.1 },
        { op: 'resize', id: 'element1', dw: 0.1, dh: 0.1 },
      ];

      const result = validateAndClampEdits(rawEdits, validOptions);

      expect(result.validEdits).toHaveLength(1);
      expect(result.rejectedEdits).toHaveLength(1);
      expect(result.rejectedEdits[0]?.reason).toContain("Element ID 'nonexistent' does not exist");
      expect(result.validEdits[0]).toEqual(rawEdits[1]);
    });

    it('should clamp move deltas that exceed maximum', () => {
      const rawEdits = [
        { op: 'move', id: 'element1', dx: 0.3, dy: -0.25 },
        { op: 'move', id: 'element2', dx: -0.3, dy: 0.1 },
      ];

      const result = validateAndClampEdits(rawEdits, validOptions);

      expect(result.validEdits).toHaveLength(2);
      expect(result.clampedEdits).toHaveLength(2);
      expect(result.validEdits[0]).toEqual({ op: 'move', id: 'element1', dx: 0.2, dy: -0.2 });
      expect(result.validEdits[1]).toEqual({ op: 'move', id: 'element2', dx: -0.2, dy: 0.1 });
      expect(result.clampedEdits[0]?.reason).toContain('Move deltas clamped from (0.3, -0.25) to (0.2, -0.2)');
    });

    it('should clamp resize deltas that exceed maximum', () => {
      const rawEdits = [{ op: 'resize', id: 'element1', dw: 0.5, dh: -0.4 }];

      const result = validateAndClampEdits(rawEdits, validOptions);

      expect(result.validEdits).toHaveLength(1);
      expect(result.clampedEdits).toHaveLength(1);
      expect(result.validEdits[0]).toEqual({ op: 'resize', id: 'element1', dw: 0.2, dh: -0.2 });
      expect(result.clampedEdits[0]?.reason).toContain('Resize deltas clamped from (0.5, -0.4) to (0.2, -0.2)');
    });

    it('should clamp z-index values outside valid range', () => {
      const rawEdits = [
        { op: 'reorder', id: 'element1', z: -10 },
        { op: 'reorder', id: 'element2', z: 2000 },
        { op: 'reorder', id: 'element3', z: 500 },
      ];

      const result = validateAndClampEdits(rawEdits, validOptions);

      expect(result.validEdits).toHaveLength(3);
      expect(result.clampedEdits).toHaveLength(2);
      expect(result.validEdits[0]).toEqual({ op: 'reorder', id: 'element1', z: 0 });
      expect(result.validEdits[1]).toEqual({ op: 'reorder', id: 'element2', z: 1000 });
      expect(result.validEdits[2]).toEqual({ op: 'reorder', id: 'element3', z: 500 });
    });

    it('should reject edits with invalid schema', () => {
      const rawEdits = [
        { op: 'invalid', id: 'element1' },
        { op: 'move', id: '', dx: 0.1, dy: 0.1 },
        { op: 'recolor', id: 'element1', color: 'invalid-color' },
        { op: 'move', id: 'element1', dx: 0.1 }, // missing dy
      ];

      const result = validateAndClampEdits(rawEdits, validOptions);

      expect(result.validEdits).toHaveLength(0);
      expect(result.rejectedEdits).toHaveLength(4);
      result.rejectedEdits.forEach((rejection) => {
        expect(rejection.reason).toContain('Schema validation failed');
      });
    });

    it('should handle mixed valid, invalid, and clampable edits', () => {
      const rawEdits = [
        { op: 'move', id: 'element1', dx: 0.1, dy: 0.1 }, // valid
        { op: 'move', id: 'nonexistent', dx: 0.1, dy: 0.1 }, // invalid ID
        { op: 'move', id: 'element2', dx: 0.3, dy: 0.1 }, // needs clamping
        { op: 'invalid', id: 'element1' }, // invalid schema
        { op: 'resize', id: 'element3', dw: -0.5, dh: 0.1 }, // needs clamping
      ];

      const result = validateAndClampEdits(rawEdits, validOptions);

      expect(result.validEdits).toHaveLength(3);
      expect(result.rejectedEdits).toHaveLength(2);
      expect(result.clampedEdits).toHaveLength(2);

      // Check that valid edits are preserved or properly clamped
      expect(result.validEdits[0]).toEqual(rawEdits[0]); // unchanged
      expect(result.validEdits[1]).toEqual({ op: 'move', id: 'element2', dx: 0.2, dy: 0.1 }); // clamped
      expect(result.validEdits[2]).toEqual({ op: 'resize', id: 'element3', dw: -0.2, dh: 0.1 }); // clamped
    });
  });

  describe('clampBounds', () => {
    it('should clamp move operations to keep bounds within [0,1]', () => {
      const bounds = { x: 0.9, y: 0.8, w: 0.2, h: 0.3 };
      const moveEdit: Edit = { op: 'move', id: 'test', dx: 0.2, dy: 0.3 };

      const result = clampBounds(bounds, moveEdit);

      // x should be clamped to 1 - 0.2 = 0.8
      // y should be clamped to 1 - 0.3 = 0.7
      expect(result).toEqual({ x: 0.8, y: 0.7, w: 0.2, h: 0.3 });
    });

    it('should clamp resize operations to keep bounds within [0,1]', () => {
      const bounds = { x: 0.5, y: 0.4, w: 0.4, h: 0.5 };
      const resizeEdit: Edit = { op: 'resize', id: 'test', dw: 0.2, dh: 0.3 };

      const result = clampBounds(bounds, resizeEdit);

      // w should be clamped to 1 - 0.5 = 0.5
      // h should be clamped to 1 - 0.4 = 0.6
      expect(result).toEqual({ x: 0.5, y: 0.4, w: 0.5, h: 0.6 });
    });

    it('should handle negative moves correctly', () => {
      const bounds = { x: 0.1, y: 0.1, w: 0.2, h: 0.3 };
      const moveEdit: Edit = { op: 'move', id: 'test', dx: -0.2, dy: -0.2 };

      const result = clampBounds(bounds, moveEdit);

      expect(result).toEqual({ x: 0, y: 0, w: 0.2, h: 0.3 });
    });

    it('should handle negative resizes correctly', () => {
      const bounds = { x: 0.1, y: 0.1, w: 0.3, h: 0.4 };
      const resizeEdit: Edit = { op: 'resize', id: 'test', dw: -0.5, dh: -0.5 };

      const result = clampBounds(bounds, resizeEdit);

      expect(result).toEqual({ x: 0.1, y: 0.1, w: 0, h: 0 });
    });

    it('should not modify bounds for non-spatial operations', () => {
      const bounds = { x: 0.5, y: 0.5, w: 0.2, h: 0.3 };
      const recolorEdit: Edit = { op: 'recolor', id: 'test', color: 'primary' };
      const reorderEdit: Edit = { op: 'reorder', id: 'test', z: 100 };

      expect(clampBounds(bounds, recolorEdit)).toEqual(bounds);
      expect(clampBounds(bounds, reorderEdit)).toEqual(bounds);
    });
  });
});
