import { formatElementIdsNumbered } from '#backend/lib/prompt-utils.js';
import {
  type DetailedLayoutOutput,
  type RefineInput,
  RefineInputSchema,
  type RefineOutput,
  RefineOutputSchema,
} from '#backend/schema/langchain-pipeline-schemas.js';
import { applyEdits, convertToEdits } from '#backend/services/dsl-edit-service.js';
import { invokeStructuredLLM, pipelineConfig, type VisionRefinerAdapter } from '../langchain-pipeline/index.js';
import { logger } from '../logger.js';
import { runRender } from './run-render.js';

const REFINE_PROMPT = `You are a wine label design critic providing refinement suggestions.

Wine Details:
- Producer: {producerName}
- Wine Name: {wineName}
- Vintage: {vintage}
- Variety: {variety}

REFINEMENT TASK:
Your task is to refine the image represented by the current DSL structure shown below. You are analyzing an EXISTING wine label design that needs improvement. The label has already been generated and contains specific elements that can be modified.

Current Design Structure:
- Canvas: {width}x{height}
- Elements: {elementCount} total elements
- Palette: {primaryColor} primary, {secondaryColor} secondary

EXISTING ELEMENTS IN CURRENT DESIGN (these are the ONLY elements you can modify):
{availableElements}

CRITICAL: You can ONLY reference element IDs from the list above. These represent the actual elements that exist in the current label design. Do NOT create new element IDs or use semantic names - only use the exact IDs listed above.

Task: Analyze the visual design and suggest up to 5 specific edit operations to improve the existing label elements.

Consider:
- Visual hierarchy and readability
- Color balance and contrast  
- Element positioning and spacing
- Typography appropriateness
- Overall aesthetic coherence
- Brand positioning for the wine type

OUTPUT SCHEMA: You must return operations that match this exact structure.
IMPORTANT: Only these operation types are currently supported:

1. UPDATE_PALETTE operation:
{
  "type": "update_palette",
  "target": "primary" | "secondary" | "accent" | "background",
  "value": "#RRGGBB"
}
Changes the color value for a palette color. Affects all text/shape elements using that color.

2. UPDATE_ELEMENT operation:
{
  "type": "update_element",
  "elementId": "string element ID", 
  "property": "bounds" | "color" | "fontSize",
  "value": bounds_object | "#RRGGBB" | number_or_string
}

Property-specific formats:
- bounds: {"x": 0.0-1.0, "y": 0.0-1.0, "w": 0.0-1.0, "h": 0.0-1.0} (normalized coordinates)
- color: "#RRGGBB" hex color (converts to closest palette role)
- fontSize: number or size hint ("larger", "smaller", "normal") for text elements only

UNSUPPORTED OPERATIONS (do not use):
- update_typography: Typography changes not yet implemented
- add_element: Adding elements not yet implemented  
- remove_element: Removing elements not yet implemented
- update_element with properties: text, opacity, rotation (not yet implemented)

REQUIREMENTS:
- All coordinates use normalized values (0.0-1.0) relative to canvas dimensions
- Element IDs MUST EXACTLY MATCH the IDs from the "EXISTING ELEMENTS" list above - no variations, semantic names, or creative interpretations
- If you want to modify the year "2021", use the exact element ID shown (e.g., "vintage_text"), NOT "2021-text" or "year-text"
- If you want to modify a region like "Napa Valley", use the exact element ID shown (e.g., "region_text"), NOT "napa-valley-text" or "appellation-text"
- Color values must be valid 6-digit hex colors (e.g., "#FF0000")
- Be conservative - only suggest changes that clearly improve the design
- Maximum 10 operations per response
- Include reasoning for each suggested change
- Rate your confidence in the improvements (0-1)

Return: operations array, reasoning string, confidence score (0-1).`;

export interface RefinementOptions {
  maxIterations?: number;
  applyEdits?: boolean;
  saveRefinedImages?: boolean;
  debug?: boolean;
}

export interface RefinementResult extends RefineOutput {
  refinedDSL?: DetailedLayoutOutput;
  iterationCount: number;
  appliedEdits: number;
  failedEdits: number;
}

export async function runRefine(input: RefineInput, adapter?: VisionRefinerAdapter): Promise<RefineOutput>;

export async function runRefine(
  input: RefineInput,
  adapter: VisionRefinerAdapter,
  options: RefinementOptions,
): Promise<RefinementResult>;

