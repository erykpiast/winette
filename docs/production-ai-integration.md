# Production AI Integration Guide

This guide covers the integration of real AI models (DALL-E 3 and GPT-5) in the Winette production environment.

## Overview

The production configuration replaces mock adapters with real AI services:

- **Image Generation**: DALL-E 3 for creating wine label images
- **Vision Refinement**: GPT-5 for analyzing and suggesting label improvements

## Environment Configuration

### Required Environment Variables

Add these to your Vercel project environment variables:

```bash
# Required for production AI integration
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key

# Production environment detection
NODE_ENV=production
```

### Vercel Deployment

1. **Configure Environment Variables**:

   ```bash
   # In Vercel dashboard or CLI
   vercel env add ANTHROPIC_API_KEY
   vercel env add OPENAI_API_KEY
   ```

2. **Deploy**:

   ```bash
   vercel --prod
   ```

## AI Service Integration

### DALL-E 3 Image Generation

**Features**:

- HD quality image generation (1024x1024, 1792x1024, 1024x1792)
- Wine industry context enhancement
- Negative prompt support
- Error classification and retry logic

**Pricing**: ~$0.04-0.08 per image (depending on size)

**Rate Limits**:

- Tier 1: 5 requests/minute
- Tier 2+: Higher limits available

### GPT-5 Vision Analysis

**Features**:

- High-detail image analysis
- Structured JSON response parsing
- Wine label specific evaluation criteria
- Fallback error handling

**Pricing**: ~$0.01-0.02 per analysis

**Rate Limits**:

- Tier 1: 10 requests/minute
- Tier 2+: Higher limits available

## Testing Production Integration

### 1. Configuration Test

```bash
pnpm tsx scripts/test-production-config.ts
```

### 2. End-to-End API Test

Test the production endpoint:

```bash
curl -X POST https://your-app.vercel.app/api/test-langchain-pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "step": "image-generate",
    "input": {
      "id": "test-image",
      "purpose": "background",
      "prompt": "Elegant vineyard at sunset",
      "aspect": "3:2"
    }
  }'
```

### 3. Integration Test Suite

Enable integration tests with real APIs:

```bash
# Run with real LLMs (requires API keys)
INTEGRATION_TESTS=true pnpm test src/backend/tests/langchain-integration.test.ts
```

## Monitoring and Observability

### NewRelic Integration

Production deployment includes comprehensive monitoring:

- **Performance**: API response times and throughput
- **Errors**: AI service failures and retry attempts  
- **Usage**: Token consumption and cost tracking

### Custom Logging

All AI operations include structured logging:

```typescript
logger.info('DALL-E 3 image generated', {
  promptId: 'vineyard-bg',
  imageUrl: 'https://...',
  duration: 3.2,
  cost: 0.04
});
```

## Cost Optimization

### Image Generation

- **Cache Results**: Generated images are cached in assets
- **Batch Requests**: Generate multiple images per label design
- **Size Optimization**: Use appropriate aspect ratios

### Vision Analysis

- **Conditional Analysis**: Only run refinement when explicitly requested
- **Structured Prompts**: Reduce token usage with focused prompts
- **Fallback Handling**: Graceful degradation on API failures

## Error Handling

### Classification System

All AI service errors are classified for proper retry behavior:

- **Network Errors** (429, 5xx): Retryable with exponential backoff
- **Authentication Errors** (401, 403): Non-retryable, requires key fix
- **Validation Errors**: Non-retryable, requires prompt adjustment
- **Model Overload** (503): Retryable with longer delays

### Fallback Strategies

- **Image Generation**: Falls back to placeholder images
- **Vision Analysis**: Returns no-op operations with reasoning
- **Pipeline Continuity**: Never breaks the complete workflow

## Production Checklist

### Pre-Deployment

- [ ] API keys configured in Vercel
- [ ] Environment variables validated
- [ ] Integration tests passing
- [ ] Cost limits configured
- [ ] Monitoring alerts configured

### Post-Deployment

- [ ] Test endpoint responding correctly
- [ ] Real image generation working
- [ ] Vision analysis returning results
- [ ] Logs showing successful API calls
- [ ] NewRelic metrics being collected

### Monitoring

- [ ] Set up cost alerts (recommended: $50/month)
- [ ] Monitor rate limit usage
- [ ] Track success/failure rates
- [ ] Review generated content quality

## Troubleshooting

### Common Issues

**"Missing required environment variables"**:

- Ensure ANTHROPIC_API_KEY and OPENAI_API_KEY are set in Vercel
- Check environment variable names (case-sensitive)

**"DALL-E 3 API error: 429"**:

- Rate limiting - implement backoff or upgrade tier
- Check API usage in OpenAI dashboard

**"GPT-5 response missing analysis content"**:

- Model overload - retry with exponential backoff
- Check prompt length and image size

### Debug Commands

```bash
# Test configuration locally
pnpm tsx scripts/test-production-config.ts

# Run integration tests
INTEGRATION_TESTS=true pnpm test src/backend/tests/langchain-integration.test.ts

# Check API endpoint
curl -v https://your-app.vercel.app/api/test-langchain-pipeline
```

## Next Steps

1. **Deploy to Vercel** with API keys configured
2. **Test the endpoint** `/api/test-langchain-pipeline`  
3. **Monitor usage** and costs through Vercel and AI provider dashboards
4. **Scale up** API rate limits as usage grows
5. **Optimize prompts** based on real-world usage patterns
