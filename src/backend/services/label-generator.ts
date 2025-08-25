import { z } from 'zod';
import { supabase } from '../lib/database.js';
import { logger } from '../lib/logger.js';
import type { LabelDSL, LabelGenerationJob } from '../types/label-generation.js';
import { LabelDSLSchema } from '../types/label-generation.js';
import { generateMockLabelDSL } from './mock-data-generator.js';

// Step identifiers for orchestration
export type OrchestratorStep =
  | 'design-scheme'
  | 'image-prompts'
  | 'image-generate'
  | 'detailed-layout'
  | 'render'
  | 'refine';

// Zod schemas for simple validation of step IO during mocks
const DesignSchemeOutputSchema = z.object({
  schemeId: z.string(),
  style: z.string(),
});

const ImagePrompt = z.object({ id: z.string(), prompt: z.string() });
const ImagePromptsOutputSchema = z.object({ expectedPrompts: z.number().int().min(0), prompts: z.array(ImagePrompt) });

const ImageAssetSchema = z.object({ id: z.string(), url: z.string().url(), checksum: z.string() });
const ImageGenerateOutputSchema = z.object({ assets: z.array(ImageAssetSchema) });

const DetailedLayoutOutputSchema = z.object({ layoutId: z.string(), notes: z.string().optional() });
const RenderOutputSchema = z.object({ previewUrl: z.string().url() });
const RefineOutputSchema = z.object({ refined: z.boolean(), notes: z.string().optional() });

async function upsertStepRow(
  generationId: string,
  step: OrchestratorStep,
  nextStatus: 'pending' | 'processing' | 'completed' | 'failed',
  fields: Partial<{
    attempt: number;
    started_at: string;
    completed_at: string;
    error: string | null;
    input: unknown;
    output: unknown;
  }> = {},
) {
  if (!supabase) throw new Error('Supabase client not available');

  // Try to update first (common case), fallback to insert if row missing
  const { error: updateErr } = await supabase
    .from('label_generation_steps')
    .update({ status: nextStatus, ...fields })
    .eq('generation_id', generationId)
    .eq('step', step);

  if (updateErr) {
    logger.warn('Step update failed, attempting insert', { generationId, step, error: updateErr.message });
  }

  const { error: insertErr } = await supabase.from('label_generation_steps').insert([
    {
      generation_id: generationId,
      step,
      status: nextStatus,
      attempt: 0,
      ...fields,
    },
  ]);

  if (insertErr && insertErr.code !== '23505') {
    // Ignore unique violation (row already exists), but surface others
    throw new Error(`Failed to upsert step row: ${insertErr.message}`);
  }
}

// Note: atomic claim logic can be added with a server-side RPC if/when needed for concurrency across workers

async function claimStep(generationId: string, step: OrchestratorStep, input: unknown): Promise<number> {
  if (!supabase) throw new Error('Supabase client not available');
  // Ensure a row exists
  const { data: existing } = await supabase
    .from('label_generation_steps')
    .select('attempt')
    .eq('generation_id', generationId)
    .eq('step', step)
    .single();

  if (!existing) {
    const { error: insertErr } = await supabase.from('label_generation_steps').insert([
      {
        generation_id: generationId,
        step,
        status: 'pending',
        attempt: 0,
      },
    ]);
    if (insertErr && insertErr.code !== '23505') {
      throw new Error(`Failed to initialize step row: ${insertErr.message}`);
    }
  }

  const attempt = (existing?.attempt ?? 0) + 1;
  const { error: updateErr } = await supabase
    .from('label_generation_steps')
    .update({
      status: 'processing',
      attempt,
      started_at: new Date().toISOString(),
      input,
      error: null,
    })
    .eq('generation_id', generationId)
    .eq('step', step);
  if (updateErr) throw new Error(`Failed to claim step: ${updateErr.message}`);
  return attempt;
}

