import { logger } from '#backend/lib/logger.js';
import { formatElementIdsForPrompt } from '#backend/lib/prompt-utils.js';
import type { LabelDSL } from '#backend/types/label-generation.js';
import type { Edit } from '#backend/types/multimodal-refinement.js';

/**
 * OpenAI API response structure for chat completions
 */
interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string | null;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface VisionRefinerInput {
  submissionText: string;
  dsl: LabelDSL;
  previewUrl: string;
}

export interface LayoutVisionRefiner {
  refineLabel(input: VisionRefinerInput): Promise<Edit[]>;
}

/**
 * Mock implementation for testing and development
 */
export class MockLayoutVisionRefiner implements LayoutVisionRefiner {
  private readonly fixedEdits: Edit[];

  constructor(fixedEdits?: Edit[]) {
    this.fixedEdits = fixedEdits || [
      { op: 'move', id: 'producer-text', dx: 0.05, dy: -0.02 },
      { op: 'resize', id: 'wine-name-text', dw: 0.1, dh: 0.0 },
      { op: 'recolor', id: 'vintage-text', color: 'accent' },
    ];
  }

  async refineLabel(input: VisionRefinerInput): Promise<Edit[]> {
    logger.info('Mock vision refiner processing', {
      submissionTextLength: input.submissionText.length,
      elementCount: input.dsl.elements.length,
      previewUrl: input.previewUrl,
      fixedEditCount: this.fixedEdits.length,
    });

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Filter edits to only include IDs that exist in the DSL
    const existingIds = new Set(input.dsl.elements.map((el) => el.id));
    const validEdits = this.fixedEdits.filter((edit) => existingIds.has(edit.id));

    logger.debug('Mock vision refiner completed', {
      totalFixedEdits: this.fixedEdits.length,
      validEdits: validEdits.length,
      filteredOut: this.fixedEdits.length - validEdits.length,
    });

    return validEdits;
  }
}

/**
 * Real implementation using vision-capable LLM
 */
export class OpenAILayoutVisionRefiner implements LayoutVisionRefiner {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(
    options: {
      apiKey?: string;
      model?: string;
      maxTokens?: number;
    } = {},
  ) {
    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY || '';
    this.model = options.model || 'gpt-4o';
    this.maxTokens = options.maxTokens || 1000;

    if (!this.apiKey) {
      logger.warn('OpenAI API key not configured, vision refiner will fail');
    }
  }

  async refineLabel(input: VisionRefinerInput): Promise<Edit[]> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    logger.info('OpenAI vision refiner processing', {
      model: this.model,
      submissionTextLength: input.submissionText.length,
      elementCount: input.dsl.elements.length,
    });

    const prompt = this.buildPrompt(input);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: this.maxTokens,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: input.previewUrl,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const result = (await response.json()) as OpenAIResponse;
      const content = result.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No response content from OpenAI API');
      }

      // Parse JSON response
      const edits = this.parseEditsFromResponse(content);

      logger.info('OpenAI vision refiner completed', {
        responseLength: content.length,
        editsCount: edits.length,
        totalTokens: result.usage?.total_tokens || null,
      });

      return edits;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('OpenAI vision refiner failed', {
        error: errorMessage,
        model: this.model,
      });
      throw error;
    }
  }

  private buildPrompt(input: VisionRefinerInput): string {
    const availableElements = formatElementIdsForPrompt(input.dsl.elements);
    const minifiedDSL = JSON.stringify(input.dsl);

    return `You are a professional wine label designer reviewing a label preview. Analyze the image and suggest up to 5 edits to improve balance and legibility while respecting visual hierarchy.

SUBMISSION TEXT:
${input.submissionText}

CURRENT DSL (minified):
${minifiedDSL}

AVAILABLE ELEMENT IDs:
${availableElements}

EDIT OPERATIONS:
- move: { "op": "move", "id": "element-id", "dx": number, "dy": number }
- resize: { "op": "resize", "id": "element-id", "dw": number, "dh": number }
- recolor: { "op": "recolor", "id": "element-id", "color": "primary|secondary|accent|background" }
- reorder: { "op": "reorder", "id": "element-id", "z": number }

CONSTRAINTS:
- Max 5 edits total
- dx/dy/dw/dh must be between -0.2 and 0.2
- z must be between 0 and 1000
- Only use existing element IDs
- Elements bounds must remain within [0,1]

Respond with ONLY a JSON array of edit objects. No other text or explanation.`;
  }

  private parseEditsFromResponse(response: string): Edit[] {
    try {
      // Extract JSON from response (handle cases where LLM adds extra text)
      const jsonMatch = response.match(/\[.*\]/s);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      return parsed;
    } catch (error) {
      logger.error('Failed to parse edits from OpenAI response', {
        response: response.substring(0, 500),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(`Failed to parse vision refiner response: ${error}`);
    }
  }
}

/**
 * Default adapter instance - can be configured via environment
 */
export const defaultLayoutVisionRefiner: LayoutVisionRefiner =
  process.env.NODE_ENV === 'test' || process.env.USE_MOCK_VISION_REFINER === 'true'
    ? new MockLayoutVisionRefiner()
    : new OpenAILayoutVisionRefiner();
