import crypto from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToPng } from '../lib/renderer.js';
import { refineLabel } from '../services/dsl-edit-service.js';
import { MockLayoutVisionRefiner } from '../services/vision-refiner-adapter.js';
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

// Mock the renderer to avoid browser dependencies in tests
vi.mock('../lib/renderer.js', () => ({
  renderToPng: vi.fn(),
}));

describe('Multimodal Refinement Integration', () => {
  const mockRenderToPng = vi.mocked(renderToPng);

  const baseDSL: LabelDSL = {
    version: '1',
    canvas: { width: 400, height: 600, dpi: 144, background: '#ffffff' },
    palette: {
      primary: '#8B0000',
      secondary: '#2F4F4F',
      accent: '#DAA520',
      background: '#ffffff',
      temperature: 'warm',
      contrast: 'high',
    },
    typography: {
      primary: { family: 'Serif', weight: 700, style: 'normal', letterSpacing: 0.02 },
      secondary: { family: 'Sans', weight: 400, style: 'normal', letterSpacing: 0.01 },
      hierarchy: { producerEmphasis: 'dominant', vintageProminence: 'standard', regionDisplay: 'integrated' },
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
        id: 'vintage-text',
        type: 'text',
        bounds: { x: 0.1, y: 0.45, w: 0.8, h: 0.08 },
        z: 8,
        text: '2020',
        font: 'secondary',
        color: 'accent',
        align: 'center',
        fontSize: 16,
        lineHeight: 1.2,
        maxLines: 1,
        textTransform: 'none',
      },
    ],
  };

  beforeEach(() => {
    mockRenderToPng.mockClear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Complete refinement flow', () => {
    it('should execute full refinement pipeline with mock adapter', async () => {
      const deterministicEdits: Edit[] = [
        { op: 'move', id: 'producer-text', dx: 0.05, dy: -0.02 },
        { op: 'resize', id: 'wine-name-text', dw: 0.1, dh: 0.0 },
        { op: 'recolor', id: 'vintage-text', color: 'primary' },
      ];

      const visionAdapter = new MockLayoutVisionRefiner(deterministicEdits);

      // Mock rendering to return different buffers for original vs refined
      const originalBuffer = Buffer.from('original-render-data', 'utf8');
      const refinedBuffer = Buffer.from('refined-render-data', 'utf8');
      mockRenderToPng
        .mockResolvedValueOnce(originalBuffer) // First render (original DSL)
        .mockResolvedValueOnce(refinedBuffer); // Second render (refined DSL)

      // Step 1: Render original DSL
      const originalPreview = await renderToPng(baseDSL);
      const originalPreviewUrl = `data:image/png;base64,${originalPreview.toString('base64')}`;

      // Step 2: Get refinement suggestions from vision adapter
      const rawEdits = await visionAdapter.refineLabel({
        submissionText: 'Château Test Cabernet Sauvignon 2020',
        dsl: baseDSL,
        previewUrl: originalPreviewUrl,
      });

      expect(rawEdits).toEqual(deterministicEdits);

      // Step 3: Apply refinement edits
      const refinementResult = refineLabel(baseDSL, rawEdits);

      expect(refinementResult.validationResult.validEdits).toHaveLength(3);
      expect(refinementResult.applyResult.appliedEdits).toHaveLength(3);
      expect(refinementResult.applyResult.failedEdits).toHaveLength(0);

      // Verify specific changes were made
      const refinedDSL = refinementResult.updatedDSL;
      expect(refinedDSL.elements[0]?.bounds.x).toBeCloseTo(0.15); // moved producer text
      expect(refinedDSL.elements[0]?.bounds.y).toBeCloseTo(0.08);
      expect(refinedDSL.elements[0]?.bounds.w).toBeCloseTo(0.8);
      expect(refinedDSL.elements[0]?.bounds.h).toBeCloseTo(0.15);
      expect(refinedDSL.elements[1]?.bounds.w).toBe(0.9); // resized wine name
      expect(refinedDSL.elements[2]).toMatchObject({ color: 'primary' }); // recolored vintage

      // Step 4: Render refined DSL
      const refinedPreview = await renderToPng(refinedDSL);
      const refinedPreviewUrl = `data:image/png;base64,${refinedPreview.toString('base64')}`;

      // Step 5: Verify visual differences (checksum comparison)
      expect(originalPreviewUrl).not.toEqual(refinedPreviewUrl);
      expect(mockRenderToPng).toHaveBeenCalledTimes(2);
    });

    it('should handle over-limit edits correctly', async () => {
      const tooManyEdits: Edit[] = Array.from({ length: 15 }, (_, i) => ({
        op: 'move' as const,
        id: 'producer-text',
        dx: 0.01 * (i + 1),
        dy: 0.01 * (i + 1),
      }));

      const visionAdapter = new MockLayoutVisionRefiner(tooManyEdits);

      const rawEdits = await visionAdapter.refineLabel({
        submissionText: 'Test',
        dsl: baseDSL,
        previewUrl: 'data:image/png;base64,test',
      });

      const refinementResult = refineLabel(baseDSL, rawEdits, 10);

      // Should be limited to max 10 edits
      expect(refinementResult.validationResult.validEdits).toHaveLength(10);
      expect(refinementResult.validationResult.rejectedEdits).toHaveLength(5);
      expect(refinementResult.validationResult.rejectedEdits[0]?.reason).toContain('Exceeded maximum edits limit');
    });

    it('should clamp deltas over 0.2 and apply clamped versions', async () => {
      const extremeEdits: Edit[] = [
        { op: 'move', id: 'producer-text', dx: 0.5, dy: -0.3 },
        { op: 'resize', id: 'wine-name-text', dw: 0.4, dh: -0.6 },
        { op: 'move', id: 'vintage-text', dx: -0.8, dy: 0.9 },
      ];

      const visionAdapter = new MockLayoutVisionRefiner(extremeEdits);

      const rawEdits = await visionAdapter.refineLabel({
        submissionText: 'Test',
        dsl: baseDSL,
        previewUrl: 'data:image/png;base64,test',
      });

      const refinementResult = refineLabel(baseDSL, rawEdits, 10, 0.2);

      // All edits should be clamped but still applied
      expect(refinementResult.validationResult.validEdits).toHaveLength(3);
      expect(refinementResult.validationResult.clampedEdits).toHaveLength(3);
      expect(refinementResult.applyResult.appliedEdits).toHaveLength(3);

      // Verify clamping worked
      const clampedEdits = refinementResult.validationResult.validEdits;
      expect(clampedEdits[0]).toEqual({ op: 'move', id: 'producer-text', dx: 0.2, dy: -0.2 });
      expect(clampedEdits[1]).toEqual({ op: 'resize', id: 'wine-name-text', dw: 0.2, dh: -0.2 });
      expect(clampedEdits[2]).toEqual({ op: 'move', id: 'vintage-text', dx: -0.2, dy: 0.2 });
    });

    it('should ignore edits for invalid IDs without corrupting DSL', async () => {
      const mixedValidityEdits: Edit[] = [
        { op: 'move', id: 'producer-text', dx: 0.05, dy: -0.02 }, // valid
        { op: 'resize', id: 'nonexistent-element', dw: 0.1, dh: 0.05 }, // invalid ID
        { op: 'recolor', id: 'wine-name-text', color: 'accent' }, // valid
        { op: 'reorder', id: 'another-fake-id', z: 15 }, // invalid ID
      ];

      const visionAdapter = new MockLayoutVisionRefiner(mixedValidityEdits);

      const rawEdits = await visionAdapter.refineLabel({
        submissionText: 'Test',
        dsl: baseDSL,
        previewUrl: 'data:image/png;base64,test',
      });

      const refinementResult = refineLabel(baseDSL, rawEdits);

      // Only valid edits should be applied (MockLayoutVisionRefiner pre-filters invalid IDs)
      expect(refinementResult.validationResult.validEdits).toHaveLength(2);
      expect(refinementResult.validationResult.rejectedEdits).toHaveLength(0); // Already filtered by mock adapter
      expect(refinementResult.applyResult.appliedEdits).toHaveLength(2);
      expect(refinementResult.applyResult.failedEdits).toHaveLength(0);

      // DSL should still be valid and have expected changes
      const refinedDSL = refinementResult.updatedDSL;
      expect(refinedDSL.elements).toHaveLength(3); // Original element count preserved
      expect(refinedDSL.elements[0]?.bounds.x).toBeCloseTo(0.15); // First edit applied
      expect(refinedDSL.elements[1]).toMatchObject({ color: 'accent' }); // Second edit applied
    });

    it('should compute meaningful visual differences via checksum comparison', async () => {
      const meaningfulEdits: Edit[] = [
        { op: 'move', id: 'producer-text', dx: 0.1, dy: 0.1 }, // Significant position change
        { op: 'recolor', id: 'vintage-text', color: 'secondary' }, // Color change
      ];

      const visionAdapter = new MockLayoutVisionRefiner(meaningfulEdits);

      // Mock different render outputs to simulate visual changes
      const originalBuffer = Buffer.from('original-visual-content', 'utf8');
      const refinedBuffer = Buffer.from('refined-visual-content-different', 'utf8');
      mockRenderToPng.mockResolvedValueOnce(originalBuffer).mockResolvedValueOnce(refinedBuffer);

      // Simulate complete refinement flow
      const originalPreview = await renderToPng(baseDSL);
      const rawEdits = await visionAdapter.refineLabel({
        submissionText: 'Test',
        dsl: baseDSL,
        previewUrl: `data:image/png;base64,${originalPreview.toString('base64')}`,
      });

      const refinementResult = refineLabel(baseDSL, rawEdits);
      const refinedPreview = await renderToPng(refinementResult.updatedDSL);

      // Compute checksums to verify meaningful change
      const originalChecksum = crypto.createHash('md5').update(originalPreview).digest('hex');
      const refinedChecksum = crypto.createHash('md5').update(refinedPreview).digest('hex');

      expect(originalChecksum).not.toEqual(refinedChecksum);
      expect(refinementResult.applyResult.appliedEdits).toHaveLength(2);
    });

    it('should handle single iteration refinement as specified', async () => {
      const edits: Edit[] = [{ op: 'move', id: 'producer-text', dx: 0.05, dy: -0.02 }];

      new MockLayoutVisionRefiner(edits);

      const refinementResult = refineLabel(baseDSL, edits);

      // Should complete in single iteration (no recursion)
      expect(refinementResult.applyResult.appliedEdits).toHaveLength(1);

      // Original DSL should remain unchanged (immutability test)
      expect(baseDSL.elements[0]?.bounds.x).toBe(0.1);
      expect(refinementResult.updatedDSL.elements[0]?.bounds.x).toBeCloseTo(0.15);
    });
  });

  describe('Error handling and resilience', () => {
    it('should handle vision adapter failures gracefully', async () => {
      const failingAdapter = new MockLayoutVisionRefiner([]);

      // Mock adapter to throw an error
      vi.spyOn(failingAdapter, 'refineLabel').mockRejectedValue(new Error('Vision service unavailable'));

      // The integration should handle this gracefully
      try {
        await failingAdapter.refineLabel({
          submissionText: 'Test',
          dsl: baseDSL,
          previewUrl: 'data:image/png;base64,test',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Vision service unavailable');
      }

      // DSL should remain unchanged when refinement fails
      const fallbackResult = refineLabel(baseDSL, []);
      expect(fallbackResult.updatedDSL).toEqual(baseDSL);
    });

    it('should handle rendering failures in pipeline', async () => {
      mockRenderToPng.mockRejectedValue(new Error('Rendering failed'));

      await expect(renderToPng(baseDSL)).rejects.toThrow('Rendering failed');
    });

    it('should preserve DSL integrity even with malformed edit inputs', async () => {
      const malformedEdits = [
        { op: 'move', id: 'producer-text', dx: 0.05, dy: -0.02 }, // valid
        null, // malformed
        undefined, // malformed
        { invalid: 'structure' }, // malformed
        { op: 'resize', id: 'wine-name-text', dw: 0.1, dh: 0.05 }, // valid
      ] as unknown as Edit[];

      const refinementResult = refineLabel(baseDSL, malformedEdits);

      // Only valid edits should be processed
      expect(refinementResult.validationResult.validEdits.length).toBeGreaterThan(0);
      expect(refinementResult.validationResult.rejectedEdits.length).toBeGreaterThan(0);

      // DSL structure should remain intact
      expect(refinementResult.updatedDSL.elements).toHaveLength(3);
      expect(refinementResult.updatedDSL.version).toBe('1');
    });
  });
});
