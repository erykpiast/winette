#!/usr/bin/env tsx

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Test script for LangChain pipeline with LangSmith tracing
 *
 * This script runs the pipeline with REAL LangChain models to ensure
 * traces appear in LangSmith. Unlike the regular test script, this uses
 * actual Anthropic/OpenAI models instead of mocks.
 *
 * Usage:
 *   npx tsx scripts/test-langchain-pipeline-with-tracing.ts
 *
 * Requirements:
 *   - ANTHROPIC_API_KEY set in environment
 *   - OPENAI_API_KEY set in environment (for image generation)
 *   - LANGSMITH_API_KEY set in environment
 *   - LANGSMITH_PROJECT set in environment (e.g., "winette")
 *   - LANGSMITH_TRACING="true" set in environment
 */

import {
  runDesignScheme,
  runDetailedLayout,
  runImageGenerate,
  runImagePrompts,
  runRefine,
  runRender,
} from '#backend/lib/langchain-chains.js';
import { configurePipeline, MockImageAdapter } from '#backend/lib/langchain-pipeline.js';
import { getTracingConfig, isTracingConfigured } from '#backend/lib/langsmith-tracing.js';
import { configureForProduction } from '#backend/lib/production-config.js';
import type {
  DesignSchemeOutput,
  DetailedLayoutOutput,
  ImageGenerateOutput,
  ImagePromptsOutput,
  RefineOutput,
  RenderOutput,
} from '#backend/schema/langchain-pipeline-schemas.js';

// Sample wine submission data
const sampleSubmission = {
  producerName: 'Sunset Ridge Winery',
  wineName: 'Reserve Cabernet Sauvignon',
  vintage: '2021',
  variety: 'Cabernet Sauvignon',
  region: 'Napa Valley',
  appellation: 'Napa Valley AVA',
};

type PipelineResult = {
  designScheme: DesignSchemeOutput;
  imagePrompts: ImagePromptsOutput;
  generatedImages: ImageGenerateOutput[];
  detailedLayout: DetailedLayoutOutput;
  renderResult: RenderOutput;
  refinement: RefineOutput;
};

async function runPipelineWithTracing(): Promise<PipelineResult> {
  console.log('\n🚀 Starting LangChain pipeline test with LangSmith tracing...\n');

  // Check tracing configuration
  const tracingConfig = getTracingConfig();
  console.log('🔍 Tracing Configuration:', tracingConfig);

  if (!isTracingConfigured()) {
    console.log('\n❌ LangSmith tracing not properly configured!');
    console.log('Required environment variables:');
    console.log('  - LANGSMITH_TRACING="true"');
    console.log('  - LANGSMITH_API_KEY=your_key_here');
    console.log('  - LANGSMITH_PROJECT=winette');
    console.log('\nPlease set these variables and try again.');
    process.exit(1);
  }

  // Configure for production (uses real models and adapters)
  console.log('🔧 Configuring pipeline for production use...');
  try {
    configureForProduction();
    // Override ONLY image generation to use mock adapter while keeping real LLM & vision models
    configurePipeline({ imageAdapter: new MockImageAdapter() });
    console.log('✅ Production configuration successful');
  } catch (error) {
    console.error('❌ Production configuration failed:', error);
    process.exit(1);
  }

  try {
    // Step 1: Design-scheme (REAL LLM)
    console.log('\n📐 Step 1: Generating design scheme with LLM...');
    const style: 'classic' | 'modern' | 'elegant' | 'funky' =
      (process.env.LABEL_STYLE as 'classic' | 'modern' | 'elegant' | 'funky') || 'elegant';
    const designScheme = await runDesignScheme({ submission: sampleSubmission, style });
    console.log('✅ Design scheme generated');

    // Step 2: Image-prompts (REAL LLM)
    console.log('\n🎨 Step 2: Generating image prompts with LLM...');
    const imagePrompts: ImagePromptsOutput = await runImagePrompts(designScheme);
    console.log(`✅ Image prompts generated: ${imagePrompts.prompts.length}`);

    // Step 3: Image Generate - MOCK adapter (others are real)
    console.log('\n🖼️ Step 3: Generating images (mock adapter)...');
    const generatedImages: ImageGenerateOutput[] = [];

    for (const prompt of imagePrompts.prompts) {
      console.log(`   🎯 Generating ${prompt.id}...`);
      try {
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
      } catch (error) {
        console.error(`   ❌ Failed to generate ${prompt.id}:`, error);
        throw error;
      }
    }

    // Step 4: Detailed-layout (REAL LLM)
    console.log('\n📋 Step 4: Creating detailed layout with LLM...');
    const detailedLayout: DetailedLayoutOutput = await runDetailedLayout({
      version: designScheme.version,
      canvas: designScheme.canvas,
      palette: designScheme.palette,
      typography: designScheme.typography,
      assets: generatedImages,
    });
    console.log('✅ Detailed layout generated');

    // Step 5: Render (current implementation is mock inside the chain)
    console.log('\n🎨 Step 5: Rendering preview...');
    const renderResult: RenderOutput = await runRender(detailedLayout);
    console.log('✅ Render completed');

    // Step 6: Refine - REAL GPT-5 Vision calls
    console.log('\n🔍 Step 6: AI refinement analysis with GPT-5 Vision...');
    try {
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
      console.log('   ✅ LangSmith tracing initialized');
      console.log(`   ✅ Image prompts: ${imagePrompts.prompts.length} prompts`);
      console.log(`   ✅ Images generated: ${generatedImages.length} assets`);
      console.log('   ✅ Vision analysis completed');
      console.log('\n🔍 Check your LangSmith dashboard to see the traces!');
      console.log(`   Project: ${tracingConfig.project}`);
      console.log('   URL: https://smith.langchain.com/');

      return {
        designScheme,
        imagePrompts,
        generatedImages,
        detailedLayout,
        renderResult,
        refinement,
      };
    } catch (error) {
      console.error('❌ Refinement analysis failed:', error);
      throw error;
    }
  } catch (error) {
    console.error('❌ Pipeline failed:', error);
    throw error;
  }
}

// Performance timing
async function runWithTiming(): Promise<PipelineResult> {
  const startTime = Date.now();

  try {
    const result = await runPipelineWithTracing();
    const duration = Date.now() - startTime;

    console.log(`\n⏱️ Total execution time: ${duration}ms`);
    console.log('\n🏁 End-to-end test with tracing completed successfully!');

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

export { runPipelineWithTracing, runWithTiming };
