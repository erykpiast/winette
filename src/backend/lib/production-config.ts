// Production configuration for LangChain pipeline
// Handles environment-based setup and real service integration

import type {
  ImageGenerateInput,
  ImageGenerateOutput,
  RefineInput,
  RefineOutput,
} from '../schema/langchain-pipeline-schemas.js';
import { ImageGenerationError } from './error-handling.js';
import { extractJSON } from './json-utils.js';
import type { ImageModelAdapter, VisionRefinerAdapter } from './langchain-pipeline.js';
import { classifyLangChainError, configurePipeline } from './langchain-pipeline.js';
import { initializeLangSmithTracing } from './langsmith-tracing.js';
import { logger } from './logger.js';

/**
 * Default model for LangChain operations
 */
const DEFAULT_CLAUDE_MODEL = 'claude-3-5-haiku-20241022';

/**
 * Resolved model name with environment variable fallback
 */
const LANGCHAIN_MODEL = process.env.LANGCHAIN_DEFAULT_MODEL || DEFAULT_CLAUDE_MODEL;

/**
 * Production Image Adapter - DALL-E 3 integration for wine label image generation
 */
class ProductionImageAdapter implements ImageModelAdapter {
  private readonly baseUrl = 'https://api.openai.com/v1/images/generations';
  private readonly timeoutMs = 60000; // 60 second timeout for image generation