export async function runRefine(
  input: RefineInput,
  adapter: VisionRefinerAdapter = pipelineConfig.adapters.vision,
  options?: RefinementOptions,
): Promise<RefineOutput | RefinementResult> {
  logger.info('Running refine step', {
    producerName: input.submission.producerName,
    previewUrl: input.previewUrl,
    withRefinementLoop: !!options,
    maxIterations: options?.maxIterations ?? 1,
  });

  // Simple refinement (original behavior) - just analyze and return suggestions
  if (!options || !options.applyEdits) {
    logger.info('Running simple refinement');

    // Use vision adapter if available, otherwise use LLM-based analysis
    if (adapter) {
      logger.info('Using vision adapter for refinement', { adapter: adapter.constructor.name });
      return await adapter.proposeEdits(input);
    }

    logger.info('Using LLM-based analysis for refinement');

    // Fallback to text-based analysis
    return await invokeStructuredLLM(
      'refine',
      REFINE_PROMPT,
      {
        ...input.submission,
        width: input.currentDSL.canvas.width,
        height: input.currentDSL.canvas.height,
        elementCount: input.currentDSL.elements.length,
        primaryColor: input.currentDSL.palette.primary,
        secondaryColor: input.currentDSL.palette.secondary,
        availableElements: formatElementIdsNumbered(input.currentDSL.elements),
      },
      RefineOutputSchema,
      RefineInputSchema,
      input,
    );
  }

  logger.info('Running enhanced refinement with edit application and iteration');

  // Enhanced refinement with edit application and iteration
  const maxIterations = options.maxIterations ?? 2;
  let currentDSL = input.currentDSL;
  let currentPreviewUrl = input.previewUrl;
  let iterationCount = 0;
  let totalAppliedEdits = 0;
  let totalFailedEdits = 0;
  let finalRefinement: RefineOutput = {
    operations: [],
    reasoning: undefined,
    confidence: undefined,
  };

  try {
    while (iterationCount < maxIterations) {
      // Get refinement suggestions for current DSL state
      const refinementInput: RefineInput = {
        ...input,
        currentDSL,
        previewUrl: currentPreviewUrl,
      };

      if (adapter) {
        logger.info('Using vision adapter for refinement', { adapter: adapter.constructor.name });
        finalRefinement = await adapter.proposeEdits(refinementInput);
      } else {
        logger.info('Using LLM-based analysis for refinement');
        finalRefinement = await invokeStructuredLLM(
          'refine',
          REFINE_PROMPT,
          {
            ...input.submission,
            width: currentDSL.canvas.width,
            height: currentDSL.canvas.height,
            elementCount: currentDSL.elements.length,
            primaryColor: currentDSL.palette.primary,
            secondaryColor: currentDSL.palette.secondary,
          },
          RefineOutputSchema,
          RefineInputSchema,
          refinementInput,
        );
      }

      // If no operations suggested, stop iterating
      if (finalRefinement.operations.length === 0) {
        logger.info('No more refinement operations suggested', { iterationCount });
        break;
      }

      // Convert LangChain EditOperations to DSL Edit format
      const edits = convertToEdits(finalRefinement.operations, currentDSL);

      if (edits.length === 0) {
        logger.info('No convertible edits found', {
          operations: finalRefinement.operations.length,
          iterationCount,
        });
        break;
      }

      // Apply the edits to the DSL
      const editResult = applyEdits(currentDSL, edits);
      totalAppliedEdits += editResult.appliedEdits.length;
      totalFailedEdits += editResult.failedEdits.length;

      logger.info('Applied refinement edits', {
        iterationCount,
        operations: finalRefinement.operations.length,
        convertedEdits: edits.length,
        appliedEdits: editResult.appliedEdits.length,
        failedEdits: editResult.failedEdits.length,
      });

      // If no edits were successfully applied, stop iterating
      if (editResult.appliedEdits.length === 0) {
        logger.warn('No edits could be applied, stopping refinement', { iterationCount });
        break;
      }

      // Update current DSL with refined version
      currentDSL = editResult.updatedDSL;

      // Re-render the refined design for next iteration or final result
      try {
        const renderOptions = {
          ...(options.debug !== undefined && { debug: options.debug }),
          ...(options.saveRefinedImages !== undefined && { saveToFile: options.saveRefinedImages }),
        };
        const refinedRenderResult = await runRender(currentDSL, renderOptions);
        currentPreviewUrl = refinedRenderResult.previewUrl;

        logger.info('Re-rendered refined design', {
          iterationCount,
          previewSize: refinedRenderResult.previewUrl.length,
        });
      } catch (renderError) {
        logger.error('Failed to re-render refined design', {
          iterationCount,
          error: renderError instanceof Error ? renderError.message : String(renderError),
        });
        break;
      }

      iterationCount++;
    }

    const result: RefinementResult = {
      operations: finalRefinement.operations,
      reasoning: finalRefinement.reasoning,
      confidence: finalRefinement.confidence,
      refinedDSL: currentDSL,
      iterationCount,
      appliedEdits: totalAppliedEdits,
      failedEdits: totalFailedEdits,
    };

    logger.info('Refinement loop completed', {
      iterations: iterationCount,
      totalAppliedEdits,
      totalFailedEdits,
      finalOperations: result.operations.length,
    });

    return result;
  } catch (error) {
    logger.error('Refinement loop failed', {
      error: error instanceof Error ? error.message : String(error),
      iterationCount,
      totalAppliedEdits,
      totalFailedEdits,
    });
    throw error;
  }
}
