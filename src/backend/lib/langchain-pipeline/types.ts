import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import type {
  DetailedLayoutOutput,
  ImageGenerateInput,
  ImageGenerateOutput,
  PipelineStep,
  RefineInput,
  RefineOutput,
  RenderOutput,
} from '../../schema/langchain-pipeline-schemas.js';
import type { RetryConfig } from '../error-handling.js';

// ============================================================================
// Model Configuration
// ============================================================================

export interface ModelConfig {
  provider: 'anthropic' | 'openai' | 'mock';
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

// ============================================================================
// Adapter Interfaces
// ============================================================================

export interface ImageModelAdapter {
  generate(prompt: ImageGenerateInput): Promise<ImageGenerateOutput>;
}

export interface VisionRefinerAdapter {
  proposeEdits(input: RefineInput): Promise<RefineOutput>;
}

export interface RendererAdapter {
  render(input: DetailedLayoutOutput, options?: { debug?: boolean; saveToFile?: boolean }): Promise<RenderOutput>;
}

// ============================================================================
// Pipeline Configuration
// ============================================================================

export interface PipelineAdapters {
  image: ImageModelAdapter;
  vision: VisionRefinerAdapter;
  renderer: RendererAdapter;
}

export interface PipelineConfigOptions {
  mockLLM?: boolean;
  imageAdapter?: ImageModelAdapter;
  visionAdapter?: VisionRefinerAdapter;
  rendererAdapter?: RendererAdapter;
  modelConfigs?: Partial<Record<PipelineStep, ModelConfig>>;
  retryConfig?: Partial<RetryConfig>;
}

// ============================================================================
// LLM Types
// ============================================================================

export type LLMType = BaseLanguageModel | MockChatModel;

export interface MockChatModel {
  _llmType(): string;
  invoke(input: string): Promise<string>;
  _generate(messages: Array<{ text?: string; content?: string }>): Promise<{
    generations: Array<{
      text: string;
      message: { content: string };
    }>;
  }>;
}