  async generate(input: ImageGenerateInput): Promise<ImageGenerateOutput> {
    logger.info('ProductionImageAdapter: Generating image with DALL-E 3', {
      promptId: input.id,
      purpose: input.purpose,
    });

    const [width, height] = this.parseAspectRatio(input.aspect);
    const enhancedPrompt = this.enhancePromptForWineLabel(input);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: enhancedPrompt,
          n: 1,
          size: this.mapToValidSize(width, height),
          quality: 'hd',
          style: input.purpose === 'decoration' ? 'natural' : 'vivid',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        let userMessage = 'Image generation temporarily unavailable';
        let errorType: 'network' | 'processing' = 'processing';
        let retryable = false;

        // Log detailed error for debugging
        logger.error('DALL-E 3 API Error', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorBody,
          requestPrompt: `${enhancedPrompt.substring(0, 100)}...`,
          requestSize: this.mapToValidSize(width, height),
          hasApiKey: !!process.env.OPENAI_API_KEY,
          apiKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 8) || 'missing',
        });

        // Classify error for better user feedback
        switch (response.status) {
          case 429:
            userMessage = 'Service is busy, please try again in a moment';
            errorType = 'network';
            retryable = true;
            break;
          case 401:
          case 403:
            userMessage = 'Authentication issue - please contact support';
            break;
          case 400:
            userMessage = 'Invalid image parameters - please adjust your design';
            break;
          case 500:
          case 502:
          case 503:
            userMessage = 'Service temporarily unavailable';
            errorType = 'network';
            retryable = true;
            break;
        }

        throw new ImageGenerationError(userMessage, errorType, retryable, {
          promptId: input.id,
          purpose: input.purpose,
          technicalError: errorBody,
          statusCode: response.status,
        });
      }

      const data = (await response.json()) as {
        data: Array<{ url: string }>;
      };

      if (!data.data?.[0]?.url) {
        throw new ImageGenerationError(
          'Image generation failed - please try again',
          'processing',
          true, // Retryable since it might be a temporary API issue
          {
            promptId: input.id,
            technicalError: 'API response missing image URL',
          },
        );
      }

      const imageUrl = data.data[0].url;

      logger.info('ProductionImageAdapter: Image generated successfully', {
        promptId: input.id,
        imageUrl,
      });

      return {
        id: `prod-${input.id}`,
        url: imageUrl,
        width,
        height,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new ImageGenerationError(
          'Image generation timed out - please try again',
          'network',
          true, // Retryable
          {
            promptId: input.id,
            technicalError: `Request timeout after ${this.timeoutMs}ms`,
          },
        );
        logger.error('ProductionImageAdapter: Request timeout', {
          promptId: input.id,
          timeoutMs: this.timeoutMs,
        });
        throw timeoutError;
      }

      logger.error('ProductionImageAdapter: Image generation failed', {
        promptId: input.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private enhancePromptForWineLabel(input: ImageGenerateInput): string {
    const contextualEnhancements = {
      background: 'Professional wine photography style, suitable for elegant wine label background',
      foreground: 'Wine label foreground element, crisp and detailed',
      decoration: 'Decorative wine label element, elegant and sophisticated',
    };

    const enhancement = contextualEnhancements[input.purpose] || '';
    let enhancedPrompt = `${input.prompt}. ${enhancement}`;

    if (input.negativePrompt) {
      enhancedPrompt += `. Avoid: ${input.negativePrompt}`;
    }

    // Add wine label context if not already present
    if (!input.prompt.toLowerCase().includes('wine') && !input.prompt.toLowerCase().includes('label')) {
      enhancedPrompt += '. Wine industry aesthetic, premium quality.';
    }

    return enhancedPrompt;
  }

  private parseAspectRatio(aspect: string): [number, number] {
    const ratios: Record<string, [number, number]> = {
      '1:1': [1024, 1024],
      '3:2': [1792, 1024],
      '16:9': [1792, 1024], // Same as 3:2 in DALL-E
      '2:3': [1024, 1792],
      // Approximations for unsupported ratios
      '4:3': [1792, 1024], // Approximated to 16:9
      '3:4': [1024, 1792], // Approximated to 2:3
    };

    const result = ratios[aspect];
    if (!result) {
      logger.warn('Unknown aspect ratio, defaulting to square', { aspect });
      return [1024, 1024];
    }

    // Log when approximation occurs
    if (aspect === '4:3' || aspect === '3:4') {
      logger.info('Aspect ratio approximated for DALL-E 3', {
        requested: aspect,
        actual: result[0] > result[1] ? '16:9' : '2:3',
        note: 'DALL-E 3 only supports 1:1, 16:9 (896x512), and 2:3 (512x896)',
      });
    }

    return result;
  }

  private mapToValidSize(width: number, height: number): '1024x1024' | '1792x1024' | '1024x1792' {
    if (width === height) {
      return '1024x1024';
    }
    if (width > height) {
      return '1792x1024';
    }
    return '1024x1792';
  }
}

/**
 * Production Vision Refiner - GPT-5 integration for wine label refinement
 */
class ProductionVisionRefiner implements VisionRefinerAdapter {
  private readonly baseUrl = 'https://api.openai.com/v1/chat/completions';
  private readonly timeoutMs = 30000; // 30 second timeout for vision analysis

  async proposeEdits(input: RefineInput): Promise<RefineOutput> {
    logger.info('ProductionVisionRefiner: Analyzing with GPT-5', {
      submissionId: input.submission.producerName,
      previewUrl: input.previewUrl,
    });

    const analysisPrompt = this.buildAnalysisPrompt(input);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5-2025-08-07',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: analysisPrompt,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: input.previewUrl,
                    detail: 'high',
                  },
                },
              ],
            },
          ],
          max_tokens: 1000,
          temperature: 0.3,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        let userMessage = 'Vision analysis temporarily unavailable';
        let errorType: 'network' | 'processing' = 'processing';
        let retryable = false;

        // Classify error for better user feedback
        switch (response.status) {
          case 429:
            userMessage = 'Service is busy, please try again in a moment';
            errorType = 'network';
            retryable = true;
            break;
          case 401:
          case 403:
            userMessage = 'Authentication issue - please contact support';
            break;
          case 400:
            userMessage = 'Invalid image or parameters - please check your label design';
            break;
          case 500:
          case 502:
          case 503:
            userMessage = 'Analysis service temporarily unavailable';
            errorType = 'network';
            retryable = true;
            break;
        }

        throw new ImageGenerationError(userMessage, errorType, retryable, {
          submissionId: input.submission.producerName,
          technicalError: errorBody,
          statusCode: response.status,
          service: 'vision-refiner',
        });
      }

      const data = (await response.json()) as {
        choices: Array<{
          message: { content: string };
        }>;
      };

      if (!data.choices?.[0]?.message?.content) {
        throw new ImageGenerationError(
          'Vision analysis failed - please try again',
          'processing',
          true, // Retryable since it might be a temporary API issue
          {
            submissionId: input.submission.producerName,
            technicalError: 'GPT-5 response missing analysis content',
            service: 'vision-refiner',
          },
        );
      }

      const analysisText = data.choices[0].message.content;

      // Parse the structured response
      const refinementResult = this.parseVisionAnalysis(analysisText);

      logger.info('ProductionVisionRefiner: Analysis completed', {
        submissionId: input.submission.producerName,
        operationsCount: refinementResult.operations.length,
        confidence: refinementResult.confidence,
      });

      return refinementResult;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        logger.error('ProductionVisionRefiner: Request timeout', {
          submissionId: input.submission.producerName,
          timeoutMs: this.timeoutMs,
        });

        return {
          operations: [],
          reasoning: 'Vision analysis timed out - please try again',
          confidence: 0.1,
        };
      }

      // Use consistent error classification
      const classifiedError = classifyLangChainError(error);

      logger.error('ProductionVisionRefiner: Analysis failed', {
        submissionId: input.submission.producerName,
        error: classifiedError.message,
        errorType: classifiedError.type,
        retryable: classifiedError.retryable,
      });

      // Return safe fallback with classified error message
      return {
        operations: [],
        reasoning: classifiedError.message,
        confidence: 0.1,
      };
    }
  }

  private buildAnalysisPrompt(input: RefineInput): string {
    return `Analyze this wine label preview for a ${input.submission.variety} wine from ${input.submission.region}.

Winery: ${input.submission.producerName}
Wine: ${input.submission.wineName} (${input.submission.vintage})
Appellation: ${input.submission.appellation}

Evaluate the design for:
1. Typography hierarchy and readability
2. Color harmony and brand consistency
3. Element positioning and visual balance
4. Industry standards compliance
5. Overall aesthetic appeal

${input.refinementFeedback ? `User feedback: ${input.refinementFeedback}` : ''}

Provide your analysis as JSON with this structure:
{
  "operations": [
    {
      "type": "update_element",
      "elementId": "element-id",
      "property": "fontSize|color|bounds|text",
      "value": "new-value",
      "reasoning": "why this change improves the design"
    }
  ],
  "reasoning": "overall analysis summary",
  "confidence": 0.8
}

Only suggest changes that would meaningfully improve the design. Return empty operations array if the design is already well-balanced.`;
  }

  private parseVisionAnalysis(analysisText: string): RefineOutput {
    try {
      // Use robust JSON extraction from json-utils
      const parsed = extractJSON(analysisText);
      return this.validateAndSanitizeOutput(parsed);
    } catch (parseError) {
      logger.warn('Failed to extract JSON from GPT-5 response', {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        responsePreview: analysisText.slice(0, 200),
      });

      // Fallback response
      return {
        operations: [],
        reasoning:
          analysisText.length > 0
            ? `Vision analysis: ${analysisText.slice(0, 200)}...`
            : 'Vision analysis completed with parsing issues',
        confidence: 0.5,
      };
    }
  }

  private validateAndSanitizeOutput(parsed: unknown): RefineOutput {
    // Validate structure
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid response structure');
    }

    const response = parsed as Record<string, unknown>;

    // Sanitize operations with proper validation
    const operations = Array.isArray(response.operations)
      ? response.operations
          .filter((op: unknown) => {
            if (!op || typeof op !== 'object') return false;
            const operation = op as Record<string, unknown>;
            return (
              operation.type &&
              operation.elementId &&
              operation.property &&
              operation.value !== undefined &&
              typeof operation.type === 'string' &&
              typeof operation.elementId === 'string' &&
              typeof operation.property === 'string'
            );
          })
          .slice(0, 5) // Limit to 5 operations max
      : [];

    return {
      operations,
      reasoning: typeof response.reasoning === 'string' ? response.reasoning : 'Vision analysis completed',
      confidence: typeof response.confidence === 'number' ? Math.max(0, Math.min(1, response.confidence)) : 0.7,
    };
  }
}

