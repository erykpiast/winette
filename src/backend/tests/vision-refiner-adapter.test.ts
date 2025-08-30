import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VisionRefinerInput } from '../services/vision-refiner-adapter.js';
import { MockLayoutVisionRefiner, OpenAILayoutVisionRefiner } from '../services/vision-refiner-adapter.js';
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

describe('LayoutVisionRefiner', () => {
  const mockDSL: LabelDSL = {
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
    ],
  };

  const mockInput: VisionRefinerInput = {
    submissionText: 'Château Test Cabernet Sauvignon 2020',
    dsl: mockDSL,
    previewUrl:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  };

  describe('MockLayoutVisionRefiner', () => {
    it('should return default fixed edits when no custom edits provided', async () => {
      const adapter = new MockLayoutVisionRefiner();
      const result = await adapter.refineLabel(mockInput);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContainEqual({ op: 'move', id: 'producer-text', dx: 0.05, dy: -0.02 });
    });

    it('should return custom fixed edits when provided', async () => {
      const customEdits: Edit[] = [
        { op: 'resize', id: 'wine-name-text', dw: 0.1, dh: 0.05 },
        { op: 'recolor', id: 'producer-text', color: 'accent' },
      ];
      const adapter = new MockLayoutVisionRefiner(customEdits);
      const result = await adapter.refineLabel(mockInput);

      expect(result).toEqual(customEdits);
    });

    it('should filter out edits for non-existent element IDs', async () => {
      const customEdits: Edit[] = [
        { op: 'move', id: 'producer-text', dx: 0.05, dy: -0.02 }, // exists
        { op: 'resize', id: 'nonexistent-element', dw: 0.1, dh: 0.05 }, // doesn't exist
        { op: 'recolor', id: 'wine-name-text', color: 'accent' }, // exists
      ];
      const adapter = new MockLayoutVisionRefiner(customEdits);
      const result = await adapter.refineLabel(mockInput);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual({ op: 'move', id: 'producer-text', dx: 0.05, dy: -0.02 });
      expect(result).toContainEqual({ op: 'recolor', id: 'wine-name-text', color: 'accent' });
      expect(result.some((edit) => edit.id === 'nonexistent-element')).toBe(false);
    });

    it('should simulate processing time', async () => {
      const adapter = new MockLayoutVisionRefiner();
      const start = Date.now();
      await adapter.refineLabel(mockInput);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(90); // Should take at least ~100ms
    });

    it('should handle empty DSL elements gracefully', async () => {
      const emptyDSL = { ...mockDSL, elements: [] };
      const emptyInput = { ...mockInput, dsl: emptyDSL };
      const adapter = new MockLayoutVisionRefiner();

      const result = await adapter.refineLabel(emptyInput);

      expect(result).toEqual([]); // All edits should be filtered out
    });
  });

  describe('OpenAILayoutVisionRefiner', () => {
    const mockFetch = vi.fn();

    beforeEach(() => {
      global.fetch = mockFetch;
      mockFetch.mockClear();
    });

    afterEach(() => {
      vi.resetAllMocks();
    });

    it('should throw error when API key not configured', async () => {
      const adapter = new OpenAILayoutVisionRefiner({ apiKey: '' });

      await expect(adapter.refineLabel(mockInput)).rejects.toThrow('OpenAI API key not configured');
    });

    it('should make correct API call to OpenAI', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '[{"op": "move", "id": "producer-text", "dx": 0.05, "dy": -0.02}]',
              },
            },
          ],
          usage: { total_tokens: 150 },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const adapter = new OpenAILayoutVisionRefiner({ apiKey: 'test-key' });
      const result = await adapter.refineLabel(mockInput);

      expect(mockFetch).toHaveBeenCalledOnce();
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs).toBeDefined();
      expect(callArgs?.[0]).toBe('https://api.openai.com/v1/chat/completions');

      const requestBody = JSON.parse(callArgs?.[1].body);
      expect(requestBody.model).toBe('gpt-4o');
      expect(requestBody.messages[0].content).toHaveLength(2);
      expect(requestBody.messages[0].content[0].type).toBe('text');
      expect(requestBody.messages[0].content[1].type).toBe('image_url');
      expect(requestBody.messages[0].content[1].image_url.url).toBe(mockInput.previewUrl);

      expect(result).toEqual([{ op: 'move', id: 'producer-text', dx: 0.05, dy: -0.02 }]);
    });

    it('should handle API error responses', async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      };
      mockFetch.mockResolvedValue(mockResponse);

      const adapter = new OpenAILayoutVisionRefiner({ apiKey: 'test-key' });

      await expect(adapter.refineLabel(mockInput)).rejects.toThrow('OpenAI API error: 429 Too Many Requests');
    });

    it('should handle missing response content', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ choices: [] }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const adapter = new OpenAILayoutVisionRefiner({ apiKey: 'test-key' });

      await expect(adapter.refineLabel(mockInput)).rejects.toThrow('No response content from OpenAI API');
    });

    it('should parse JSON response correctly', async () => {
      const expectedEdits = [
        { op: 'move', id: 'producer-text', dx: 0.05, dy: -0.02 },
        { op: 'resize', id: 'wine-name-text', dw: 0.1, dh: 0.0 },
        { op: 'recolor', id: 'producer-text', color: 'accent' },
      ];

      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(expectedEdits),
              },
            },
          ],
          usage: { total_tokens: 200 },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const adapter = new OpenAILayoutVisionRefiner({ apiKey: 'test-key' });
      const result = await adapter.refineLabel(mockInput);

      expect(result).toEqual(expectedEdits);
    });

    it('should handle LLM response with extra text around JSON', async () => {
      const expectedEdits = [{ op: 'move', id: 'producer-text', dx: 0.05, dy: -0.02 }];

      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: `Looking at the label, I suggest these improvements:\n\n${JSON.stringify(expectedEdits)}\n\nThese changes should improve the layout.`,
              },
            },
          ],
          usage: { total_tokens: 180 },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const adapter = new OpenAILayoutVisionRefiner({ apiKey: 'test-key' });
      const result = await adapter.refineLabel(mockInput);

      expect(result).toEqual(expectedEdits);
    });

    it('should throw error for invalid JSON response', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'This is not valid JSON for edits',
              },
            },
          ],
          usage: { total_tokens: 50 },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const adapter = new OpenAILayoutVisionRefiner({ apiKey: 'test-key' });

      await expect(adapter.refineLabel(mockInput)).rejects.toThrow('Failed to parse vision refiner response');
    });

    it('should use custom model and maxTokens parameters', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '[]' } }],
          usage: { total_tokens: 100 },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const adapter = new OpenAILayoutVisionRefiner({
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
        maxTokens: 500,
      });
      await adapter.refineLabel(mockInput);

      const requestBody = JSON.parse(mockFetch.mock.calls[0]?.[1].body);
      expect(requestBody.model).toBe('gpt-4o-mini');
      expect(requestBody.max_tokens).toBe(500);
    });

    it('should build correct prompt with submission text and DSL', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '[]' } }],
          usage: { total_tokens: 100 },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const adapter = new OpenAILayoutVisionRefiner({ apiKey: 'test-key' });
      await adapter.refineLabel(mockInput);

      const requestBody = JSON.parse(mockFetch.mock.calls[0]?.[1].body);
      const prompt = requestBody.messages[0].content[0].text;

      expect(prompt).toContain(mockInput.submissionText);
      expect(prompt).toContain(JSON.stringify(mockInput.dsl));
      expect(prompt).toContain('- "producer-text" (text: "Château Test")'); // element IDs in new format
      expect(prompt).toContain('- "wine-name-text" (text: "Cabernet Sauvignon")');
      expect(prompt).toContain('Max 5 edits total');
      expect(prompt).toContain('dx/dy/dw/dh must be between -0.2 and 0.2');
      expect(prompt).toContain('ONLY a JSON array');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const adapter = new OpenAILayoutVisionRefiner({ apiKey: 'test-key' });

      await expect(adapter.refineLabel(mockInput)).rejects.toThrow('Network error');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle deterministic mock returns for testing', async () => {
      const deterministicEdits: Edit[] = [
        { op: 'move', id: 'producer-text', dx: 0.1, dy: -0.05 },
        { op: 'resize', id: 'wine-name-text', dw: 0.15, dh: 0.0 },
        { op: 'recolor', id: 'producer-text', color: 'accent' },
      ];

      const adapter = new MockLayoutVisionRefiner(deterministicEdits);

      // Multiple calls should return the same result
      const result1 = await adapter.refineLabel(mockInput);
      const result2 = await adapter.refineLabel(mockInput);

      expect(result1).toEqual(result2);
      expect(result1).toEqual(deterministicEdits);
    });

    it('should filter mock edits based on DSL element IDs', async () => {
      const mixedEdits: Edit[] = [
        { op: 'move', id: 'producer-text', dx: 0.1, dy: -0.05 }, // exists
        { op: 'resize', id: 'vintage-text', dw: 0.15, dh: 0.0 }, // doesn't exist
        { op: 'recolor', id: 'wine-name-text', color: 'accent' }, // exists
        { op: 'reorder', id: 'region-text', z: 15 }, // doesn't exist
      ];

      const adapter = new MockLayoutVisionRefiner(mixedEdits);
      const result = await adapter.refineLabel(mockInput);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual({ op: 'move', id: 'producer-text', dx: 0.1, dy: -0.05 });
      expect(result).toContainEqual({ op: 'recolor', id: 'wine-name-text', color: 'accent' });
    });
  });
});
