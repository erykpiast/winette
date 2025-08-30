import type { z } from 'zod';
import { logger } from '../logger.js';

// ============================================================================
// Validation and Self-Repair
// ============================================================================

export async function validateAndRepair<TInput, TOutput>(
  input: TInput,
  output: unknown,
  inputSchema: z.ZodSchema<TInput>,
  outputSchema: z.ZodSchema<TOutput>,
  repairFunction: (input: TInput, validationError: string) => Promise<TOutput>,
): Promise<TOutput> {
  // Validate input
  const inputResult = inputSchema.safeParse(input);
  if (!inputResult.success) {
    throw new Error(`Invalid input: ${inputResult.error.message}`);
  }

  // Validate output
  const outputResult = outputSchema.safeParse(output);
  if (outputResult.success) {
    return outputResult.data;
  }

  // Attempt self-repair
  logger.warn('Output validation failed, attempting self-repair', {
    validationError: outputResult.error.message,
  });

  try {
    const repairedOutput = await repairFunction(inputResult.data, outputResult.error.message);

    // Validate repaired output
    const repairedResult = outputSchema.safeParse(repairedOutput);
    if (!repairedResult.success) {
      throw new Error(`Self-repair failed: ${repairedResult.error.message}`);
    }

    logger.info('Self-repair successful');
    return repairedResult.data;
  } catch (repairError) {
    throw new Error(
      `Validation failed and self-repair unsuccessful: ${outputResult.error.message}. ` +
        `Repair error: ${repairError instanceof Error ? repairError.message : String(repairError)}`,
    );
  }
}
