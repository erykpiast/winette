import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import type { DetailedLayoutOutput, RenderOutput } from '../../schema/langchain-pipeline-schemas.js';
import type { LabelStorageService } from '../../services/label-storage-service.js';
import { uploadRenderedLabel } from '../image-storage.js';
import { createVisionOptimizedInput } from '../image-utils.js';
import { logger } from '../logger.js';
import { renderToPng } from '../renderer.js';
import type { RendererAdapter } from './types.js';

export class ProductionRendererAdapter implements RendererAdapter {
  constructor(private storageService?: LabelStorageService) {}

  async render(
    input: DetailedLayoutOutput,
    options?: { debug?: boolean; saveToFile?: boolean },
  ): Promise<RenderOutput> {
    logger.info('ProductionRendererAdapter: Rendering preview (real browser)', {
      elementCount: input.elements?.length ?? 0,
      canvasSize: `${input.canvas.width}x${input.canvas.height}`,
    });

    try {
      // Use real browser rendering

      // For vision analysis, generate a smaller image by reducing DPI
      const visionInput = createVisionOptimizedInput(input);

      const pngBuffer = await renderToPng(visionInput, { debug: options?.debug ?? false });

      // Save the rendered image for debugging if requested
      if (options?.saveToFile) {
        try {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `label-render-${timestamp}.png`;
          const tempDir = join(process.cwd(), 'temp');
          const filepath = join(tempDir, filename);

          // Ensure temp directory exists
          await mkdir(tempDir, { recursive: true });
          await writeFile(filepath, pngBuffer);
          logger.info('Saved rendered image', { filepath, size: pngBuffer.length });
        } catch (writeError) {
          logger.warn('Could not save rendered image', {
            error: writeError instanceof Error ? writeError.message : String(writeError),
          });
        }
      }

      // Use storage service for clean separation of concerns
      let previewUrl: string;
      if (this.storageService) {
        const generationId = `render-${Date.now()}`;
        previewUrl = await this.storageService.storeRenderedLabel(pngBuffer, generationId);
      } else {
        // Fallback to uploading directly (for backward compatibility)
        const generationId = `render-${Date.now()}`;
        const { publicUrl } = await uploadRenderedLabel(pngBuffer, generationId);
        previewUrl = publicUrl;
      }

      const renderResult = {
        previewUrl,
        width: input.canvas.width,
        height: input.canvas.height,
        format: 'PNG' as const,
      };

      logger.info('Real browser render completed successfully', {
        size: pngBuffer.length,
        originalDpi: input.canvas.dpi,
        visionDpi: visionInput.canvas.dpi,
      });
      return renderResult;
    } catch (error) {
      logger.error('Production render failed', { error });
      throw error;
    }
  }
}
