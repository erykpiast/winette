import { z } from 'zod';
import { logger } from '#backend/lib/logger.js';
import type { Edit, EditValidationOptions, EditValidationResult } from '#backend/types/multimodal-refinement.js';
import { EditSchema } from '#backend/types/multimodal-refinement.js';

const DEFAULT_OPTIONS: EditValidationOptions = {
  maxEdits: 10,
  maxDelta: 0.2,
  existingElementIds: [],
};

/**
 * Validates and clamps edits according to the rules:
 * - Max 10 edits
 * - Max absolute delta per op = 0.2
 * - Only existing ids may be edited
 * - Bounds remain within [0,1]
 */
export function validateAndClampEdits(
  rawEdits: unknown[],
  options: Partial<EditValidationOptions> = {},
): EditValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const result: EditValidationResult = {
    validEdits: [],
    rejectedEdits: [],
    clampedEdits: [],
  };

  // Reject if too many edits
  if (rawEdits.length > opts.maxEdits) {
    logger.warn('Edit validation: too many edits provided', {
      provided: rawEdits.length,
      max: opts.maxEdits,
    });
    rawEdits.slice(opts.maxEdits).forEach((edit) => {
      result.rejectedEdits.push({
        edit,
        reason: `Exceeded maximum edits limit of ${opts.maxEdits}`,
      });
    });
    rawEdits = rawEdits.slice(0, opts.maxEdits);
  }

  // Validate and process each edit
  for (const rawEdit of rawEdits) {
    try {
      // Validate basic schema first
      const validatedEdit = EditSchema.parse(rawEdit);

      // Check if element ID exists
      if (!opts.existingElementIds.includes(validatedEdit.id)) {
        result.rejectedEdits.push({
          edit: rawEdit,
          reason: `Element ID '${validatedEdit.id}' does not exist`,
        });
        continue;
      }

      // Apply clamping based on operation type
      const clampResult = clampEdit(validatedEdit, opts);
      if (clampResult.clamped) {
        result.clampedEdits.push({
          original: validatedEdit,
          clamped: clampResult.edit,
          reason: clampResult.reason,
        });
      }

      result.validEdits.push(clampResult.edit);
    } catch (error) {
      const errorMessage =
        error instanceof z.ZodError
          ? `Schema validation failed: ${error.message}`
          : error instanceof Error
            ? error.message
            : 'Unknown validation error';

      result.rejectedEdits.push({
        edit: rawEdit,
        reason: errorMessage,
      });

      logger.warn('Edit validation failed', {
        editType: typeof rawEdit,
        error: errorMessage,
      });
    }
  }

  logger.info('Edit validation completed', {
    inputCount: rawEdits.length,
    validCount: result.validEdits.length,
    rejectedCount: result.rejectedEdits.length,
    clampedCount: result.clampedEdits.length,
  });

  return result;
}

function clampEdit(edit: Edit, options: EditValidationOptions): { edit: Edit; clamped: boolean; reason: string } {
  switch (edit.op) {
    case 'move': {
      const originalDx = edit.dx;
      const originalDy = edit.dy;
      const clampedDx = Math.max(-options.maxDelta, Math.min(options.maxDelta, edit.dx));
      const clampedDy = Math.max(-options.maxDelta, Math.min(options.maxDelta, edit.dy));

      if (originalDx !== clampedDx || originalDy !== clampedDy) {
        return {
          edit: { ...edit, dx: clampedDx, dy: clampedDy },
          clamped: true,
          reason: `Move deltas clamped from (${originalDx}, ${originalDy}) to (${clampedDx}, ${clampedDy})`,
        };
      }
      break;
    }

    case 'resize': {
      const originalDw = edit.dw;
      const originalDh = edit.dh;
      const clampedDw = Math.max(-options.maxDelta, Math.min(options.maxDelta, edit.dw));
      const clampedDh = Math.max(-options.maxDelta, Math.min(options.maxDelta, edit.dh));

      if (originalDw !== clampedDw || originalDh !== clampedDh) {
        return {
          edit: { ...edit, dw: clampedDw, dh: clampedDh },
          clamped: true,
          reason: `Resize deltas clamped from (${originalDw}, ${originalDh}) to (${clampedDw}, ${clampedDh})`,
        };
      }
      break;
    }

    case 'reorder': {
      const originalZ = edit.z;
      const clampedZ = Math.max(0, Math.min(1000, edit.z));

      if (originalZ !== clampedZ) {
        return {
          edit: { ...edit, z: clampedZ },
          clamped: true,
          reason: `Z-index clamped from ${originalZ} to ${clampedZ}`,
        };
      }
      break;
    }

    case 'recolor':
      // No clamping needed for recolor operations
      break;

    case 'update_font_size':
      // No clamping needed for update_font_size operations
      break;

    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = edit;
      throw new Error(`Unknown edit operation: ${JSON.stringify(_exhaustive)}`);
    }
  }

  return { edit, clamped: false, reason: '' };
}

/**
 * Clamps bounds to ensure they remain within [0,1] after applying edit
 */
export function clampBounds(
  bounds: { x: number; y: number; w: number; h: number },
  edit: Edit,
): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  let { x, y, w, h } = bounds;

  if (edit.op === 'move') {
    x = Math.max(0, Math.min(1 - w, x + edit.dx));
    y = Math.max(0, Math.min(1 - h, y + edit.dy));
  } else if (edit.op === 'resize') {
    w = Math.max(0, Math.min(1 - x, w + edit.dw));
    h = Math.max(0, Math.min(1 - y, h + edit.dh));
  }

  return { x, y, w, h };
}
