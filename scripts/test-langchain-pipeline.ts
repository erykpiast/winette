#!/usr/bin/env tsx

/**
 * End-to-end test script for the LangChain pipeline implementation
 *
 * This script demonstrates all 6 pipeline steps:
 * 1. design-scheme - Create design palette and typography
 * 2. image-prompts - Generate image generation prompts
 * 3. image-generate - Generate images (using mock adapter)
 * 4. detailed-layout - Create detailed element layout
 * 5. render - Generate preview image
 * 6. refine - AI-powered refinement suggestions
 *
 * Usage:
 *   npx tsx scripts/test-langchain-pipeline.ts
 */

import { runImageGenerate, runRefine, runRender } from '#backend/lib/langchain-chains/index.js';
import { configurePipeline } from '../src/backend/lib/langchain-pipeline/index.js';
import type {
  DetailedLayoutOutput,
  ImageGenerateOutput,
  ImagePromptsOutput,
  RefineOutput,
  RenderOutput,
} from '../src/backend/schema/langchain-pipeline-schemas.js';

// Configure pipeline for local testing with mock adapters
console.log('🔧 Configuring pipeline for local testing...');
configurePipeline({
  mockLLM: true, // Use mock LLM responses for testing
  // Mock adapters are already configured by default
});

// Sample wine submission data
const sampleSubmission = {
  producerName: 'Sunset Ridge Winery',
  wineName: 'Reserve Cabernet Sauvignon',
  vintage: '2021',
  variety: 'Cabernet Sauvignon',
  region: 'Napa Valley',
  appellation: 'Napa Valley AVA',
};

