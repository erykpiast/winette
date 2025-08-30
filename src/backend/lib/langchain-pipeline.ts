import { ChatAnthropic } from '@langchain/anthropic';
import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { PromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import type { z } from 'zod';
import type {
  ImageGenerateInput,
  ImageGenerateOutput,
  PipelineStep,
  RefineInput,
  RefineOutput,
} from '../schema/langchain-pipeline-schemas.js';
import { ImageGenerationError, type RetryConfig, withRetry } from './error-handling.js';
import { extractJSON } from './json-utils.js';
import { initializeLangSmithTracing } from './langsmith-tracing.js';
import { logger } from './logger.js';

// Initialize LangSmith tracing if configured
initializeLangSmithTracing();

// Re-export for testing
export { withRetry };

// ============================================================================
// Model Configuration and Adapters
// ============================================================================

export interface ModelConfig {
  provider: 'anthropic' | 'openai' | 'mock';
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface ImageModelAdapter {
  generate(prompt: ImageGenerateInput): Promise<ImageGenerateOutput>;
}

export interface VisionRefinerAdapter {
  proposeEdits(input: RefineInput): Promise<RefineOutput>;
}

// Default model configurations
// Note: 'image-generate' and 'render' steps use dedicated adapters, not LLMs
const DEFAULT_MODEL_CONFIGS: Record<PipelineStep, ModelConfig> = {
  'design-scheme': { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', temperature: 0.3 },
  'image-prompts': { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', temperature: 0.7 },
  'image-generate': { provider: 'anthropic' }, // Not used - step uses ImageModelAdapter
  'detailed-layout': { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', temperature: 0.2 },
  render: { provider: 'anthropic' }, // Not used - step uses renderer service directly
  refine: { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', temperature: 0.1 },
};

// ============================================================================
// Mock LLM for Testing
// ============================================================================

export class MockChatModel {
  _llmType(): string {
    return 'mock-chat-model';
  }

  async invoke(input: string): Promise<string> {
    logger.debug('MockChatModel: Generating mock response', {
      inputLength: input.length,
    });

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Generate appropriate mock JSON based on the prompt content
    if (input.includes('design scheme') || input.includes('design-scheme')) {
      return JSON.stringify({
        version: '1',
        canvas: {
          width: 750,
          height: 1000,
          dpi: 300,
          background: '#F5F5DC',
        },
        palette: {
          primary: '#722F37',
          secondary: '#D4AF37',
          accent: '#2F4F2F',
          background: '#F5F5DC',
          temperature: 'warm',
          contrast: 'medium',
        },
        typography: {
          primary: {
            family: 'serif',
            weight: 600,
            style: 'normal',
            letterSpacing: 0,
          },
          secondary: {
            family: 'sans-serif',
            weight: 400,
            style: 'normal',
            letterSpacing: 0.3,
          },
          hierarchy: {
            producerEmphasis: 'balanced',
            vintageProminence: 'featured',
            regionDisplay: 'integrated',
          },
        },
        assets: [],
        elements: [],
      });
    }

    if (input.includes('image prompts') || input.includes('image-prompts')) {
      return JSON.stringify({
        expectedPrompts: 2,
        prompts: [
          {
            id: 'background-mock',
            purpose: 'background',
            prompt: 'Elegant vineyard landscape with warm golden lighting',
            aspect: '3:2',
            negativePrompt: 'harsh lighting, artificial',
            guidance: 7.5,
          },
          {
            id: 'decoration-mock',
            purpose: 'decoration',
            prompt: 'Watercolor grape cluster illustration, elegant and minimal',
            aspect: '1:1',
            negativePrompt: 'photorealistic, busy',
            guidance: 8.0,
          },
        ],
      });
    }

    if (input.includes('detailed layout') || input.includes('detailed-layout')) {
      return JSON.stringify({
        version: '1',
        canvas: {
          width: 750,
          height: 1000,
          dpi: 300,
          background: '#F5F5DC',
        },
        palette: {
          primary: '#722F37',
          secondary: '#D4AF37',
          accent: '#2F4F2F',
          background: '#F5F5DC',
          temperature: 'warm',
          contrast: 'medium',
        },
        typography: {
          primary: {
            family: 'serif',
            weight: 600,
            style: 'normal',
            letterSpacing: 0,
          },
          secondary: {
            family: 'sans-serif',
            weight: 400,
            style: 'normal',
            letterSpacing: 0.3,
          },
          hierarchy: {
            producerEmphasis: 'balanced',
            vintageProminence: 'featured',
            regionDisplay: 'integrated',
          },
        },
        assets: [],
        elements: [
          {
            id: 'producer',
            type: 'text',
            bounds: { x: 0.1, y: 0.1, w: 0.8, h: 0.1 },
            z: 10,
            text: 'Mock Winery',
            font: 'primary',
            color: 'primary',
            align: 'center',
            fontSize: 36,
            lineHeight: 1.2,
            maxLines: 1,
            textTransform: 'uppercase',
          },
        ],
      });
    }

    // Default mock response
    return JSON.stringify({
      message: 'Mock LLM response',
      timestamp: new Date().toISOString(),
    });
  }

  // Required LangChain methods (minimal implementation)
  async _generate(messages: Array<{ text?: string; content?: string }>): Promise<{
    generations: Array<{
      text: string;
      message: { content: string };
    }>;
  }> {
    const input = messages.map((m) => m.text || m.content || '').join(' ');
    const response = await this.invoke(input);
    return {
      generations: [
        {
          text: response,
          message: { content: response },
        },
      ],
    };
  }
}

// ============================================================================
// Mock Adapters for Testing
// ============================================================================

export class MockImageAdapter implements ImageModelAdapter {
  async generate(prompt: ImageGenerateInput): Promise<ImageGenerateOutput> {
    logger.info('MockImageAdapter: Generating image', { promptId: prompt.id });

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      id: `asset-${prompt.id}`,
      url: `https://example.com/generated/${prompt.id}.png`,
      width: 800,
      height: 600,
    };
  }
}

export class MockVisionRefiner implements VisionRefinerAdapter {
  // input parameter required by VisionRefinerAdapter interface but unused in mock implementation
  async proposeEdits(input: RefineInput): Promise<RefineOutput> {
    logger.info('MockVisionRefiner: Analyzing preview for refinement', {
      submissionId: input.submission.producerName,
    });

    // Simulate analysis time
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      operations: [],
      reasoning: 'Label appears well-balanced and follows design principles',
      confidence: 0.85,
    };
  }
}

// ============================================================================
// LangChain Error Classification
// ============================================================================

/**
 * Classifies LangChain-specific errors for proper retry behavior
 * Integrates with existing error handling system
 */
export function classifyLangChainError(error: unknown): ImageGenerationError {
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  // Rate limit errors are retryable
  if (lowerMessage.includes('rate limit') || lowerMessage.includes('429') || lowerMessage.includes('quota')) {
    return new ImageGenerationError(`LangChain rate limit: ${message}`, 'network', true, {
      originalError: message,
      provider: 'langchain',
    });
  }

  // Timeout errors are retryable
  if (lowerMessage.includes('timeout') || lowerMessage.includes('etimedout') || lowerMessage.includes('connection')) {
    return new ImageGenerationError(`LangChain timeout: ${message}`, 'network', true, {
      originalError: message,
      provider: 'langchain',
    });
  }

  // Authentication/API key errors are not retryable
  if (
    lowerMessage.includes('auth') ||
    lowerMessage.includes('api key') ||
    lowerMessage.includes('401') ||
    lowerMessage.includes('403')
  ) {
    return new ImageGenerationError(`LangChain authentication: ${message}`, 'validation', false, {
      originalError: message,
      provider: 'langchain',
    });
  }

  // JSON parsing/validation errors are not retryable (indicates prompt/schema issues)
  if (lowerMessage.includes('json') || lowerMessage.includes('parse') || lowerMessage.includes('validation')) {
    return new ImageGenerationError(`LangChain validation: ${message}`, 'validation', false, {
      originalError: message,
      provider: 'langchain',
    });
  }

  // Model errors (overloaded, etc.) are retryable
  if (
    lowerMessage.includes('model') &&
    (lowerMessage.includes('overloaded') || lowerMessage.includes('busy') || lowerMessage.includes('503'))
  ) {
    return new ImageGenerationError(`LangChain model overloaded: ${message}`, 'processing', true, {
      originalError: message,
      provider: 'langchain',
    });
  }

  // Default to non-retryable processing error for unknown issues
  return new ImageGenerationError(`LangChain processing: ${message}`, 'processing', false, {
    originalError: message,
    provider: 'langchain',
  });
}

// ============================================================================
// LLM Factory
// ============================================================================

export function createLLM(config: ModelConfig): BaseLanguageModel | MockChatModel {
  if (config.provider === 'mock') {
    // Return a mock LLM for testing that generates valid JSON responses
    return new MockChatModel();
  }

  const commonConfig = {
    temperature: config.temperature ?? 0.3,
    maxTokens: config.maxTokens ?? 4000,
    timeout: config.timeout ?? 30000,
  };

  switch (config.provider) {
    case 'anthropic':
      return new ChatAnthropic({
        modelName: config.model ?? 'claude-3-5-haiku-20241022',
        ...commonConfig,
      });
    case 'openai':
      return new ChatOpenAI({
        modelName: config.model ?? 'gpt-5-nano-2025-08-07',
        ...commonConfig,
      });
    default:
      throw new Error(`Unsupported model provider: ${config.provider}`);
  }
}

// ============================================================================
// Retry configuration for LLM operations
// ============================================================================

const LANGCHAIN_RETRY_CONFIG: Partial<RetryConfig> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  exponentialBase: 2,
  jitter: true,
};

// ============================================================================
// Validation and Self-Repair
// ============================================================================

export async function validateAndRepair<TInput, TOutput>(
  input: TInput,
  output: unknown,
  inputSchema: z.ZodSchema<TInput>,
  outputSchema: z.ZodSchema<TOutput>,
  repairFunction: (input: TInput, validationError: string) => Promise<TOutput>,
): Promise<TOutput> {
  // Validate input
  const inputResult = inputSchema.safeParse(input);
  if (!inputResult.success) {
    throw new Error(`Invalid input: ${inputResult.error.message}`);
  }

  // Validate output
  const outputResult = outputSchema.safeParse(output);
  if (outputResult.success) {
    return outputResult.data;
  }

  // Attempt self-repair
  logger.warn('Output validation failed, attempting self-repair', {
    validationError: outputResult.error.message,
  });

  try {
    const repairedOutput = await repairFunction(inputResult.data, outputResult.error.message);

    // Validate repaired output
    const repairedResult = outputSchema.safeParse(repairedOutput);
    if (!repairedResult.success) {
      throw new Error(`Self-repair failed: ${repairedResult.error.message}`);
    }

    logger.info('Self-repair successful');
    return repairedResult.data;
  } catch (repairError) {
    throw new Error(
      `Validation failed and self-repair unsuccessful: ${outputResult.error.message}. ` +
        `Repair error: ${repairError instanceof Error ? repairError.message : String(repairError)}`,
    );
  }
}

// ============================================================================
// Base Chain Builder (Simplified)
// ============================================================================

export async function invokeStructuredLLM<TInput extends Record<string, unknown>, TOutput>(
  step: PipelineStep,
  promptTemplate: string,
  promptInput: Record<string, unknown>,
  outputSchema: z.ZodSchema<TOutput>,
  inputSchema: z.ZodSchema<TInput>,
  originalInput: TInput,
  customConfig?: ModelConfig,
): Promise<TOutput> {
  const config = customConfig ?? DEFAULT_MODEL_CONFIGS[step];

  if (config.provider === 'mock') {
    throw new Error(`Step ${step} requires a real LLM, not mock provider`);
  }

  const llm = createLLM(config);

  const formatInstructions = `
You must respond with VALID JSON ONLY. Critical requirements:
1. NO explanations, NO markdown, NO code blocks (no \`\`\`json blocks)
2. NO comments in the JSON (// comments will break parsing)
3. Use ONLY the exact field names and types specified in the example
4. All color values must be hex strings like "#FF0000", NOT objects
5. All enum values must match exactly (case-sensitive)
6. Your entire response must be parseable as JSON - nothing before or after the JSON object
Return only the JSON object that matches the required schema.`;

  const prompt = PromptTemplate.fromTemplate(`${promptTemplate}\n\n${formatInstructions}`);

  return withRetry(
    async () => {
      const formattedPrompt = await prompt.format(promptInput);

      const response = await llm.invoke(formattedPrompt);
      const rawOutput =
        typeof response === 'string' ? response : ((response as { content?: string }).content ?? String(response));

      // Parse JSON from the raw output using robust extraction
      let parsedOutput: unknown;
      try {
        parsedOutput = extractJSON(rawOutput);
      } catch (parseError) {
        // Classify and throw appropriate error
        throw classifyLangChainError(parseError);
      }

      const result = await validateAndRepair(
        originalInput,
        parsedOutput,
        inputSchema,
        outputSchema,
        async (validInput, errorMessage) => {
          // Self-repair attempt with error feedback - validInput is validated for structure
          logger.debug('Self-repair attempt', { hasValidInput: !!validInput, errorMessage });

          const repairPromptText =
            promptTemplate +
            '\n\nPREVIOUS OUTPUT HAD VALIDATION ERRORS: ' +
            errorMessage +
            '\nPlease correct these issues and provide valid JSON only:\n' +
            formatInstructions;

          const repairPrompt = PromptTemplate.fromTemplate(repairPromptText);
          const repairFormattedPrompt = await repairPrompt.format(promptInput);

          const repairResponse = await llm.invoke(repairFormattedPrompt);
          const repairRawOutput =
            typeof repairResponse === 'string'
              ? repairResponse
              : ((repairResponse as { content?: string }).content ?? String(repairResponse));

          // Use robust JSON parsing for self-repair output
          try {
            return extractJSON(repairRawOutput);
          } catch (repairParseError) {
            // Classify and throw appropriate error for self-repair failures
            throw classifyLangChainError(repairParseError);
          }
        },
      );
      return result as TOutput;
    },
    LANGCHAIN_RETRY_CONFIG,
    { step, operation: 'structured_llm' },
  );
}

// ============================================================================
// Export Configuration
// ============================================================================

export const pipelineConfig = {
  models: DEFAULT_MODEL_CONFIGS,
  retry: LANGCHAIN_RETRY_CONFIG,
  adapters: {
    image: new MockImageAdapter(),
    vision: new MockVisionRefiner(),
  },
};

// Environment-based configuration
export function configurePipeline(options: {
  mockLLM?: boolean;
  imageAdapter?: ImageModelAdapter;
  visionAdapter?: VisionRefinerAdapter;
  modelConfigs?: Partial<Record<PipelineStep, ModelConfig>>;
  retryConfig?: Partial<RetryConfig>;
}) {
  // Configure mock LLM for all LLM-based steps when mockLLM is enabled
  if (options.mockLLM) {
    logger.info('Configuring mock LLM for all language model steps');
    (Object.keys(DEFAULT_MODEL_CONFIGS) as PipelineStep[]).forEach((step) => {
      if (step !== 'image-generate' && step !== 'render') {
        pipelineConfig.models[step] = { provider: 'mock' };
      }
    });
  }

  if (options.imageAdapter) {
    pipelineConfig.adapters.image = options.imageAdapter;
  }

  if (options.visionAdapter) {
    pipelineConfig.adapters.vision = options.visionAdapter;
  }

  if (options.modelConfigs) {
    Object.assign(pipelineConfig.models, options.modelConfigs);
  }

  if (options.retryConfig) {
    Object.assign(pipelineConfig.retry, options.retryConfig);
  }
}
