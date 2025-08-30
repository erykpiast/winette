import type { DetailedLayoutOutput, RenderOutput } from '#backend/schema/langchain-pipeline-schemas.js';
import { pipelineConfig } from '../langchain-pipeline/index.js';
import { logger } from '../logger.js';

export async function runRender(
  input: DetailedLayoutOutput,
  options?: { debug?: boolean; saveToFile?: boolean },
): Promise<RenderOutput> {
  logger.info('Running render step', {
    elementCount: input.elements?.length ?? 0,
    canvasSize: `${input.canvas.width}x${input.canvas.height}`,
  });

  // Use configured renderer adapter (mock for tests, real for production)
  return await pipelineConfig.adapters.renderer.render(input, options);
}
