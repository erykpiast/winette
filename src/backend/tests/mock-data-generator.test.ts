import { describe, expect, it } from 'vitest';
import { generateMockLabelDSL, generateMockLabelDSLWithOverrides } from '../services/mock-data-generator.js';
import type { Element, LabelGenerationJob, LabelStyleId } from '../types/label-generation.js';
import { LabelDSLSchema } from '../types/label-generation.js';

describe('Mock Data Generator', () => {
  const testWineData: LabelGenerationJob['wineData'] = {
    producerName: 'Test Winery',
    wineName: 'Test Reserve',
    vintage: '2021',
    variety: 'Cabernet Sauvignon',
    region: 'Napa Valley',
    appellation: 'Oakville AVA',
  };

  const styles: LabelStyleId[] = ['classic', 'modern', 'elegant', 'funky'];

  describe('generateMockLabelDSL', () => {
    it.each(styles)('should generate valid %s style mock data', (style) => {
      const result = generateMockLabelDSL(style, testWineData);

      // Verify the result is valid according to the schema
      const validation = LabelDSLSchema.safeParse(result);
      expect(validation.success).toBe(true);

      // Verify basic structure
      expect(result.version).toBe('1');
      expect(result.canvas).toBeDefined();
      expect(result.palette).toBeDefined();
      expect(result.typography).toBeDefined();
      expect(result.elements).toBeInstanceOf(Array);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it.each(styles)('should use placeholder images instead of CDN URLs for %s style', (style) => {
      const result = generateMockLabelDSL(style, testWineData);

      // Check that all asset URLs are data URIs or valid URLs
      result.assets.forEach((asset) => {
        expect(asset.url).toMatch(/^data:image\/|^https?:\/\//);
        // Ensure no example.com URLs
        expect(asset.url).not.toContain('example.com');
      });
    });

    it.each(styles)('should incorporate wine data into %s style elements', (style) => {
      const result = generateMockLabelDSL(style, testWineData);

      // Collect all text from text elements
      const allText = result.elements
        .filter((el): el is Extract<Element, { type: 'text' }> => el.type === 'text')
        .map((el) => el.text)
        .join(' ');

      // Verify wine data is present in the label
      expect(allText).toContain(testWineData.producerName);
      expect(allText).toContain(testWineData.wineName);
      expect(allText).toContain(testWineData.vintage);
      expect(allText).toContain(testWineData.variety);
      // Region or appellation should be present
      expect(allText.includes(testWineData.region) || allText.includes(testWineData.appellation)).toBe(true);
    });

    it.each(styles)('should have correct style configuration for %s', (style) => {
      const result = generateMockLabelDSL(style, testWineData);

      switch (style) {
        case 'classic':
          expect(result.palette.temperature).toBe('warm');
          expect(result.palette.contrast).toBe('high');
          expect(result.typography.hierarchy.producerEmphasis).toBe('dominant');
          break;
        case 'modern':
          expect(result.palette.temperature).toBe('cool');
          expect(result.palette.contrast).toBe('high');
          expect(result.typography.hierarchy.producerEmphasis).toBe('balanced');
          break;
        case 'elegant':
          expect(result.palette.temperature).toBe('neutral');
          expect(result.palette.contrast).toBe('medium');
          expect(result.typography.hierarchy.producerEmphasis).toBe('subtle');
          break;
        case 'funky':
          expect(result.palette.temperature).toBe('warm');
          expect(result.palette.contrast).toBe('high');
          expect(result.typography.hierarchy.producerEmphasis).toBe('dominant');
          break;
      }
    });

    it('should handle long producer names gracefully', () => {
      const longNameData = {
        ...testWineData,
        producerName: 'Very Long Winery Name That Should Be Split Properly',
      };

      const result = generateMockLabelDSL('modern', longNameData);
      const validation = LabelDSLSchema.safeParse(result);
      expect(validation.success).toBe(true);

      // Modern style splits producer name
      const textElements = result.elements.filter((el) => el.type === 'text');
      const producerTexts = textElements.filter((el): el is Extract<Element, { type: 'text' }> => {
        return el.type === 'text' && (el.text.includes('Very') || el.text.includes('Long'));
      });
      expect(producerTexts.length).toBeGreaterThan(0);
    });

    it('should have proper z-index ordering for elements', () => {
      styles.forEach((style) => {
        const result = generateMockLabelDSL(style, testWineData);

        // Verify z-indices are numbers
        result.elements.forEach((element) => {
          expect(typeof element.z).toBe('number');
          expect(element.z).toBeGreaterThanOrEqual(0);
          expect(element.z).toBeLessThanOrEqual(1000);
        });

        // Text elements should generally have higher z-index than shapes/images
        const textElements = result.elements.filter((el) => el.type === 'text');
        const nonTextElements = result.elements.filter((el) => el.type !== 'text');

        if (textElements.length > 0 && nonTextElements.length > 0) {
          const avgTextZ = textElements.reduce((sum, el) => sum + el.z, 0) / textElements.length;
          const avgNonTextZ = nonTextElements.reduce((sum, el) => sum + el.z, 0) / nonTextElements.length;
          expect(avgTextZ).toBeGreaterThanOrEqual(avgNonTextZ);
        }
      });
    });
  });

  describe('generateMockLabelDSLWithOverrides', () => {
    it('should apply overrides to generated mock', () => {
      const overrides = {
        canvas: {
          width: 1000,
          height: 1500,
          dpi: 600,
          background: '#000000',
        },
      };

      const result = generateMockLabelDSLWithOverrides('classic', testWineData, overrides);

      expect(result.canvas.width).toBe(1000);
      expect(result.canvas.height).toBe(1500);
      expect(result.canvas.dpi).toBe(600);
      expect(result.canvas.background).toBe('#000000');

      // Other properties should remain from the base mock
      expect(result.palette).toBeDefined();
      expect(result.typography).toBeDefined();
    });

    it('should validate overridden mock data', () => {
      const invalidOverrides = {
        canvas: {
          width: -100, // Invalid width
          height: 1200,
          dpi: 300,
          background: '#FFFFFF',
        },
      };

      expect(() => {
        generateMockLabelDSLWithOverrides('modern', testWineData, invalidOverrides);
      }).toThrow(/invalid/i);
    });

    it('should allow partial element overrides', () => {
      const overrides = {
        elements: [
          {
            id: 'custom-element',
            type: 'text' as const,
            text: 'Custom Text',
            font: 'primary' as const,
            color: 'primary' as const,
            bounds: { x: 0.1, y: 0.1, w: 0.8, h: 0.1 },
            fontSize: 24,
            z: 100,
            align: 'center' as const,
            lineHeight: 1.2,
            maxLines: 1,
            textTransform: 'none' as const,
          },
        ],
      };

      const result = generateMockLabelDSLWithOverrides('elegant', testWineData, overrides);

      expect(result.elements).toHaveLength(1);
      expect(result.elements[0]?.id).toBe('custom-element');
      const firstElement = result.elements[0];
      expect(firstElement).toBeDefined();
      if (firstElement && firstElement.type === 'text') {
        expect(firstElement.text).toBe('Custom Text');
      }
    });
  });

  describe('Element bounds validation', () => {
    it.each(styles)('should have valid bounds for all elements in %s style', (style) => {
      const result = generateMockLabelDSL(style, testWineData);

      result.elements.forEach((element) => {
        // All bounds values should be between 0 and 1
        expect(element.bounds.x).toBeGreaterThanOrEqual(0);
        expect(element.bounds.x).toBeLessThanOrEqual(1);
        expect(element.bounds.y).toBeGreaterThanOrEqual(0);
        expect(element.bounds.y).toBeLessThanOrEqual(1);
        expect(element.bounds.w).toBeGreaterThanOrEqual(0);
        expect(element.bounds.w).toBeLessThanOrEqual(1);
        expect(element.bounds.h).toBeGreaterThanOrEqual(0);
        expect(element.bounds.h).toBeLessThanOrEqual(1);

        // Elements should not exceed canvas bounds
        expect(element.bounds.x + element.bounds.w).toBeLessThanOrEqual(1);
        expect(element.bounds.y + element.bounds.h).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Typography validation', () => {
    it.each(styles)('should have valid typography settings for %s style', (style) => {
      const result = generateMockLabelDSL(style, testWineData);

      // Check primary and secondary fonts
      ['primary', 'secondary'].forEach((fontType) => {
        const font = result.typography[fontType as 'primary' | 'secondary'];
        expect(font.family).toBeTruthy();
        expect(font.weight).toBeGreaterThanOrEqual(100);
        expect(font.weight).toBeLessThanOrEqual(900);
        expect(['normal', 'italic']).toContain(font.style);
        expect(typeof font.letterSpacing).toBe('number');
      });

      // Check hierarchy
      const hierarchy = result.typography.hierarchy;
      expect(['dominant', 'balanced', 'subtle']).toContain(hierarchy.producerEmphasis);
      expect(['featured', 'standard', 'minimal']).toContain(hierarchy.vintageProminence);
      expect(['prominent', 'integrated', 'subtle']).toContain(hierarchy.regionDisplay);
    });
  });

  describe('Color palette validation', () => {
    it.each(styles)('should have valid color values for %s style', (style) => {
      const result = generateMockLabelDSL(style, testWineData);

      // Check all color values are hex colors
      ['primary', 'secondary', 'accent', 'background'].forEach((colorType) => {
        const color = result.palette[colorType as keyof typeof result.palette];
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });

      // Verify temperature and contrast
      expect(['warm', 'cool', 'neutral']).toContain(result.palette.temperature);
      expect(['high', 'medium', 'low']).toContain(result.palette.contrast);
    });
  });
});
