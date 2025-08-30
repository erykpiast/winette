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
 *   npx tsx scripts/test-langchain-pipeline-with-tracing.ts [options]
 *
 * Options:
 *   --producer-name "Producer Name"      Wine producer name
 *   --wine-name "Wine Name"             Wine name
 *   --vintage "2021"                    Wine vintage year
 *   --variety "Variety"                 Wine variety/grape type
 *   --region "Region"                   Wine region
 *   --appellation "Appellation"         Wine appellation
 *   --style "elegant|modern|classic|funky"  Label design style
 *   --real-images                       Use real image generation (default: false, uses mock)
 *   --help                              Show this help message
 *
 * Examples:
 *   # Use default sample data with mock images
 *   npx tsx scripts/test-langchain-pipeline-with-tracing.ts
 *
 *   # Custom wine with real image generation
 *   npx tsx scripts/test-langchain-pipeline-with-tracing.ts \
 *     --producer-name "Château Example" \
 *     --wine-name "Grand Reserve" \
 *     --vintage "2020" \
 *     --variety "Bordeaux Blend" \
 *     --region "Bordeaux" \
 *     --appellation "Saint-Émilion" \
 *     --style "classic" \
 *     --real-images
 *
 * Requirements:
 *   - ANTHROPIC_API_KEY set in environment
 *   - OPENAI_API_KEY set in environment (for image generation when --real-images is used)
 *   - LANGSMITH_API_KEY set in environment
 *   - LANGSMITH_PROJECT set in environment (e.g., "winette")
 *   - LANGSMITH_TRACING="true" set in environment
 */

import {
  type RefinementResult,
  runDesignScheme,
  runDetailedLayout,
  runImageGenerate,
  runImagePrompts,
  runRefine,
  runRender,
} from '#backend/lib/langchain-chains/index.js';
import { configurePipeline, MockImageAdapter, pipelineConfig } from '#backend/lib/langchain-pipeline/index.js';
import { getTracingConfig, isTracingConfigured } from '#backend/lib/langsmith-tracing.js';
import { configureForProduction } from '#backend/lib/production-config.js';
import type {
  DesignSchemeOutput,
  DetailedLayoutOutput,
  ImageGenerateOutput,
  ImagePromptsOutput,
  RenderOutput,
} from '#backend/schema/langchain-pipeline-schemas.js';

// CLI argument parsing
interface CLIOptions {
  producerName?: string;
  wineName?: string;
  vintage?: string;
  variety?: string;
  region?: string;
  appellation?: string;
  style?: 'classic' | 'modern' | 'elegant' | 'funky' | undefined;
  realImages?: boolean;
  help?: boolean;
}

