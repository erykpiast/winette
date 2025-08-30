import { FUZZY_MATCHING_PATTERNS, SEMANTIC_ELEMENT_MAPPINGS } from '#backend/config/semantic-element-mappings.js';
import { hexToClosestPaletteRole } from '#backend/lib/color-utils.js';
import { logger } from '#backend/lib/logger.js';
import { parseFontSize } from '#backend/lib/typography-utils.js';
import type { EditOperation } from '#backend/schema/langchain-pipeline-schemas.js';
import type { Element, LabelDSL } from '#backend/types/label-generation.js';
import type { Edit } from '#backend/types/multimodal-refinement.js';
import { clampBounds, validateAndClampEdits } from './edit-validation-service.js';

/**
 * Maps semantic element IDs (used by LLM) to actual DSL element IDs
 */
function mapSemanticToActualElementId(semanticId: string, currentDSL: LabelDSL): string | null {
  // First try direct match
  if (currentDSL.elements.find((el) => el.id === semanticId)) {
    return semanticId;
  }

  // Try semantic mapping using external configuration
  const possibleIds = SEMANTIC_ELEMENT_MAPPINGS[semanticId] || [];
  for (const possibleId of possibleIds) {
    if (currentDSL.elements.find((el) => el.id === possibleId)) {
      return possibleId;
    }
  }

  // Try fuzzy matching on text content for text elements
  const textElements = currentDSL.elements.filter((el) => el.type === 'text') as Array<
    Extract<Element, { type: 'text' }>
  >;

  // Enhanced fuzzy matching using patterns from config
  for (const [concept, pattern] of Object.entries(FUZZY_MATCHING_PATTERNS)) {
    // Check if semantic ID matches the concept by name OR by content pattern
    const matchesByConcept =
      semanticId.toLowerCase().includes(concept) ||
      semanticId.toLowerCase().includes(concept.replace('vintage', 'year'));
    const matchesByPattern = pattern.regex.test(semanticId);

    if (matchesByConcept || matchesByPattern) {
      // For vintage, match by text pattern or element ID pattern
      if (concept === 'vintage') {
        // First try to find element with vintage-like text content
        const vintageElement = textElements.find((el) => pattern.regex.test(el.text.trim()));
        if (vintageElement) {
          logger.debug('Fuzzy matched vintage element by text pattern', {
            semanticId,
            actualId: vintageElement.id,
            pattern: pattern.description,
            text: vintageElement.text,
          });
          return vintageElement.id;
        }

        // Then try to find element with vintage-related ID
        const vintageByIdElement = textElements.find((el) => el.id.includes('vintage') || el.id.includes('year'));
        if (vintageByIdElement) {
          logger.debug('Fuzzy matched vintage element by ID pattern', {
            semanticId,
            actualId: vintageByIdElement.id,
            concept,
          });
          return vintageByIdElement.id;
        }
      }

      // For region, be more flexible with appellation/location patterns
      if (concept === 'region') {
        // First try ID-based matching for region elements
        const regionByIdElement = textElements.find(
          (el) =>
            el.id.includes('region') ||
            el.id.includes('appellation') ||
            el.id.includes('location') ||
            el.id.includes('ava'),
        );
        if (regionByIdElement) {
          logger.debug('Fuzzy matched region element by ID pattern', {
            semanticId,
            actualId: regionByIdElement.id,
            concept,
          });
          return regionByIdElement.id;
        }

        // Then try text content matching
        const regionByTextElement = textElements.find((el) => pattern.regex.test(el.text));
        if (regionByTextElement) {
          logger.debug('Fuzzy matched region element by text content', {
            semanticId,
            actualId: regionByTextElement.id,
            pattern: pattern.description,
            text: regionByTextElement.text,
          });
          return regionByTextElement.id;
        }
      }

      // For other concepts, match by ID pattern first, then text content
      const elementByIdPattern = textElements.find(
        (el) =>
          el.id.includes(concept) ||
          (concept === 'producer' && (el.id.includes('producer') || el.id.includes('winery'))),
      );
      if (elementByIdPattern) {
        logger.debug('Fuzzy matched element by ID pattern', {
          semanticId,
          actualId: elementByIdPattern.id,
          concept,
        });
        return elementByIdPattern.id;
      }

      // For producer/variety, also try text content matching
      if (['producer', 'variety'].includes(concept)) {
        const elementByTextPattern = textElements.find((el) => pattern.regex.test(el.text));
        if (elementByTextPattern) {
          logger.debug('Fuzzy matched element by text content', {
            semanticId,
            actualId: elementByTextPattern.id,
            pattern: pattern.description,
            text: elementByTextPattern.text,
          });
          return elementByTextPattern.id;
        }
      }
    }
  }

  return null;
}

