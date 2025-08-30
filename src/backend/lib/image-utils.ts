// Image utility functions for processing and optimization

import type { DetailedLayoutOutput } from '../schema/langchain-pipeline-schemas.js';

/**
 * Creates a version of the DetailedLayoutOutput optimized for vision analysis
 * by reducing DPI to minimize image size for API calls
 */
export function createVisionOptimizedInput(input: DetailedLayoutOutput, targetDpi: number = 96): DetailedLayoutOutput {
  return {
    ...input,
    canvas: {
      ...input.canvas,
      dpi: targetDpi, // Use screen DPI instead of print DPI for smaller images
    },
  };
}
