import { logger } from '#backend/lib/logger.js';
import type { Element, LabelDSL } from '#backend/types/label-generation.js';
import type { Edit } from '#backend/types/multimodal-refinement.js';
import { clampBounds, validateAndClampEdits } from './edit-validation-service.js';

export interface ApplyEditsResult {
  updatedDSL: LabelDSL;
  appliedEdits: Edit[];
  failedEdits: Array<{
    edit: Edit;
    reason: string;
  }>;
}

/**
 * Applies validated edits to a DSL, ensuring bounds remain within [0,1]
 */
export function applyEdits(dsl: LabelDSL, edits: Edit[]): ApplyEditsResult {
  const result: ApplyEditsResult = {
    updatedDSL: structuredClone(dsl),
    appliedEdits: [],
    failedEdits: [],
  };

  // Create a map of element IDs to indices for efficient lookup
  const elementMap = new Map<string, number>();
  result.updatedDSL.elements.forEach((element, index) => {
    elementMap.set(element.id, index);
  });

  // Apply each edit
  for (const edit of edits) {
    try {
      const elementIndex = elementMap.get(edit.id);
      if (elementIndex === undefined) {
        result.failedEdits.push({
          edit,
          reason: `Element with ID '${edit.id}' not found`,
        });
        continue;
      }

      const element = result.updatedDSL.elements[elementIndex];
      if (!element) {
        result.failedEdits.push({
          edit,
          reason: `Element at index ${elementIndex} not found`,
        });
        continue;
      }
      const updatedElement = applyEditToElement(element, edit);
      result.updatedDSL.elements[elementIndex] = updatedElement;
      result.appliedEdits.push(edit);

      logger.debug('Applied edit to element', {
        editOp: edit.op,
        elementId: edit.id,
        elementType: element.type,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.failedEdits.push({
        edit,
        reason: errorMessage,
      });
      logger.warn('Failed to apply edit', {
        editOp: edit.op,
        editId: edit.id,
        error: errorMessage,
      });
    }
  }

  logger.info('Finished applying edits to DSL', {
    totalEdits: edits.length,
    appliedCount: result.appliedEdits.length,
    failedCount: result.failedEdits.length,
  });

  return result;
}

function applyEditToElement(element: Element, edit: Edit): Element {
  switch (edit.op) {
    case 'move': {
      const newBounds = clampBounds(element.bounds, edit);
      return {
        ...element,
        bounds: newBounds,
      };
    }

    case 'resize': {
      const newBounds = clampBounds(element.bounds, edit);
      return {
        ...element,
        bounds: newBounds,
      };
    }

    case 'recolor': {
      if (element.type === 'text' || element.type === 'shape') {
        return {
          ...element,
          color: edit.color,
        } as Element;
      } else {
        throw new Error(`Cannot recolor element of type '${element.type}'`);
      }
    }

    case 'reorder': {
      // Clamp z-index to valid range
      const clampedZ = Math.max(0, Math.min(1000, edit.z));
      return {
        ...element,
        z: clampedZ,
      };
    }

    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = edit;
      throw new Error(`Unknown edit operation: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

/**
 * Extracts all element IDs from a DSL for validation purposes
 */
export function extractElementIds(dsl: LabelDSL): string[] {
  return dsl.elements.map((element) => element.id);
}

/**
 * Creates a complete refinement operation that validates and applies edits
 */
export function refineLabel(
  dsl: LabelDSL,
  rawEdits: unknown[],
  maxEdits: number = 10,
  maxDelta: number = 0.2,
): {
  updatedDSL: LabelDSL;
  validationResult: ReturnType<typeof validateAndClampEdits>;
  applyResult: ApplyEditsResult;
} {
  // Validate and clamp edits
  const existingElementIds = extractElementIds(dsl);
  const validationResult = validateAndClampEdits(rawEdits, {
    maxEdits,
    maxDelta,
    existingElementIds,
  });

  // Apply valid edits to DSL
  const applyResult = applyEdits(dsl, validationResult.validEdits);

  logger.info('Label refinement completed', {
    inputEdits: rawEdits.length,
    validEdits: validationResult.validEdits.length,
    appliedEdits: applyResult.appliedEdits.length,
    rejectedEdits: validationResult.rejectedEdits.length,
    clampedEdits: validationResult.clampedEdits.length,
    failedApplications: applyResult.failedEdits.length,
  });

  return {
    updatedDSL: applyResult.updatedDSL,
    validationResult,
    applyResult,
  };
}
