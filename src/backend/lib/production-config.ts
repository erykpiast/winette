// Production configuration for LangChain pipeline
// Handles environment-based setup and real service integration

import type {
  ImageGenerateInput,
  ImageGenerateOutput,
  RefineInput,
  RefineOutput,
} from '../schema/langchain-pipeline-schemas.js';
import { SupabaseLabelStorage } from '../services/label-storage-service.js';
import { createImageAsset } from '../types/asset-types.js';
import { ImageGenerationError } from './error-handling.js';
import { extractJSON } from './json-utils.js';
import type { ImageModelAdapter, VisionRefinerAdapter } from './langchain-pipeline/index.js';
import { classifyLangChainError, configurePipeline, ProductionRendererAdapter } from './langchain-pipeline/index.js';
import { initializeLangSmithTracing } from './langsmith-tracing.js';
import { logger } from './logger.js';
import { getVisionConfig, VISION_ERROR_MESSAGES, VISION_PROMPTS, validateVisionConfig } from './vision-config.js';

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

      return createImageAsset(`prod-${input.id}`, imageUrl, width, height);
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

      // Use consistent error classification
      const classifiedError = classifyLangChainError(error);

      logger.error('ProductionImageAdapter: Image generation failed', {
        promptId: input.id,
        error: classifiedError.message,
        errorType: classifiedError.type,
        retryable: classifiedError.retryable,
      });

      throw new ImageGenerationError(classifiedError.message, classifiedError.type, classifiedError.retryable, {
        promptId: input.id,
        purpose: input.purpose,
        service: 'image-generation',
      });
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
 * Production Vision Refiner - GPT-4o integration for wine label refinement
 * Uses centralized vision configuration for consistent behavior
 */
class ProductionVisionRefiner implements VisionRefinerAdapter {
  private readonly config = getVisionConfig();

  constructor() {
    // Validate configuration on instantiation
    validateVisionConfig(this.config);
  }

  async proposeEdits(input: RefineInput): Promise<RefineOutput> {
    logger.info('ProductionVisionRefiner: Analyzing with GPT-5', {
      submissionId: input.submission.producerName,
      previewUrlLength: input.previewUrl.length,
    });

    const analysisPrompt = this.buildAnalysisPrompt(input);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    const imageUrl = input.previewUrl;

    try {
      const response = await fetch(this.config.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
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
                    url: imageUrl,
                    detail: this.config.imageDetail,
                  },
                },
              ],
            },
          ],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        let userMessage: string = VISION_ERROR_MESSAGES.SERVICE_UNAVAILABLE;
        let errorType: 'network' | 'processing' = 'processing';
        let retryable = false;

        // Classify error for better user feedback using centralized messages
        switch (response.status) {
          case 429:
            userMessage = VISION_ERROR_MESSAGES.RATE_LIMIT;
            errorType = 'network';
            retryable = true;
            break;
          case 401:
          case 403:
            userMessage = VISION_ERROR_MESSAGES.AUTH_ERROR;
            break;
          case 400:
            userMessage = VISION_ERROR_MESSAGES.INVALID_IMAGE;
            break;
          case 500:
          case 502:
          case 503:
            userMessage = VISION_ERROR_MESSAGES.SERVICE_UNAVAILABLE;
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
          VISION_ERROR_MESSAGES.ANALYSIS_FAILED,
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
          timeoutMs: this.config.timeoutMs,
        });

        return {
          operations: [],
          reasoning: VISION_ERROR_MESSAGES.TIMEOUT,
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
    const wineContext = `Analyze this wine label preview for a ${input.submission.variety} wine from ${input.submission.region}.

Winery: ${input.submission.producerName}
Wine: ${input.submission.wineName} (${input.submission.vintage})
Appellation: ${input.submission.appellation}
${input.refinementFeedback ? `\nUser feedback: ${input.refinementFeedback}` : ''}`;

    return `${wineContext}

${VISION_PROMPTS.ANALYSIS_INSTRUCTIONS}`;
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
      throw new ImageGenerationError('Vision analysis returned invalid structure', 'processing', true, {
        responseType: typeof parsed,
        service: 'vision-refiner',
      });
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
          .slice(0, this.config.maxOperations) // Limit operations based on config
      : [];

    return {
      operations,
      reasoning: typeof response.reasoning === 'string' ? response.reasoning : 'Vision analysis completed',
      confidence:
        typeof response.confidence === 'number'
          ? Math.max(0, Math.min(1, response.confidence))
          : this.config.defaultConfidence,
    };
  }
}

/**
 * Configures pipeline for production use with real services
 */
export async function configureForProduction() {
  // Validate required environment variables
  const requiredEnvVars = {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  };

  const missing = Object.entries(requiredEnvVars)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    logger.error('Missing required environment variables for production configuration', {
      missingVars: missing,
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    });
    throw new ImageGenerationError(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        `Please set these in your .env file or environment configuration.`,
      'validation',
      false,
      {
        missingEnvironmentVariables: missing,
        suggestion: 'Copy env.example to .env.local and configure your API keys',
      },
    );
  }

  logger.info('Configuring LangChain pipeline for production', {
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
  });

  // Initialize LangSmith tracing for production observability
  initializeLangSmithTracing();

  // Configure with production adapters
  const labelStorage = new SupabaseLabelStorage();

  configurePipeline({
    imageAdapter: new ProductionImageAdapter(),
    visionAdapter: new ProductionVisionRefiner(),
    rendererAdapter: new ProductionRendererAdapter(labelStorage),
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
export async function autoConfigurePipeline() {
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
    await configureForProduction();
  } else {
    logger.info('Using development configuration with mock adapters');
    // Development uses mock adapters by default
  }
}
