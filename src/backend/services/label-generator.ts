import { z } from 'zod';
import { supabase } from '../lib/database.js';
import { logger } from '../lib/logger.js';
import type { LabelDescription, LabelGenerationJob, LabelStyleId } from '../types/label-generation.js';

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
      const url = `https://cdn.example.com/assets/${generationId}/${p.id}.png`;
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
        url: `https://cdn.example.com/assets/${generationId}/${p.id}.png`,
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
    await claimStep(generationId, currentStep, {
      assets: imageGenerateOutput.assets,
      description: await generateLabelDescription(job, 1),
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
      previewUrl: `https://cdn.example.com/previews/${generationId}.png`,
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

    // Finalize generation with description reused from earlier phase functionality
    const description = await generateLabelDescription(job, 1);
    const { error: updateError } = await supabase
      .from('label_generations')
      .update({
        status: 'completed',
        description,
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

export async function generateLabelDescription(
  job: LabelGenerationJob,
  attemptCount: number = 1,
): Promise<LabelDescription> {
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

  // Return mock data for the selected style
  return getMockLabelDescription(style);
}

// Mock data generator - returns consistent test data
function getMockLabelDescription(style: LabelStyleId): LabelDescription {
  const mockDescriptions = {
    classic: createClassicMockDescription(),
    modern: createModernMockDescription(),
    elegant: createElegantMockDescription(),
    funky: createFunkyMockDescription(),
  };

  return mockDescriptions[style];
}

function createClassicMockDescription(): LabelDescription {
  return {
    colorPalette: {
      primary: { hex: '#8B0000', rgb: [139, 0, 0], name: 'Dark Red' },
      secondary: { hex: '#DAA520', rgb: [218, 165, 32], name: 'Goldenrod' },
      accent: { hex: '#FFD700', rgb: [255, 215, 0], name: 'Gold' },
      background: { hex: '#FFF8DC', rgb: [255, 248, 220], name: 'Cornsilk' },
      temperature: 'warm',
      contrast: 'high',
    },
    typography: {
      primary: {
        family: 'Trajan Pro',
        weight: 700,
        style: 'normal',
        letterSpacing: 2,
        characteristics: ['serif', 'traditional', 'carved'],
      },
      secondary: {
        family: 'Times New Roman',
        weight: 400,
        style: 'italic',
        letterSpacing: 1,
        characteristics: ['serif', 'elegant', 'readable'],
      },
      hierarchy: {
        producerEmphasis: 'dominant',
        vintageProminence: 'featured',
        regionDisplay: 'prominent',
      },
    },
    layout: {
      alignment: 'centered',
      composition: 'classical',
      whitespace: 'balanced',
      structure: 'rigid',
    },
    imagery: {
      primaryTheme: 'estate',
      elements: ['château silhouette', 'vine borders', 'heraldic shield'],
      style: 'engraving',
      complexity: 'detailed',
    },
    decorations: [
      {
        type: 'border',
        theme: 'vine-scroll',
        placement: 'full',
        weight: 'moderate',
      },
      {
        type: 'flourish',
        theme: 'baroque',
        placement: 'corners',
        weight: 'delicate',
      },
    ],
    mood: {
      overall: 'sophisticated and traditional',
      attributes: ['luxurious', 'heritage', 'prestigious', 'time-honored'],
    },
  };
}

function createModernMockDescription(): LabelDescription {
  return {
    colorPalette: {
      primary: { hex: '#2C3E50', rgb: [44, 62, 80], name: 'Dark Blue Gray' },
      secondary: { hex: '#E74C3C', rgb: [231, 76, 60], name: 'Red' },
      accent: { hex: '#F39C12', rgb: [243, 156, 18], name: 'Orange' },
      background: { hex: '#FFFFFF', rgb: [255, 255, 255], name: 'White' },
      temperature: 'cool',
      contrast: 'high',
    },
    typography: {
      primary: {
        family: 'Helvetica Neue',
        weight: 300,
        style: 'normal',
        letterSpacing: 0,
        characteristics: ['sans-serif', 'clean', 'minimal'],
      },
      secondary: {
        family: 'Helvetica Neue',
        weight: 700,
        style: 'normal',
        letterSpacing: 1,
        characteristics: ['sans-serif', 'bold', 'geometric'],
      },
      hierarchy: {
        producerEmphasis: 'balanced',
        vintageProminence: 'minimal',
        regionDisplay: 'integrated',
      },
    },
    layout: {
      alignment: 'asymmetric',
      composition: 'dynamic',
      whitespace: 'generous',
      structure: 'geometric',
    },
    imagery: {
      primaryTheme: 'abstract',
      elements: ['geometric shapes', 'color blocks', 'minimal lines'],
      style: 'minimal',
      complexity: 'simple',
    },
    decorations: [
      {
        type: 'divider',
        theme: 'geometric',
        placement: 'accent',
        weight: 'delicate',
      },
    ],
    mood: {
      overall: 'fresh and contemporary',
      attributes: ['innovative', 'approachable', 'clean', 'forward-thinking'],
    },
  };
}

function createElegantMockDescription(): LabelDescription {
  return {
    colorPalette: {
      primary: { hex: '#4A4A4A', rgb: [74, 74, 74], name: 'Charcoal Gray' },
      secondary: { hex: '#D4AF37', rgb: [212, 175, 55], name: 'Gold' },
      accent: { hex: '#800080', rgb: [128, 0, 128], name: 'Purple' },
      background: { hex: '#F5F5F0', rgb: [245, 245, 240], name: 'Cream' },
      temperature: 'neutral',
      contrast: 'medium',
    },
    typography: {
      primary: {
        family: 'Didot',
        weight: 400,
        style: 'normal',
        letterSpacing: 1.5,
        characteristics: ['serif', 'refined', 'high-contrast'],
      },
      secondary: {
        family: 'Didot',
        weight: 300,
        style: 'italic',
        letterSpacing: 0.5,
        characteristics: ['serif', 'delicate', 'sophisticated'],
      },
      hierarchy: {
        producerEmphasis: 'subtle',
        vintageProminence: 'standard',
        regionDisplay: 'subtle',
      },
    },
    layout: {
      alignment: 'centered',
      composition: 'minimal',
      whitespace: 'generous',
      structure: 'organic',
    },
    imagery: {
      primaryTheme: 'botanical',
      elements: ['delicate vine leaves', 'subtle flourishes'],
      style: 'watercolor',
      complexity: 'moderate',
    },
    decorations: [
      {
        type: 'flourish',
        theme: 'art-nouveau',
        placement: 'top-bottom',
        weight: 'delicate',
      },
    ],
    mood: {
      overall: 'refined and understated',
      attributes: ['sophisticated', 'graceful', 'timeless', 'refined'],
    },
  };
}

function createFunkyMockDescription(): LabelDescription {
  return {
    colorPalette: {
      primary: { hex: '#FF6B6B', rgb: [255, 107, 107], name: 'Coral' },
      secondary: { hex: '#4ECDC4', rgb: [78, 205, 196], name: 'Turquoise' },
      accent: { hex: '#FFE66D', rgb: [255, 230, 109], name: 'Yellow' },
      background: { hex: '#6A4C93', rgb: [106, 76, 147], name: 'Purple' },
      temperature: 'warm',
      contrast: 'high',
    },
    typography: {
      primary: {
        family: 'Futura',
        weight: 800,
        style: 'normal',
        letterSpacing: 3,
        characteristics: ['sans-serif', 'bold', 'geometric'],
      },
      secondary: {
        family: 'Comic Sans MS',
        weight: 400,
        style: 'normal',
        letterSpacing: 0,
        characteristics: ['casual', 'playful', 'rounded'],
      },
      hierarchy: {
        producerEmphasis: 'dominant',
        vintageProminence: 'featured',
        regionDisplay: 'integrated',
      },
    },
    layout: {
      alignment: 'asymmetric',
      composition: 'dynamic',
      whitespace: 'compact',
      structure: 'organic',
    },
    imagery: {
      primaryTheme: 'abstract',
      elements: ['splashes', 'organic shapes', 'paint drips'],
      style: 'art',
      complexity: 'detailed',
    },
    decorations: [
      {
        type: 'pattern',
        theme: 'organic',
        placement: 'accent',
        weight: 'bold',
      },
      {
        type: 'flourish',
        theme: 'psychedelic',
        placement: 'corners',
        weight: 'bold',
      },
    ],
    mood: {
      overall: 'vibrant and playful',
      attributes: ['energetic', 'creative', 'bold', 'unconventional'],
    },
  };
}
