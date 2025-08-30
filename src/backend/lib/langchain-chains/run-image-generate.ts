import type { ImageGenerateInput, ImageGenerateOutput } from '#backend/schema/langchain-pipeline-schemas.js';
import { type ImageModelAdapter, pipelineConfig } from '../langchain-pipeline/index.js';
import { logger } from '../logger.js';

export async function runImageGenerate(
  input: ImageGenerateInput,
  adapter: ImageModelAdapter = pipelineConfig.adapters.image,
): Promise<ImageGenerateOutput> {
  logger.info('Running image-generate step', {
    promptId: input.id,
    purpose: input.purpose,
  });

  return await adapter.generate(input);
}
