#!/usr/bin/env tsx

/**
 * Debug script for DALL-E 3 API request parameters
 * Helps identify what's causing the 400 error
 */

// Mock the typical request that would be sent to DALL-E 3
const mockImageInput = {
  id: 'debug-test',
  purpose: 'background' as 'background' | 'decoration' | 'foreground',
  prompt: 'Elegant vineyard landscape with warm golden lighting',
  aspect: '3:2',
  negativePrompt: 'harsh lighting, artificial',
  guidance: 7.5,
};

function parseAspectRatio(aspect: string): [number, number] {
  const ratios: Record<string, [number, number]> = {
    '1:1': [1024, 1024],
    '3:2': [1792, 1024],
    '16:9': [1792, 1024], // Same as 3:2 in DALL-E
    '2:3': [1024, 1792],
    // Approximations for unsupported ratios
    '4:3': [1792, 1024], // Approximated to 16:9
    '3:4': [1024, 1792], // Approximated to 2:3
  };

  const result = ratios[aspect];
  if (!result) {
    console.log(`⚠️  Unknown aspect ratio: ${aspect}, defaulting to square`);
    return [1024, 1024];
  }

  // Log when approximation occurs
  if (aspect === '4:3' || aspect === '3:4') {
    console.log(`ℹ️  Aspect ratio approximated for DALL-E 3:`, {
      requested: aspect,
      actual: result[0] > result[1] ? '16:9' : '2:3',
      note: 'DALL-E 3 only supports 1:1, 16:9 (1792x1024), and 2:3 (1024x1792)',
    });
  }

  return result;
}

function mapToValidSize(width: number, height: number): '1024x1024' | '1792x1024' | '1024x1792' {
  if (width === height) {
    return '1024x1024';
  }
  if (width > height) {
    return '1792x1024';
  }
  return '1024x1792';
}

function enhancePromptForWineLabel(input: typeof mockImageInput): string {
  const contextualEnhancements = {
    background: 'Professional wine photography style, suitable for elegant wine label background',
    foreground: 'Wine label foreground element, crisp and detailed',
    decoration: 'Decorative wine label element, elegant and sophisticated',
  };

  const enhancement = contextualEnhancements[input.purpose] || '';
  let enhancedPrompt = `${input.prompt}. ${enhancement}`;

  if (input.negativePrompt) {
    enhancedPrompt += `. Avoid: ${input.negativePrompt}`;
  }

  // Add wine label context if not already present
  if (!input.prompt.toLowerCase().includes('wine') && !input.prompt.toLowerCase().includes('label')) {
    enhancedPrompt += '. Wine industry aesthetic, premium quality.';
  }

  return enhancedPrompt;
}

console.log('🔍 DALL-E 3 Request Debug');
console.log('========================');

const [width, height] = parseAspectRatio(mockImageInput.aspect);
const enhancedPrompt = enhancePromptForWineLabel(mockImageInput);
const size = mapToValidSize(width, height);

const requestBody = {
  model: 'dall-e-3',
  prompt: enhancedPrompt,
  n: 1,
  size: size,
  quality: 'hd',
  style: mockImageInput.purpose === 'decoration' ? 'natural' : 'vivid',
};

console.log('📝 Request Body:');
console.log(JSON.stringify(requestBody, null, 2));

console.log('\n🔍 Parameter Analysis:');
console.log(`✅ Model: "${requestBody.model}" (should be "dall-e-3")`);
console.log(`✅ Size: "${requestBody.size}" (valid: 1024x1024, 1792x1024, 1024x1792)`);
console.log(`✅ Quality: "${requestBody.quality}" (valid: "standard", "hd")`);
console.log(`✅ Style: "${requestBody.style}" (valid: "vivid", "natural")`);
console.log(`✅ N: ${requestBody.n} (must be 1 for DALL-E 3)`);
console.log(`📏 Prompt length: ${requestBody.prompt.length} characters`);

console.log('\n📝 Enhanced Prompt:');
console.log(`"${requestBody.prompt}"`);

// Check for common issues
console.log('\n⚠️  Potential Issues:');

if (requestBody.prompt.length > 4000) {
  console.log('❌ Prompt too long (>4000 characters)');
} else {
  console.log('✅ Prompt length OK');
}

// Check for problematic content
const problematicWords = ['nsfw', 'nude', 'explicit', 'violence', 'hate'];
const hasProblematicContent = problematicWords.some((word) => requestBody.prompt.toLowerCase().includes(word));

if (hasProblematicContent) {
  console.log('❌ Prompt may contain policy-violating content');
} else {
  console.log('✅ No obvious policy violations');
}

console.log('\n💡 Common DALL-E 3 400 Error Causes:');
console.log('1. Missing or invalid API key');
console.log('2. Prompt violates content policy');
console.log('3. Prompt too long (>4000 chars)');
console.log('4. Invalid size parameter');
console.log('5. Invalid model name');
console.log('6. Rate limit exceeded (but that would be 429)');
