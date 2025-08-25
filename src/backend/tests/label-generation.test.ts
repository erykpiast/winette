import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LabelDSLSchema } from '#backend/types/label-generation';

const fixturesPath = join(__dirname, 'fixtures/label-dsl');

describe('Label DSL Schema Validation', () => {
  describe('Valid DSL fixtures', () => {
    it('should validate classic label', () => {
      const data = JSON.parse(readFileSync(join(fixturesPath, 'valid-classic.json'), 'utf-8'));
      const result = LabelDSLSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.version).toBe('1');
        expect(result.data.canvas.width).toBe(800);
        expect(result.data.canvas.height).toBe(1200);
        expect(result.data.palette.temperature).toBe('warm');
        expect(result.data.elements).toHaveLength(4);
      }
    });

    it('should validate modern label', () => {
      const data = JSON.parse(readFileSync(join(fixturesPath, 'valid-modern.json'), 'utf-8'));
      const result = LabelDSLSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.palette.temperature).toBe('cool');
        expect(result.data.palette.contrast).toBe('high');
        expect(result.data.elements).toHaveLength(3);
      }
    });

    it('should validate minimal label', () => {
      const data = JSON.parse(readFileSync(join(fixturesPath, 'valid-minimal.json'), 'utf-8'));
      const result = LabelDSLSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.assets).toHaveLength(0);
        expect(result.data.elements).toHaveLength(0);
      }
    });
  });

  describe('Invalid DSL fixtures', () => {
    it('should reject out-of-range bounds', () => {
      const data = JSON.parse(readFileSync(join(fixturesPath, 'invalid-bounds-out-of-range.json'), 'utf-8'));
      const result = LabelDSLSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['elements', 0, 'bounds', 'x'],
              code: 'too_big',
            }),
            expect.objectContaining({
              path: ['elements', 0, 'bounds', 'y'],
              code: 'too_small',
            }),
          ]),
        );
      }
    });

    it('should reject invalid enum values', () => {
      const data = JSON.parse(readFileSync(join(fixturesPath, 'invalid-bad-enum.json'), 'utf-8'));
      const result = LabelDSLSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorPaths = result.error.issues.map((issue) => issue.path.join('.'));
        expect(errorPaths).toContain('palette.temperature');
        expect(errorPaths).toContain('palette.contrast');
        expect(errorPaths).toContain('typography.secondary.style');
      }
    });

    it('should reject missing required fields', () => {
      const data = JSON.parse(readFileSync(join(fixturesPath, 'invalid-missing-required.json'), 'utf-8'));
      const result = LabelDSLSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorPaths = result.error.issues.map((issue) => issue.path.join('.'));
        expect(errorPaths).toContain('canvas.background');
        expect(errorPaths).toContain('palette.accent');
        expect(errorPaths).toContain('typography.secondary');
      }
    });
  });

  describe('Boundary values', () => {
    it('should accept bounds at 0 and 1', () => {
      const data = {
        version: '1',
        canvas: { width: 100, height: 100, dpi: 144, background: '#fff' },
        palette: {
          primary: '#000',
          secondary: '#fff',
          accent: '#f00',
          background: '#fff',
          temperature: 'neutral',
          contrast: 'high',
        },
        typography: {
          primary: { family: 'Arial', weight: 400, style: 'normal', letterSpacing: 0 },
          secondary: { family: 'Arial', weight: 400, style: 'normal', letterSpacing: 0 },
          hierarchy: {
            producerEmphasis: 'balanced',
            vintageProminence: 'standard',
            regionDisplay: 'integrated',
          },
        },
        elements: [
          {
            id: 'test',
            type: 'text',
            text: 'Test',
            font: 'primary',
            color: 'primary',
            bounds: { x: 0, y: 0, w: 1, h: 1 },
            fontSize: 12,
            z: 0,
          },
        ],
      };
      const result = LabelDSLSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept maximum z value', () => {
      const data = {
        version: '1',
        canvas: { width: 100, height: 100, dpi: 144, background: '#fff' },
        palette: {
          primary: '#000',
          secondary: '#fff',
          accent: '#f00',
          background: '#fff',
          temperature: 'neutral',
          contrast: 'high',
        },
        typography: {
          primary: { family: 'Arial', weight: 400, style: 'normal', letterSpacing: 0 },
          secondary: { family: 'Arial', weight: 400, style: 'normal', letterSpacing: 0 },
          hierarchy: {
            producerEmphasis: 'balanced',
            vintageProminence: 'standard',
            regionDisplay: 'integrated',
          },
        },
        elements: [
          {
            id: 'test',
            type: 'shape',
            shape: 'rect',
            color: 'primary',
            bounds: { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
            z: 1000,
          },
        ],
      };
      const result = LabelDSLSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject z value over 1000', () => {
      const data = {
        version: '1',
        canvas: { width: 100, height: 100, dpi: 144, background: '#fff' },
        palette: {
          primary: '#000',
          secondary: '#fff',
          accent: '#f00',
          background: '#fff',
          temperature: 'neutral',
          contrast: 'high',
        },
        typography: {
          primary: { family: 'Arial', weight: 400, style: 'normal', letterSpacing: 0 },
          secondary: { family: 'Arial', weight: 400, style: 'normal', letterSpacing: 0 },
          hierarchy: {
            producerEmphasis: 'balanced',
            vintageProminence: 'standard',
            regionDisplay: 'integrated',
          },
        },
        elements: [
          {
            id: 'test',
            type: 'shape',
            shape: 'rect',
            color: 'primary',
            bounds: { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
            z: 1001,
          },
        ],
      };
      const result = LabelDSLSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('Asset validation', () => {
    it('should validate referenced assets exist', () => {
      const dataWithAsset = JSON.parse(readFileSync(join(fixturesPath, 'valid-classic.json'), 'utf-8'));
      expect(dataWithAsset.assets).toHaveLength(1);
      expect(dataWithAsset.assets[0].id).toBe('hero');

      const imageElement = dataWithAsset.elements.find((el: { type: string }) => el.type === 'image');
      expect(imageElement?.assetId).toBe('hero');

      // Verify the valid reference passes validation
      const result = LabelDSLSchema.safeParse(dataWithAsset);
      expect(result.success).toBe(true);
    });

    it('should reject missing asset reference', () => {
      const data = JSON.parse(readFileSync(join(fixturesPath, 'invalid-asset-reference.json'), 'utf-8'));
      const result = LabelDSLSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const assetError = result.error.issues.find((issue) => issue.path.join('.') === 'elements.0.assetId');
        expect(assetError).toBeDefined();
        expect(assetError?.message).toContain("Asset with id 'nonexistent' not found");
      }
    });

    it('should allow multiple image elements referencing the same asset', () => {
      const data = {
        version: '1',
        canvas: { width: 100, height: 100, dpi: 144, background: '#fff' },
        palette: {
          primary: '#000',
          secondary: '#fff',
          accent: '#f00',
          background: '#fff',
          temperature: 'neutral',
          contrast: 'high',
        },
        typography: {
          primary: { family: 'Arial', weight: 400, style: 'normal', letterSpacing: 0 },
          secondary: { family: 'Arial', weight: 400, style: 'normal', letterSpacing: 0 },
          hierarchy: {
            producerEmphasis: 'balanced',
            vintageProminence: 'standard',
            regionDisplay: 'integrated',
          },
        },
        assets: [
          {
            id: 'logo',
            type: 'image',
            url: 'https://example.com/logo.png',
            width: 100,
            height: 100,
          },
        ],
        elements: [
          {
            id: 'logo1',
            type: 'image',
            assetId: 'logo',
            bounds: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 },
            z: 1,
          },
          {
            id: 'logo2',
            type: 'image',
            assetId: 'logo',
            bounds: { x: 0.7, y: 0.7, w: 0.2, h: 0.2 },
            z: 2,
          },
        ],
      };
      const result = LabelDSLSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('Default values', () => {
    it('should apply default values correctly', () => {
      const data = {
        version: '1',
        canvas: { width: 100, height: 100, background: '#fff' }, // No dpi
        palette: {
          primary: '#000',
          secondary: '#fff',
          accent: '#f00',
          background: '#fff',
          temperature: 'neutral',
          contrast: 'high',
        },
        typography: {
          primary: { family: 'Arial', weight: 400, style: 'normal', letterSpacing: 0 },
          secondary: { family: 'Arial', weight: 400, style: 'normal', letterSpacing: 0 },
          hierarchy: {
            producerEmphasis: 'balanced',
            vintageProminence: 'standard',
            regionDisplay: 'integrated',
          },
        },
      };
      const result = LabelDSLSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.canvas.dpi).toBe(144);
        expect(result.data.assets).toEqual([]);
        expect(result.data.elements).toEqual([]);
      }
    });
  });
});