function showHelp(): void {
  const helpText = `
Test script for LangChain pipeline with LangSmith tracing

Usage:
  npx tsx scripts/test-langchain-pipeline-with-tracing.ts [options]

Options:
  --producer-name "Producer Name"      Wine producer name
  --wine-name "Wine Name"             Wine name  
  --vintage "2021"                    Wine vintage year
  --variety "Variety"                 Wine variety/grape type
  --region "Region"                   Wine region
  --appellation "Appellation"         Wine appellation
  --style "elegant|modern|classic|funky"  Label design style (default: elegant)
  --real-images                       Use real image generation (default: false, uses mock)
  --help                              Show this help message

Examples:
  # Use default sample data with mock images
  npx tsx scripts/test-langchain-pipeline-with-tracing.ts
  
  # Custom wine with real image generation
  npx tsx scripts/test-langchain-pipeline-with-tracing.ts \\
    --producer-name "Château Example" \\
    --wine-name "Grand Reserve" \\
    --vintage "2020" \\
    --variety "Bordeaux Blend" \\
    --region "Bordeaux" \\
    --appellation "Saint-Émilion" \\
    --style "classic" \\
    --real-images

Requirements:
  - ANTHROPIC_API_KEY set in environment
  - OPENAI_API_KEY set in environment (for image generation when --real-images is used)
  - LANGSMITH_API_KEY set in environment
  - LANGSMITH_PROJECT set in environment (e.g., "winette")
  - LANGSMITH_TRACING="true" set in environment
`;
  console.log(helpText);
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    return { help: true };
  }

  const getArg = (flag: string): string | undefined => {
    const index = args.indexOf(flag);
    const nextArg = args[index + 1];
    return index >= 0 && nextArg && !nextArg.startsWith('--') ? nextArg : undefined;
  };

  // Check for unknown options and report them
  for (const arg of args) {
    if (
      arg.startsWith('--') &&
      ![
        '--help',
        '--producer-name',
        '--wine-name',
        '--vintage',
        '--variety',
        '--region',
        '--appellation',
        '--style',
        '--real-images',
      ].includes(arg)
    ) {
      console.error(`❌ Unknown option: ${arg}`);
      console.log('Use --help to see available options');
      process.exit(1);
    }
  }

  const style = getArg('--style');

  const options: CLIOptions = {
    realImages: args.includes('--real-images'),
  };

  const producerName = getArg('--producer-name');
  if (producerName) options.producerName = producerName;

  const wineName = getArg('--wine-name');
  if (wineName) options.wineName = wineName;

  const vintage = getArg('--vintage');
  if (vintage) options.vintage = vintage;

  const variety = getArg('--variety');
  if (variety) options.variety = variety;

  const region = getArg('--region');
  if (region) options.region = region;

  const appellation = getArg('--appellation');
  if (appellation) options.appellation = appellation;

  if (style && ['classic', 'modern', 'elegant', 'funky'].includes(style)) {
    options.style = style as CLIOptions['style'];
  }

  return options;
}

// Sample wine submission data (fallback)
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
  refinement: RefinementResult;
};