/**
 * Configures pipeline for production use with real services
 */
export function configureForProduction() {
  // Validate required environment variables
  const requiredEnvVars = {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  };

  const missing = Object.entries(requiredEnvVars)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  logger.info('Configuring LangChain pipeline for production', {
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
  });

  // Initialize LangSmith tracing for production observability
  initializeLangSmithTracing();

  // Configure with production adapters
  configurePipeline({
    imageAdapter: new ProductionImageAdapter(),
    visionAdapter: new ProductionVisionRefiner(),
    // Model configs are already set to production models in DEFAULT_MODEL_CONFIGS
    // Override here if you want different models
    modelConfigs: {
      'design-scheme': {
        provider: 'anthropic',
        model: LANGCHAIN_MODEL,
        temperature: 0.3,
      },
      'image-prompts': {
        provider: 'anthropic',
        model: LANGCHAIN_MODEL,
        temperature: 0.7,
      },
      'detailed-layout': {
        provider: 'anthropic',
        model: LANGCHAIN_MODEL,
        temperature: 0.2,
      },
      refine: {
        provider: 'anthropic',
        model: LANGCHAIN_MODEL,
        temperature: 0.1,
      },
    },
  });

  logger.info('Production configuration complete');
}

/**
 * Auto-configure based on environment
 */
export function autoConfigurePipeline() {
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
    configureForProduction();
  } else {
    logger.info('Using development configuration with mock adapters');
    // Development uses mock adapters by default
  }
}