/**
 * Conversion function from LangChain EditOperations to DSL Edit format
 * Handles the translation between LangChain's refinement operations and the internal DSL editing system
 */
export function convertToEdits(operations: EditOperation[], currentDSL: LabelDSL): Edit[] {
  const edits: Edit[] = [];

  logger.info('Converting EditOperations to DSL Edits', {
    inputOperations: JSON.stringify(operations, null, 2),
  });

  for (const op of operations) {
    try {
      switch (op.type) {
        case 'update_element': {
          // Map semantic ID to actual ID
          const actualElementId = mapSemanticToActualElementId(op.elementId, currentDSL);
          if (!actualElementId) {
            logger.warn('Element not found for update_element operation', {
              semanticElementId: op.elementId,
              availableElementIds: currentDSL.elements.map((el) => el.id).join(', '),
            });
            continue;
          }

          const currentElement = currentDSL.elements.find((el) => el.id === actualElementId);
          if (!currentElement) {
            logger.warn('Element not found after ID mapping', {
              semanticElementId: op.elementId,
              actualElementId,
              availableElementIds: currentDSL.elements.map((el) => el.id).join(', '),
            });
            continue;
          }

          if (op.property === 'bounds' && typeof op.value === 'object' && op.value !== null) {
            const bounds = op.value as { x?: number; y?: number; w?: number; h?: number };

            // For bounds updates, convert to move/resize operations
            if ('x' in bounds || 'y' in bounds) {
              const dx = (bounds.x ?? currentElement.bounds.x) - currentElement.bounds.x;
              const dy = (bounds.y ?? currentElement.bounds.y) - currentElement.bounds.y;

              // Only add move operation if there's actual movement
              if (dx !== 0 || dy !== 0) {
                edits.push({
                  op: 'move',
                  id: actualElementId,
                  dx,
                  dy,
                });
              }
            }

            if ('w' in bounds || 'h' in bounds) {
              const dw = (bounds.w ?? currentElement.bounds.w) - currentElement.bounds.w;
              const dh = (bounds.h ?? currentElement.bounds.h) - currentElement.bounds.h;

              // Only add resize operation if there's actual size change
              if (dw !== 0 || dh !== 0) {
                edits.push({
                  op: 'resize',
                  id: actualElementId,
                  dw,
                  dh,
                });
              }
            }
          } else if (op.property === 'color' && typeof op.value === 'string') {
            // Convert hex color to closest palette role
            const closestRole = hexToClosestPaletteRole(op.value, currentDSL.palette);
            edits.push({
              op: 'recolor',
              id: actualElementId,
              color: closestRole,
            });
          } else if (op.property === 'fontSize') {
            // Handle fontSize updates for text elements
            if (currentElement.type === 'text') {
              const fontSize =
                typeof op.value === 'string' ? parseFontSize(op.value, currentElement.fontSize) : Number(op.value);

              if (fontSize > 0 && fontSize !== currentElement.fontSize) {
                edits.push({
                  op: 'update_font_size',
                  id: actualElementId,
                  fontSize,
                });
              }
            } else {
              logger.warn('Cannot update fontSize on non-text element', {
                semanticElementId: op.elementId,
                actualElementId,
                elementType: currentElement.type,
              });
            }
          } else {
            logger.info('Unsupported property in update_element operation', {
              property: op.property,
              semanticElementId: op.elementId,
              actualElementId,
            });
          }
          break;
        }

        case 'update_palette': {
          // Convert palette updates to recolor operations on all text elements
          // This is a simplified approach - in practice, you might want more sophisticated logic
          const colorMapping = {
            primary: 'primary' as const,
            secondary: 'secondary' as const,
            accent: 'accent' as const,
            background: 'background' as const,
          };

          const targetColor = colorMapping[op.target];
          if (targetColor) {
            // Apply recolor to all text elements that use this color
            for (const element of currentDSL.elements) {
              if ((element.type === 'text' || element.type === 'shape') && element.color === targetColor) {
                edits.push({
                  op: 'recolor',
                  id: element.id,
                  color: targetColor,
                });
              }
            }
          }
          break;
        }

        default: {
          logger.info('EditOperation type not directly convertible to DSL Edit', {
            type: op.type,
            operationType: op.type,
          });
          break;
        }
      }
    } catch (error) {
      logger.warn('Failed to convert operation to edit', {
        operationType: op.type,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info('Converted EditOperations to DSL Edits', {
    inputOperations: operations.length,
    outputEdits: edits.length,
  });

  return edits;
}

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

    case 'update_font_size': {
      if (element.type === 'text') {
        return {
          ...element,
          fontSize: edit.fontSize,
        } as Element;
      } else {
        throw new Error(`Cannot update font size on element of type '${element.type}'`);
      }
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