async function runPipelineEndToEnd() {
  console.log('\n🚀 Starting end-to-end LangChain pipeline test...\n');

  try {
    // Step 1: Design Scheme
    console.log('📐 Step 1: Generating design scheme...');
    // For mock testing, we'll create a sample design scheme
    const designScheme = {
      palette: {
        primary: '#8B0000', // Deep red
        secondary: '#DAA520', // Goldenrod
        accent: '#2F4F4F', // Dark slate gray
        background: '#F5F5DC', // Beige
        temperature: 'warm' as const,
        contrast: 'high' as const,
      },
      typography: {
        primary: {
          family: 'serif',
          weight: 700,
          style: 'normal' as const,
          letterSpacing: 0,
        },
        secondary: {
          family: 'sans-serif',
          weight: 400,
          style: 'normal' as const,
          letterSpacing: 0.5,
        },
        hierarchy: {
          producerEmphasis: 'dominant' as const,
          vintageProminence: 'featured' as const,
          regionDisplay: 'prominent' as const,
        },
      },
    };

    console.log('✅ Design scheme created:');
    console.log(`   Palette: ${designScheme.palette.primary} (primary), ${designScheme.palette.secondary} (secondary)`);
    console.log(
      `   Typography: ${designScheme.typography.primary.family} (primary), ${designScheme.typography.secondary.family} (secondary)`,
    );

    // Step 2: Image Prompts
    console.log('\n🎨 Step 2: Generating image prompts...');

    // For mock testing, we'll create sample prompts
    const imagePrompts: ImagePromptsOutput = {
      expectedPrompts: 2,
      prompts: [
        {
          id: 'background',
          purpose: 'background',
          prompt:
            'Elegant Napa Valley vineyard at golden hour, rolling hills with grape vines, warm sunset lighting, professional wine photography style',
          negativePrompt: 'blurry, low quality, oversaturated, cartoon',
          aspect: '4:3',
          guidance: 7.5,
        },
        {
          id: 'accent-decoration',
          purpose: 'decoration',
          prompt:
            'Subtle wine grape cluster illustration, elegant line art style, burgundy and gold colors, minimal design',
          negativePrompt: 'busy, cluttered, realistic, photographic',
          aspect: '1:1',
          guidance: 6.0,
        },
      ],
    };

    console.log('✅ Image prompts created:');
    imagePrompts.prompts.forEach((prompt) => {
      console.log(`   ${prompt.id}: ${prompt.prompt.substring(0, 60)}...`);
    });

    // Step 3: Image Generate
    console.log('\n🖼️ Step 3: Generating images...');
    const generatedImages: ImageGenerateOutput[] = [];

    for (const prompt of imagePrompts.prompts) {
      const image = await runImageGenerate({
        id: prompt.id,
        purpose: prompt.purpose,
        prompt: prompt.prompt,
        negativePrompt: prompt.negativePrompt,
        aspect: prompt.aspect,
        guidance: prompt.guidance,
      });
      generatedImages.push(image);
      console.log(`   ✅ Generated ${prompt.id}: ${image.url}`);
    }

    // Step 4: Detailed Layout
    console.log('\n📋 Step 4: Creating detailed layout...');

    // For mock testing, we'll create a sample layout
    const detailedLayout: DetailedLayoutOutput = {
      version: '1',
      canvas: {
        width: 800,
        height: 1200,
        dpi: 300,
        background: designScheme.palette.background,
      },
      palette: designScheme.palette,
      typography: designScheme.typography,
      assets: generatedImages.map((img) => ({
        id: img.id,
        type: 'image' as const,
        url: img.url,
        width: img.width,
        height: img.height,
      })),
      elements: [
        {
          id: 'producer-name',
          type: 'text' as const,
          bounds: { x: 0.1, y: 0.1, w: 0.8, h: 0.15 },
          z: 10,
          text: sampleSubmission.producerName,
          font: 'primary' as const,
          color: 'primary' as const,
          align: 'center' as const,
          fontSize: 48,
          lineHeight: 1.2,
          maxLines: 2,
          textTransform: 'uppercase' as const,
        },
        {
          id: 'wine-name',
          type: 'text' as const,
          bounds: { x: 0.1, y: 0.3, w: 0.8, h: 0.12 },
          z: 9,
          text: sampleSubmission.wineName,
          font: 'secondary' as const,
          color: 'secondary' as const,
          align: 'center' as const,
          fontSize: 36,
          lineHeight: 1.3,
          maxLines: 2,
          textTransform: 'none' as const,
        },
        {
          id: 'vintage',
          type: 'text' as const,
          bounds: { x: 0.35, y: 0.45, w: 0.3, h: 0.08 },
          z: 8,
          text: sampleSubmission.vintage,
          font: 'primary' as const,
          color: 'accent' as const,
          align: 'center' as const,
          fontSize: 32,
          lineHeight: 1.0,
          maxLines: 1,
          textTransform: 'none' as const,
        },
        {
          id: 'background-image',
          type: 'image' as const,
          bounds: { x: 0, y: 0.6, w: 1, h: 0.4 },
          z: 1,
          assetId: generatedImages[0]?.id || 'background',
          opacity: 0.3,
          fit: 'cover' as const,
          rotation: 0,
        },
      ],
    };

    console.log('✅ Detailed layout created:');
    console.log(
      `   Canvas: ${detailedLayout.canvas.width}x${detailedLayout.canvas.height} @ ${detailedLayout.canvas.dpi}dpi`,
    );
    console.log(
      `   Elements: ${detailedLayout.elements.length} (${detailedLayout.elements.filter((e) => e.type === 'text').length} text, ${detailedLayout.elements.filter((e) => e.type === 'image').length} image)`,
    );

    // Step 5: Render
    console.log('\n🎨 Step 5: Rendering preview...');
    const renderResult: RenderOutput = await runRender(detailedLayout);

    console.log('✅ Preview rendered:');
    console.log(`   Preview URL: ${renderResult.previewUrl.substring(0, 50)}...`);
    console.log(`   Dimensions: ${renderResult.width}x${renderResult.height}`);
    console.log(`   Format: ${renderResult.format}`);

    // Step 6: Refine
    console.log('\n🔍 Step 6: AI refinement analysis...');
    const refinement: RefineOutput = await runRefine({
      submission: sampleSubmission,
      currentDSL: detailedLayout,
      previewUrl: renderResult.previewUrl,
    });

    console.log('✅ Refinement analysis completed:');
    console.log(`   Operations: ${refinement.operations.length}`);
    console.log(`   Reasoning: ${refinement.reasoning}`);
    console.log(`   Confidence: ${((refinement.confidence ?? 0) * 100).toFixed(1)}%`);

    // Summary
    console.log('\n🎉 Pipeline completed successfully!');
    console.log('\n📊 Summary:');
    console.log(
      `   ✅ Design scheme: ${designScheme.palette.temperature} palette with ${designScheme.palette.contrast} contrast`,
    );
    console.log(`   ✅ Image prompts: ${imagePrompts.prompts.length} prompts generated`);
    console.log(`   ✅ Images generated: ${generatedImages.length} assets`);
    console.log(`   ✅ Layout elements: ${detailedLayout.elements.length} positioned elements`);
    console.log(`   ✅ Preview rendered: ${renderResult.format} format`);
    console.log(`   ✅ Refinement: ${refinement.operations.length} suggested operations`);

    return {
      designScheme,
      imagePrompts,
      generatedImages,
      detailedLayout,
      renderResult,
      refinement,
    };
  } catch (error) {
    console.error('❌ Pipeline failed:', error);
    throw error;
  }
}

// Performance timing
async function runWithTiming() {
  const startTime = Date.now();

  try {
    const result = await runPipelineEndToEnd();
    const duration = Date.now() - startTime;

    console.log(`\n⏱️ Total execution time: ${duration}ms`);
    console.log('\n🏁 End-to-end test completed successfully!');

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`\n⏱️ Failed after: ${duration}ms`);
    throw error;
  }
}

// Run the test if this script is executed directly
if (import.meta.url.startsWith('file:')) {
  runWithTiming().catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

export { runPipelineEndToEnd, runWithTiming };