async function runPipelineWithTracing(options: CLIOptions): Promise<PipelineResult> {
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

  // Build wine submission from CLI options or use defaults
  const submission = {
    producerName: options.producerName ?? sampleSubmission.producerName,
    wineName: options.wineName ?? sampleSubmission.wineName,
    vintage: options.vintage ?? sampleSubmission.vintage,
    variety: options.variety ?? sampleSubmission.variety,
    region: options.region ?? sampleSubmission.region,
    appellation: options.appellation ?? sampleSubmission.appellation,
  };

  // Validate input parameters
  if (submission.vintage && !/^\d{4}$/.test(submission.vintage)) {
    console.error(`❌ Invalid vintage format: ${submission.vintage}. Expected 4-digit year (e.g., "2021").`);
    process.exit(1);
  }

  // Validate required fields are not empty strings
  const requiredFields = ['producerName', 'wineName', 'variety'] as const;
  for (const field of requiredFields) {
    if (!submission[field] || submission[field].trim() === '') {
      console.error(`❌ Missing required field: ${field}`);
      console.error('Use --help to see available options');
      process.exit(1);
    }
  }

  console.log('🍷 Wine Submission Data:');
  console.log(`   Producer: ${submission.producerName}`);
  console.log(`   Wine: ${submission.wineName}`);
  console.log(`   Vintage: ${submission.vintage}`);
  console.log(`   Variety: ${submission.variety}`);
  console.log(`   Region: ${submission.region}`);
  console.log(`   Appellation: ${submission.appellation}`);

  // Configure for production (uses real models and adapters)
  console.log('\n🔧 Configuring pipeline for production use...');
  try {
    await configureForProduction();

    // Only use mock adapter if --real-images is NOT specified
    if (!options.realImages) {
      console.log('🎨 Using mock image adapter (use --real-images for real generation)');
      configurePipeline({ imageAdapter: new MockImageAdapter() });
    } else {
      console.log('🎨 Using real image generation');
    }

    console.log('✅ Production configuration successful');
  } catch (error) {
    console.error('❌ Production configuration failed:', error);
    process.exit(1);
  }

  try {
    // Step 1: Design-scheme (REAL LLM)
    console.log('\n📐 Step 1: Generating design scheme with LLM...');
    const style = options.style || 'elegant';
    console.log(`   Style: ${style}`);
    const designScheme = await runDesignScheme({ submission, style });
    console.log('✅ Design scheme generated');

    // Step 2: Image-prompts (REAL LLM)
    console.log('\n🎨 Step 2: Generating image prompts with LLM...');
    const imagePrompts: ImagePromptsOutput = await runImagePrompts({
      ...designScheme,
      style, // Pass through the style for style-aware image generation
      submission, // Pass the wine submission data for contextual image generation
    });
    console.log(`✅ Image prompts generated: ${imagePrompts.prompts.length}`);

    // Step 3: Image Generate
    const imageType = options.realImages ? 'real' : 'mock';
    console.log(`\n🖼️ Step 3: Generating images (${imageType} adapter)...`);
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
      submission, // Use the CLI-configured submission data
      style, // Pass through the style for layout variation
    });
    console.log('✅ Detailed layout generated');

    // Step 5: Real Browser Rendering
    console.log('\n🎨 Step 5: Rendering preview with real browser...');
    const renderResult = await runRender(detailedLayout, {
      debug: false,
      saveToFile: true,
    });
    console.log(`✅ Real browser render completed`);

    // Step 6: Refinement Loop with Real Image Analysis
    console.log('\n🔍 Step 6: AI refinement analysis with GPT-5 Vision...');

    // Note: Using 3-parameter overload with applyEdits=true returns RefinementResult
    const refinement = (await runRefine(
      {
        submission,
        currentDSL: detailedLayout,
        previewUrl: renderResult.previewUrl,
      },
      pipelineConfig.adapters.vision,
      {
        maxIterations: 2,
        applyEdits: true,
        saveRefinedImages: true,
        debug: false,
      },
    )) as RefinementResult;

    console.log('✅ Refinement analysis completed:');
    console.log(`   Operations: ${refinement.operations.length}`);
    console.log(`   Reasoning: ${refinement.reasoning}`);
    console.log(`   Confidence: ${((refinement.confidence ?? 0) * 100).toFixed(1)}%`);
    console.log(`   Iterations: ${refinement.iterationCount}`);
    console.log(`   Applied Edits: ${refinement.appliedEdits}`);
    console.log(`   Failed Edits: ${refinement.failedEdits}`);

    if (refinement.appliedEdits > 0) {
      console.log('   ✅ Label design refined successfully');
    } else {
      console.log('   ℹ️ No refinement operations suggested or applied');
    }

    // Summary
    console.log('\n🎉 Pipeline with refinement loop completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   ✅ LangSmith tracing initialized');
    console.log(`   ✅ Image prompts: ${imagePrompts.prompts.length} prompts`);
    console.log(`   ✅ Images generated: ${generatedImages.length} assets`);
    console.log('   ✅ Real browser rendering completed');
    console.log('   ✅ Vision analysis with real image completed');
    if (refinement.operations.length > 0) {
      console.log(`   ✅ Refinement: ${refinement.operations.length} operations suggested`);
      console.log(`   🔄 Refinement iterations: ${refinement.iterationCount}`);
    } else {
      console.log('   ℹ️ No refinements suggested by vision model');
    }
    console.log('\n🔍 Check your LangSmith dashboard to see the traces!');
    console.log(`   Project: ${tracingConfig.project}`);
    console.log('   URL: https://smith.langchain.com/');

    return {
      designScheme,
      imagePrompts,
      generatedImages,
      detailedLayout: refinement.refinedDSL ?? detailedLayout, // Use refined DSL if available
      renderResult,
      refinement,
    };
  } catch (error) {
    console.error('❌ Pipeline failed:', error);
    throw error;
  }
}

// Performance timing
async function runWithTiming(options: CLIOptions): Promise<PipelineResult> {
  const startTime = Date.now();

  try {
    const result = await runPipelineWithTracing(options);
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
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  runWithTiming(options).catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

export { runPipelineWithTracing, runWithTiming };
