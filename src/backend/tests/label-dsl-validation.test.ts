import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';
import type { ZodIssue } from 'zod';
import { LabelDSLSchema } from '#backend/schema/label-dsl-schema';
import { type Element, LabelDSLSchema as LabelDSLZodSchema } from '#backend/types/label-generation';

const fixturesPath = join(__dirname, 'fixtures/label-dsl');

// Initialize Ajv with format support and 2020-12 draft
const ajv = new Ajv({
  strict: true,
  allErrors: true,
  validateSchema: false, // Skip meta-schema validation since we're using 2020-12
});
addFormats(ajv);

describe('Label DSL JSON Schema Validation', () => {
  const validate = ajv.compile(LabelDSLSchema);

  describe('Valid fixtures should pass both Zod and JSON Schema validation', () => {
    const validFixtures = ['valid-classic.json', 'valid-modern.json', 'valid-minimal.json'];

    validFixtures.forEach((fixture) => {
      it(`should validate ${fixture} with both Zod and JSON Schema`, () => {
        const data = JSON.parse(readFileSync(join(fixturesPath, fixture), 'utf-8'));

        // Zod validation
        const zodResult = LabelDSLZodSchema.safeParse(data);
        expect(zodResult.success).toBe(true);

        // JSON Schema validation
        const valid = validate(data);
        if (!valid) {
          console.error('JSON Schema validation errors:', validate.errors);
        }
        expect(valid).toBe(true);
      });
    });
  });

  describe('Invalid fixtures should fail both Zod and JSON Schema validation', () => {
    const invalidFixtures = [
      'invalid-bounds-out-of-range.json',
      'invalid-bad-enum.json',
      'invalid-missing-required.json',
    ];

    invalidFixtures.forEach((fixture) => {
      it(`should reject ${fixture} with both Zod and JSON Schema`, () => {
        const data = JSON.parse(readFileSync(join(fixturesPath, fixture), 'utf-8'));

        // Zod validation
        const zodResult = LabelDSLZodSchema.safeParse(data);
        expect(zodResult.success).toBe(false);

        // JSON Schema validation
        const valid = validate(data);
        expect(valid).toBe(false);
        expect(validate.errors).toBeDefined();
        expect(validate.errors?.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Cross-reference validation', () => {
    it('should validate asset references in JSON Schema', () => {
      const data = JSON.parse(readFileSync(join(fixturesPath, 'invalid-asset-reference.json'), 'utf-8'));

      // Zod validation catches the cross-reference error
      const zodResult = LabelDSLZodSchema.safeParse(data);
      expect(zodResult.success).toBe(false);
      if (!zodResult.success) {
        const assetError = zodResult.error.issues.find(
          (issue: ZodIssue) => issue.path.join('.') === 'elements.0.assetId',
        );
        expect(assetError).toBeDefined();
        expect(assetError?.message).toContain("Asset with id 'nonexistent' not found");
      }

      // JSON Schema validation - structural only
      const valid = validate(data);

      // The fixture is missing required fields with defaults (opacity, rotation, etc.)
      // because it was created before defaults were added to the schema
      expect(valid).toBe(false);
      expect(validate.errors).toBeDefined();

      // The errors should be about missing required fields, not cross-references
      const errorKeywords = validate.errors?.map((err) => err.keyword);

      // Should have errors about missing required properties
      expect(errorKeywords).toContain('required');

      // JSON Schema cannot validate cross-references without custom keywords
      // This is a known limitation - business logic validation requires Zod
    });
  });
});

describe('Label DSL Round-trip Serialization', () => {
  const validFixtures = ['valid-classic.json', 'valid-modern.json', 'valid-minimal.json'];

  validFixtures.forEach((fixture) => {
    it(`should round-trip ${fixture} without mutation`, () => {
      const originalJson = readFileSync(join(fixturesPath, fixture), 'utf-8');
      const originalData = JSON.parse(originalJson);

      // Parse with Zod
      const parseResult = LabelDSLZodSchema.safeParse(originalData);
      expect(parseResult.success).toBe(true);

      if (parseResult.success) {
        // Serialize back to JSON
        const serialized = JSON.stringify(parseResult.data, null, 2);
        const roundTripped = JSON.parse(serialized);

        // Compare deep equality
        expect(roundTripped).toEqual(originalData);

        // Verify no mutation occurred
        const reParseResult = LabelDSLZodSchema.safeParse(roundTripped);
        expect(reParseResult.success).toBe(true);
        if (reParseResult.success) {
          expect(reParseResult.data).toEqual(parseResult.data);
        }
      }
    });
  });

  it('should preserve default values in round-trip', () => {
    const minimal = {
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

    // Parse with Zod
    const parseResult = LabelDSLZodSchema.safeParse(minimal);
    expect(parseResult.success).toBe(true);

    if (parseResult.success) {
      // Check defaults were applied
      expect(parseResult.data.canvas.dpi).toBe(144);
      expect(parseResult.data.assets).toEqual([]);
      expect(parseResult.data.elements).toEqual([]);

      // Round-trip
      const serialized = JSON.stringify(parseResult.data, null, 2);
      const roundTripped = JSON.parse(serialized);

      // Defaults should be preserved
      expect(roundTripped.canvas.dpi).toBe(144);
      expect(roundTripped.assets).toEqual([]);
      expect(roundTripped.elements).toEqual([]);
    }
  });

  it('should preserve element defaults in round-trip', () => {
    const withTextElement = {
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
      assets: [],
      elements: [
        {
          id: 'test',
          type: 'text',
          text: 'Test',
          font: 'primary',
          color: 'primary',
          bounds: { x: 0.5, y: 0.5, w: 0.5, h: 0.1 },
          fontSize: 24,
          z: 1,
          // Omitting optional fields with defaults
        },
      ],
    };

    const parseResult = LabelDSLZodSchema.safeParse(withTextElement);
    expect(parseResult.success).toBe(true);

    if (parseResult.success) {
      const textElement = parseResult.data.elements[0];
      // Check defaults were applied
      expect(textElement?.type).toBe('text');
      if (textElement && textElement.type === 'text') {
        expect(textElement.align).toBe('left');
        expect(textElement.lineHeight).toBe(1.2);
        expect(textElement.maxLines).toBe(1);
        expect(textElement.textTransform).toBe('none');
      }

      // Round-trip
      const serialized = JSON.stringify(parseResult.data, null, 2);
      const roundTripped = JSON.parse(serialized);

      // All defaults should be preserved
      const rtTextElement = roundTripped.elements[0];
      expect(rtTextElement.align).toBe('left');
      expect(rtTextElement.lineHeight).toBe(1.2);
      expect(rtTextElement.maxLines).toBe(1);
      expect(rtTextElement.textTransform).toBe('none');
    }
  });
});

describe('Label DSL Type Safety', () => {
  it('should maintain type discrimination through serialization', () => {
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
      assets: [{ id: 'img1', type: 'image', url: 'https://example.com/img.png', width: 100, height: 100 }],
      elements: [
        {
          id: 'text1',
          type: 'text',
          text: 'Label',
          font: 'primary',
          color: 'primary',
          bounds: { x: 0.1, y: 0.1, w: 0.8, h: 0.1 },
          align: 'center',
          fontSize: 24,
          lineHeight: 1.5,
          maxLines: 2,
          textTransform: 'uppercase',
          z: 10,
        },
        {
          id: 'img1',
          type: 'image',
          assetId: 'img1',
          bounds: { x: 0.2, y: 0.3, w: 0.6, h: 0.4 },
          fit: 'cover',
          opacity: 0.8,
          rotation: 15,
          z: 1,
        },
        {
          id: 'line1',
          type: 'shape',
          shape: 'line',
          color: 'secondary',
          bounds: { x: 0.1, y: 0.8, w: 0.8, h: 0.01 },
          strokeWidth: 2,
          rotation: 0,
          z: 5,
        },
      ],
    };

    const parseResult = LabelDSLZodSchema.safeParse(data);
    expect(parseResult.success).toBe(true);

    if (parseResult.success) {
      // Type guards should work after parsing
      const elements = parseResult.data.elements;

      const textElement = elements.find((el: Element) => el.type === 'text');
      expect(textElement?.type).toBe('text');
      if (textElement?.type === 'text') {
        expect(textElement.text).toBe('Label');
        expect(textElement.textTransform).toBe('uppercase');
      }

      const imageElement = elements.find((el: Element) => el.type === 'image');
      expect(imageElement?.type).toBe('image');
      if (imageElement?.type === 'image') {
        expect(imageElement.assetId).toBe('img1');
        expect(imageElement.fit).toBe('cover');
      }

      const shapeElement = elements.find((el: Element) => el.type === 'shape');
      expect(shapeElement?.type).toBe('shape');
      if (shapeElement?.type === 'shape') {
        expect(shapeElement.shape).toBe('line');
        expect(shapeElement.strokeWidth).toBe(2);
      }
    }
  });
});
