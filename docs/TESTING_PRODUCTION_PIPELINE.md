# Testing the Production Pipeline Locally

This guide explains how to test the Winette LangChain pipeline with real production AI models while mocking expensive image generation.

## Overview

The test configuration uses:

- **Real Claude 3.5 Haiku** for all text generation (design scheme, prompts, layout)
- **Real GPT-5 Vision** for label refinement analysis
- **Mock DALL-E 3** for image generation (to avoid costs during testing)

## Prerequisites

1. **API Keys**: You need the following environment variables set:

   ```bash
   ANTHROPIC_API_KEY=your_anthropic_key
   OPENAI_API_KEY=your_openai_key
   ```

2. **Optional LangSmith Tracing** (recommended for debugging):
   ```bash
   LANGSMITH_API_KEY=your_langsmith_key
   LANGSMITH_PROJECT=winette
   ```

## Running the Test

### Quick Start

```bash
# Using the convenience script
./scripts/test-pipeline-production.sh
```

### Direct Execution

```bash
# Run directly with npx
npx tsx scripts/test-langchain-pipeline-with-tracing.ts
```

### Custom Label Style

```bash
# Set label style: classic, modern, elegant, or funky
LABEL_STYLE=modern ./scripts/test-pipeline-production.sh
```

## What the Test Does

1. **Design Scheme Generation** (Claude 3.5)

   - Creates color palette, typography, and canvas specifications

2. **Image Prompt Generation** (Claude 3.5)

   - Generates detailed DALL-E prompts for background, foreground, and decorative elements

3. **Image Generation** (Mocked)

   - Returns placeholder URLs instead of calling DALL-E 3
   - Format: `https://example.com/generated/{id}.png`

4. **Detailed Layout** (Claude 3.5)

   - Creates precise element positioning and styling

5. **Rendering** (Mock)

   - Simulates the rendering process

6. **AI Refinement** (GPT-5 Vision)
   - Analyzes the rendered preview
   - Suggests improvements
   - Returns confidence score

## Monitoring with LangSmith

If you have LangSmith configured, you can view detailed traces:

1. Go to https://smith.langchain.com/
2. Select your project (default: "winette")
3. View traces for each pipeline run
4. Analyze token usage, latency, and chain execution

## Cost Considerations

With this test configuration:

- **Claude 3.5 Haiku**: ~$0.001-0.002 per test run
- **GPT-5 Vision**: ~$0.02-0.03 per refinement analysis
- **DALL-E 3**: $0 (mocked)

Total estimated cost per test: **~$0.03**

## Switching to Full Production Mode

To test with real DALL-E 3 image generation:

```typescript
// In test-langchain-pipeline-with-tracing.ts, comment out line 82:
// configurePipeline({ imageAdapter: new MockImageAdapter() });
```

**Warning**: This will enable real DALL-E 3 calls at ~$0.08 per image (3 images per test = ~$0.24)

## Troubleshooting

### Missing API Keys

```
❌ Missing required environment variables:
   - ANTHROPIC_API_KEY
   - OPENAI_API_KEY
```

**Solution**: Set the required environment variables in your `.env` file

### LangSmith Tracing Not Working

```
⚠️  Warning: LANGSMITH_API_KEY not set (tracing will be disabled)
```

**Solution**: This is optional. Set `LANGSMITH_API_KEY` if you want tracing.

### API Rate Limits

If you encounter rate limit errors, the pipeline includes automatic retry logic with exponential backoff.

## Sample Output

A successful test run will show:

```
🚀 Starting LangChain pipeline test with LangSmith tracing...
✅ Production configuration successful
📐 Step 1: Generating design scheme with LLM...
✅ Design scheme generated
🎨 Step 2: Generating image prompts with LLM...
✅ Image prompts generated: 3
🖼️ Step 3: Generating images (mock adapter)...
✅ Generated background: https://example.com/generated/background.png
📋 Step 4: Creating detailed layout with LLM...
✅ Detailed layout generated
🎨 Step 5: Rendering preview...
✅ Render completed
🔍 Step 6: AI refinement analysis with GPT-5 Vision...
✅ Refinement analysis completed:
   Operations: 2
   Reasoning: Typography hierarchy needs adjustment...
   Confidence: 85.0%
🎉 Pipeline completed successfully!
```