export async function runLabelOrchestrator(params: {
  generationId: string;
  job: LabelGenerationJob;
  maxImagePromptConcurrency?: number;
}): Promise<void> {
  const { generationId, job } = params;
  if (!supabase) throw new Error('Supabase client not available');

  // Transition generation to processing
  await supabase
    .from('label_generations')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', generationId);

  let currentStep: OrchestratorStep | null = null;
  try {
    // Step 1: design-scheme
    currentStep = 'design-scheme';
    await upsertStepRow(generationId, currentStep, 'pending');
    await claimStep(generationId, currentStep, { style: job.style, wineData: job.wineData });
    const designSchemeOutput = DesignSchemeOutputSchema.parse({
      schemeId: `scheme-${job.style}`,
      style: job.style,
    });
    await upsertStepRow(generationId, currentStep, 'completed', {
      completed_at: new Date().toISOString(),
      output: designSchemeOutput,
    });

    // Step 2: image-prompts
    currentStep = 'image-prompts';
    await upsertStepRow(generationId, currentStep, 'pending');
    await claimStep(generationId, currentStep, { schemeId: designSchemeOutput.schemeId });
    const prompts = Array.from({ length: 3 }).map((_, idx) => ({
      id: `prompt-${idx + 1}`,
      prompt: `Generate hero image variant ${idx + 1} for ${job.wineData.producerName}`,
    }));
    const imagePromptsOutput = ImagePromptsOutputSchema.parse({ expectedPrompts: prompts.length, prompts });
    await upsertStepRow(generationId, currentStep, 'completed', {
      completed_at: new Date().toISOString(),
      output: imagePromptsOutput,
    });

    // Step 3: image-generate (fan-out per prompt)
    currentStep = 'image-generate';
    await upsertStepRow(generationId, currentStep, 'pending');
    await claimStep(generationId, currentStep, imagePromptsOutput);

    for (const p of imagePromptsOutput.prompts) {
      const checksum = `checksum-${p.id}`;
      const url = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;
      const { error: assetErr } = await supabase.from('label_assets').insert([
        {
          generation_id: generationId,
          asset_id: p.id,
          prompt: p.prompt,
          model: 'mock-model',
          seed: '0',
          width: 1024,
          height: 1024,
          format: 'png',
          checksum,
          url,
        },
      ]);
      if (assetErr && assetErr.code !== '23505') {
        throw new Error(`Failed to insert asset: ${assetErr.message}`);
      }
    }

    const imageGenerateOutput = ImageGenerateOutputSchema.parse({
      assets: imagePromptsOutput.prompts.map((p) => ({
        id: p.id,
        url: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`,
        checksum: `checksum-${p.id}`,
      })),
    });
    await upsertStepRow(generationId, currentStep, 'completed', {
      completed_at: new Date().toISOString(),
      output: imageGenerateOutput,
    });

    // Step 4: detailed-layout
    currentStep = 'detailed-layout';
    await upsertStepRow(generationId, currentStep, 'pending');
    const labelDSL = await generateLabelDSL(job, 1);
    await claimStep(generationId, currentStep, {
      assets: imageGenerateOutput.assets,
      labelDSL,
    });
    const detailedLayoutOutput = DetailedLayoutOutputSchema.parse({ layoutId: `layout-${generationId}` });
    await upsertStepRow(generationId, currentStep, 'completed', {
      completed_at: new Date().toISOString(),
      output: detailedLayoutOutput,
    });

    // Step 5: render
    currentStep = 'render';
    await upsertStepRow(generationId, currentStep, 'pending');
    await claimStep(generationId, currentStep, { layoutId: detailedLayoutOutput.layoutId });
    const renderOutput = RenderOutputSchema.parse({
      previewUrl: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`,
    });
    await upsertStepRow(generationId, currentStep, 'completed', {
      completed_at: new Date().toISOString(),
      output: renderOutput,
    });

    // Step 6: refine (optional, no-op mock)
    currentStep = 'refine';
    await upsertStepRow(generationId, currentStep, 'pending');
    await claimStep(generationId, currentStep, { previewUrl: renderOutput.previewUrl });
    const refineOutput = RefineOutputSchema.parse({ refined: false });
    await upsertStepRow(generationId, currentStep, 'completed', {
      completed_at: new Date().toISOString(),
      output: refineOutput,
    });

    // Finalize generation with label DSL
    const { error: updateError } = await supabase
      .from('label_generations')
      .update({
        status: 'completed',
        description: labelDSL,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', generationId);

    if (updateError) {
      throw new Error(`Failed to update generation: ${updateError.message}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (currentStep) {
      await upsertStepRow(generationId, currentStep, 'failed', {
        completed_at: new Date().toISOString(),
        error: message,
      });
    }
    await supabase
      .from('label_generations')
      .update({ status: 'failed', error: message, updated_at: new Date().toISOString() })
      .eq('id', generationId);
    throw err;
  }
}

export async function generateLabelDSL(job: LabelGenerationJob, attemptCount: number = 1): Promise<LabelDSL> {
  const { style, wineData } = job;

  // Test modes for pipeline validation
  if (wineData.variety === 'TEST_ERROR') {
    throw new Error('Simulated processing error');
  }
  if (wineData.variety === 'TEST_TIMEOUT') {
    await new Promise((r) => setTimeout(r, 35000)); // Exceed 30s timeout
  }
  if (wineData.variety === 'TEST_RETRY') {
    if (attemptCount < 3) {
      throw new Error(`Retry test: attempt ${attemptCount}`);
    }
  }

  // Generate mock data for the selected style
  const mockDSL = generateMockLabelDSL(style, wineData);

  // Validate the generated DSL against the schema
  const validationResult = LabelDSLSchema.safeParse(mockDSL);
  if (!validationResult.success) {
    logger.error('Generated DSL failed validation', validationResult.error, {
      style,
      operation: 'generateLabelDSL',
      producerName: wineData.producerName,
      variety: wineData.variety,
    });
    throw new Error(`Generated DSL failed validation: ${validationResult.error.message}`);
  }

  return validationResult.data;
}
