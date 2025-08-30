import { PromptTemplate } from '@langchain/core/prompts';
import type { z } from 'zod';
import type { PipelineStep } from '../../schema/langchain-pipeline-schemas.js';
import type { RetryConfig } from '../error-handling.js';
import { withRetry } from '../error-handling.js';
import { extractJSON } from '../json-utils.js';
import { initializeLangSmithTracing } from '../langsmith-tracing.js';
import { logger } from '../logger.js';
import { classifyLangChainError, createLLM, DEFAULT_MODEL_CONFIGS } from './llm-factory.js';
import { MockImageAdapter, MockRendererAdapter, MockVisionRefiner } from './mock-adapters.js';
import type { ModelConfig, PipelineAdapters, PipelineConfigOptions } from './types.js';
import { validateAndRepair } from './validation.js';

// Initialize LangSmith tracing if configured
initializeLangSmithTracing();

// Re-export for testing
export { withRetry };

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
// Pipeline Configuration
// ============================================================================

export const pipelineConfig = {
  models: DEFAULT_MODEL_CONFIGS,
  retry: LANGCHAIN_RETRY_CONFIG,
  adapters: {
    image: new MockImageAdapter(),
    vision: new MockVisionRefiner(),
    renderer: new MockRendererAdapter(),
  } as PipelineAdapters,
};

// Environment-based configuration
export function configurePipeline(options: PipelineConfigOptions) {
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

  if (options.rendererAdapter) {
    pipelineConfig.adapters.renderer = options.rendererAdapter;
  }

  if (options.modelConfigs) {
    Object.assign(pipelineConfig.models, options.modelConfigs);
  }

  if (options.retryConfig) {
    Object.assign(pipelineConfig.retry, options.retryConfig);
  }
}
