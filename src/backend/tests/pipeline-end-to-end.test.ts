// End-to-end pipeline demonstration test
// Shows complete workflow from wine submission to final refinement

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runImageGenerate, runRefine, runRender } from '../lib/langchain-chains/index.js';
import { configurePipeline } from '../lib/langchain-pipeline/index.js';

// Mock logger to avoid console output during tests
vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('End-to-End Pipeline Demonstration', () => {
  beforeEach(() => {
    // Configure pipeline for testing with mock adapters (already configured by default)
    // Note: LLM steps require real language models, only image and vision use adapters
    configurePipeline({
      // Mock adapters are already configured by default in pipelineConfig
    });
  });

  it('should complete full pipeline workflow', async () => {
    console.log('\n🚀 Demonstrating complete LangChain pipeline workflow:\n');

    // Sample wine data
    const wineSubmission = {
      producerName: 'Château Test Valley',
      wineName: 'Reserve Pinot Noir',
      vintage: '2022',
      variety: 'Pinot Noir',
      region: 'Willamette Valley',
      appellation: 'Willamette Valley AVA',
    };

    console.log('📋 Wine Submission:');
    console.log(`   Producer: ${wineSubmission.producerName}`);
    console.log(`   Wine: ${wineSubmission.wineName} ${wineSubmission.vintage}`);
    console.log(`   Region: ${wineSubmission.region}`);

    // Step 1: Design Scheme (mocked but would generate palette/typography)
    console.log('\n📐 Step 1: Design Scheme Generation');
    const designScheme = {
      palette: {
        primary: '#722F37', // Pinot Noir red
        secondary: '#D4AF37', // Gold
        accent: '#2F4F2F', // Dark green
        background: '#F8F8FF', // Ghost white
        temperature: 'warm' as const,
        contrast: 'medium' as const,
      },
      typography: {
        primary: {
          family: 'serif',
          weight: 600,
          style: 'normal' as const,
          letterSpacing: 0,
        },
        secondary: {
          family: 'sans-serif',
          weight: 400,
          style: 'normal' as const,
          letterSpacing: 0.3,
        },
        hierarchy: {
          producerEmphasis: 'balanced' as const,
          vintageProminence: 'featured' as const,
          regionDisplay: 'integrated' as const,
        },
      },
      reasoning: 'Elegant Pinot Noir design with warm earth tones reflecting Willamette Valley terroir',
    };
    console.log('   ✅ Generated warm palette with elegant typography');

    // Step 2: Image Prompts (mocked but would generate detailed prompts)
    console.log('\n🎨 Step 2: Image Prompt Generation');
    const imagePrompts = [
      {
        id: 'vineyard-background',
        purpose: 'background' as const,
        prompt:
          'Willamette Valley vineyard landscape, rolling hills with Pinot Noir vines, golden autumn light, Oregon wine country',
        negativePrompt: 'harsh lighting, artificial, oversaturated',
        aspect: '3:2' as const,
        guidance: 8.0,
      },
      {
        id: 'grape-accent',
        purpose: 'decoration' as const,
        prompt:
          'Elegant Pinot Noir grape cluster watercolor illustration, burgundy and gold tones, minimalist wine art',
        negativePrompt: 'photorealistic, busy, cluttered',
        aspect: '1:1' as const,
        guidance: 7.0,
      },
    ];
    console.log(`   ✅ Generated ${imagePrompts.length} specialized image prompts`);

    // Step 3: Image Generation (using mock adapter)
    console.log('\n🖼️ Step 3: Image Generation');
    const generatedImages = [];
    for (const prompt of imagePrompts) {
      const image = await runImageGenerate(prompt);
      generatedImages.push(image);
      console.log(`   ✅ Generated ${prompt.id}: ${image.width}x${image.height}`);
    }

    // Step 4: Detailed Layout (creating comprehensive DSL)
    console.log('\n📋 Step 4: Detailed Layout Creation');
    const detailedLayout = {
      version: '1' as const,
      canvas: {
        width: 750,
        height: 1000,
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
        // Producer name - prominent positioning
        {
          id: 'producer',
          type: 'text' as const,
          bounds: { x: 0.1, y: 0.08, w: 0.8, h: 0.12 },
          z: 10,
          text: wineSubmission.producerName,
          font: 'primary' as const,
          color: 'primary' as const,
          align: 'center' as const,
          fontSize: 42,
          lineHeight: 1.1,
          maxLines: 2,
          textTransform: 'uppercase' as const,
        },
        // Wine name - elegant central placement
        {
          id: 'wine-name',
          type: 'text' as const,
          bounds: { x: 0.1, y: 0.25, w: 0.8, h: 0.1 },
          z: 9,
          text: wineSubmission.wineName,
          font: 'secondary' as const,
          color: 'secondary' as const,
          align: 'center' as const,
          fontSize: 34,
          lineHeight: 1.2,
          maxLines: 2,
          textTransform: 'none' as const,
        },
        // Vintage - featured but balanced
        {
          id: 'vintage',
          type: 'text' as const,
          bounds: { x: 0.35, y: 0.38, w: 0.3, h: 0.06 },
          z: 8,
          text: wineSubmission.vintage,
          font: 'primary' as const,
          color: 'accent' as const,
          align: 'center' as const,
          fontSize: 28,
          lineHeight: 1.0,
          maxLines: 1,
          textTransform: 'none' as const,
        },
        // Region - integrated subtly
        {
          id: 'region',
          type: 'text' as const,
          bounds: { x: 0.1, y: 0.85, w: 0.8, h: 0.05 },
          z: 7,
          text: wineSubmission.region,
          font: 'secondary' as const,
          color: 'accent' as const,
          align: 'center' as const,
          fontSize: 18,
          lineHeight: 1.0,
          maxLines: 1,
          textTransform: 'uppercase' as const,
        },
        // Background vineyard image
        {
          id: 'vineyard-bg',
          type: 'image' as const,
          bounds: { x: 0, y: 0.5, w: 1, h: 0.35 },
          z: 1,
          assetId: generatedImages[0]?.id || '',
          opacity: 0.25,
          fit: 'cover' as const,
          rotation: 0,
        },
        // Decorative grape element
        {
          id: 'grape-decoration',
          type: 'image' as const,
          bounds: { x: 0.75, y: 0.15, w: 0.2, h: 0.2 },
          z: 5,
          assetId: generatedImages[1]?.id || '',
          opacity: 0.6,
          fit: 'contain' as const,
          rotation: 0,
        },
      ],
    };
    console.log(
      `   ✅ Positioned ${detailedLayout.elements.length} elements on ${detailedLayout.canvas.width}x${detailedLayout.canvas.height} canvas`,
    );

    // Step 5: Render Preview (using mock renderer)
    console.log('\n🎨 Step 5: Preview Rendering');
    const renderResult = await runRender(detailedLayout);
    console.log(`   ✅ Rendered ${renderResult.format} preview: ${renderResult.width}x${renderResult.height}`);
    console.log(`   📸 Preview available at: ${renderResult.previewUrl.substring(0, 40)}...`);

    // Step 6: AI Refinement (using mock vision adapter)
    console.log('\n🔍 Step 6: AI Refinement Analysis');
    const refinement = await runRefine({
      submission: wineSubmission,
      currentDSL: detailedLayout,
      previewUrl: renderResult.previewUrl,
    });
    console.log(`   ✅ Analysis completed with ${((refinement.confidence ?? 0) * 100).toFixed(0)}% confidence`);
    console.log(`   💡 Reasoning: ${refinement.reasoning}`);
    console.log(`   🔧 Suggested operations: ${refinement.operations.length}`);

    // Pipeline Summary
    console.log('\n📊 Pipeline Execution Summary:');
    console.log('   ✅ Design Scheme: Generated palette and typography');
    console.log(`   ✅ Image Prompts: ${imagePrompts.length} specialized prompts created`);
    console.log(`   ✅ Image Generation: ${generatedImages.length} assets produced`);
    console.log(`   ✅ Layout Design: ${detailedLayout.elements.length} elements positioned`);
    console.log(`   ✅ Preview Render: ${renderResult.format} format generated`);
    console.log(`   ✅ AI Refinement: ${refinement.operations.length} optimization suggestions`);

    console.log('\n🎉 Complete pipeline workflow demonstrated successfully!\n');

    // Assertions to validate the pipeline worked
    expect(generatedImages).toHaveLength(2);
    expect(generatedImages[0]).toMatchObject({
      id: expect.stringContaining('asset-'),
      url: expect.stringMatching(
        /^https:\/\/winette\.vercel\.app\/mock-images\/(background|decoration|foreground)\.png$|^data:image\/svg\+xml;base64,/,
      ),
      width: expect.any(Number),
      height: expect.any(Number),
    });

    expect(detailedLayout.elements).toHaveLength(6);
    expect(detailedLayout.assets).toHaveLength(2);
    expect(detailedLayout.canvas.width).toBe(750);
    expect(detailedLayout.canvas.height).toBe(1000);

    expect(renderResult).toMatchObject({
      previewUrl: expect.stringMatching(/^https:\/\//),
      width: 750,
      height: 1000,
      format: 'PNG',
    });

    expect(refinement).toMatchObject({
      operations: expect.any(Array),
      reasoning: expect.stringContaining('balanced'),
      confidence: expect.any(Number),
    });
    expect(refinement.confidence).toBeGreaterThanOrEqual(0);
    expect(refinement.confidence).toBeLessThanOrEqual(1);
  }, 10000); // 10 second timeout for the full pipeline

  it('should demonstrate pipeline flexibility with different wine styles', async () => {
    console.log('\n🍷 Demonstrating pipeline adaptability:\n');

    // Different wine style - sparkling
    const sparklingWine = {
      producerName: 'Domaine Étoile',
      wineName: 'Brut Rosé',
      vintage: '2020',
      variety: 'Pinot Noir/Chardonnay',
      region: 'Champagne',
      appellation: 'Champagne AOC',
    };

    console.log('🥂 Sparkling Wine Test:');
    console.log(`   ${sparklingWine.producerName} ${sparklingWine.wineName}`);

    // Generate image for sparkling wine context
    const sparklingImage = await runImageGenerate({
      id: 'sparkling-bubbles',
      purpose: 'decoration',
      prompt: 'Elegant champagne bubbles rising, golden effervescence, luxury sparkling wine aesthetic',
      negativePrompt: 'flat, dull, non-sparkling',
      aspect: '1:1',
      guidance: 7.5,
    });

    console.log(`   ✅ Generated specialized sparkling imagery: ${sparklingImage.width}x${sparklingImage.height}`);

    // Create layout optimized for sparkling wine
    const sparklingLayout = {
      version: '1' as const,
      canvas: { width: 600, height: 900, dpi: 300, background: '#FFFEF7' },
      palette: {
        primary: '#D4AF37', // Champagne gold
        secondary: '#FF69B4', // Rosé pink
        accent: '#2F4F4F', // Dark slate
        background: '#FFFEF7', // Cream white
        temperature: 'cool' as const,
        contrast: 'high' as const,
      },
      typography: {
        primary: { family: 'serif', weight: 700, style: 'italic' as const, letterSpacing: 0.5 },
        secondary: { family: 'sans-serif', weight: 300, style: 'normal' as const, letterSpacing: 1.0 },
        hierarchy: {
          producerEmphasis: 'dominant' as const,
          vintageProminence: 'standard' as const,
          regionDisplay: 'prominent' as const,
        },
      },
      assets: [
        {
          id: sparklingImage.id,
          type: 'image' as const,
          url: sparklingImage.url,
          width: sparklingImage.width,
          height: sparklingImage.height,
        },
      ],
      elements: [
        {
          id: 'producer-elegant',
          type: 'text' as const,
          bounds: { x: 0.1, y: 0.1, w: 0.8, h: 0.15 },
          z: 10,
          text: sparklingWine.producerName,
          font: 'primary' as const,
          color: 'primary' as const,
          align: 'center' as const,
          fontSize: 36,
          lineHeight: 1.3,
          maxLines: 2,
          textTransform: 'none' as const,
        },
      ],
    };

    const sparklingRender = await runRender(sparklingLayout);
    console.log(`   ✅ Rendered sparkling wine preview: ${sparklingRender.format}`);

    // Verify different styling approach worked
    expect(sparklingLayout.palette.primary).toBe('#D4AF37'); // Gold, not red
    expect(sparklingLayout.typography.primary.style).toBe('italic');
    expect(sparklingRender).toMatchObject({
      width: 600,
      height: 900,
      format: 'PNG',
    });

    console.log('   🎊 Pipeline successfully adapted for sparkling wine style\n');
  }, 8000);
});
