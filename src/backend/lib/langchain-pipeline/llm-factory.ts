import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import type { PipelineStep } from '../../schema/langchain-pipeline-schemas.js';
import { ImageGenerationError } from '../error-handling.js';
import { MockChatModelImpl } from './mock-adapters.js';
import type { LLMType, ModelConfig } from './types.js';

// ============================================================================
// Default Model Configurations
// ============================================================================

// Note: 'image-generate' and 'render' steps use dedicated adapters, not LLMs
export const DEFAULT_MODEL_CONFIGS: Record<PipelineStep, ModelConfig> = {
  'design-scheme': { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', temperature: 0.3 },
  'image-prompts': { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', temperature: 0.7 },
  'image-generate': { provider: 'anthropic' }, // Not used - step uses ImageModelAdapter
  'detailed-layout': { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', temperature: 0.2 },
  render: { provider: 'anthropic' }, // Not used - step uses renderer service directly
  refine: { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', temperature: 0.1 },
};

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

export function createLLM(config: ModelConfig): LLMType {
  if (config.provider === 'mock') {
    // Return a mock LLM for testing that generates valid JSON responses
    return new MockChatModelImpl();
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
