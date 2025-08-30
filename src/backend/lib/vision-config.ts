// Centralized vision analysis configuration

/**
 * Vision API configuration for wine label refinement analysis
 */
export interface VisionConfig {
  // API Configuration
  baseUrl: string;
  model: string;
  timeoutMs: number;

  // Request Parameters
  maxTokens: number;
  temperature: number;
  imageDetail: 'low' | 'high' | 'auto';

  // Response Processing
  maxOperations: number;
  defaultConfidence: number;

  // Error Handling
  retryConfig: {
    maxAttempts: number;
    baseDelay: number;
  };
}

/**
 * Default vision configuration for production use
 */
export const DEFAULT_VISION_CONFIG: VisionConfig = {
  // OpenAI Vision API settings
  baseUrl: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o',
  timeoutMs: 30000, // 30 seconds

  // Request parameters optimized for wine label analysis
  maxTokens: 1000,
  temperature: 0.3, // Lower temperature for more consistent analysis
  imageDetail: 'high', // High detail for better label analysis

  // Response processing limits
  maxOperations: 5, // Limit refinement operations for performance
  defaultConfidence: 0.7, // Default confidence when not specified

  // Retry configuration for network issues
  retryConfig: {
    maxAttempts: 3,
    baseDelay: 1000, // 1 second base delay
  },
};

/**
 * Vision analysis prompt templates
 */
export const VISION_PROMPTS = {
  /**
   * System prompt for vision analysis context
   */
  SYSTEM_CONTEXT: `You are an expert wine label designer analyzing label designs for professional wineries.
Focus on typography, color harmony, visual balance, industry standards, and aesthetic appeal.
Provide specific, actionable feedback in the requested JSON format.`,

  /**
   * Analysis instruction template
   */
  ANALYSIS_INSTRUCTIONS: `Evaluate the design for:
1. Typography hierarchy and readability
2. Color harmony and brand consistency  
3. Element positioning and visual balance
4. Industry standards compliance
5. Overall aesthetic appeal

Provide your analysis as JSON with this structure:
{
  "operations": [
    {
      "type": "update_element",
      "elementId": "element-id", 
      "property": "fontSize|color|bounds|text",
      "value": "new-value",
      "reasoning": "why this change improves the design"
    }
  ],
  "reasoning": "overall analysis summary",
  "confidence": 0.8
}

Only suggest changes that would meaningfully improve the design. Return empty operations array if the design is already well-balanced.`,
} as const;

/**
 * Vision error messages for consistent user feedback
 */
export const VISION_ERROR_MESSAGES = {
  TIMEOUT: 'Vision analysis timed out - please try again',
  INVALID_RESPONSE: 'Vision analysis returned invalid structure',
  ANALYSIS_FAILED: 'Vision analysis failed - please try again',
  SERVICE_UNAVAILABLE: 'Vision analysis temporarily unavailable',
  RATE_LIMIT: 'Service is busy, please try again in a moment',
  AUTH_ERROR: 'Authentication issue - please contact support',
  INVALID_IMAGE: 'Invalid image or parameters - please check your label design',
  PARSING_ERROR: 'Vision analysis completed with parsing issues',
} as const;

/**
 * Get vision configuration with environment overrides
 */
export function getVisionConfig(): VisionConfig {
  return {
    ...DEFAULT_VISION_CONFIG,
    // Allow environment overrides for testing/development
    model: process.env.VISION_MODEL || DEFAULT_VISION_CONFIG.model,
    timeoutMs: process.env.VISION_TIMEOUT_MS
      ? parseInt(process.env.VISION_TIMEOUT_MS, 10)
      : DEFAULT_VISION_CONFIG.timeoutMs,
    temperature: process.env.VISION_TEMPERATURE
      ? parseFloat(process.env.VISION_TEMPERATURE)
      : DEFAULT_VISION_CONFIG.temperature,
  };
}

/**
 * Validate vision configuration
 */
export function validateVisionConfig(config: VisionConfig): void {
  if (!config.baseUrl) {
    throw new Error('Vision config: baseUrl is required');
  }

  if (!config.model) {
    throw new Error('Vision config: model is required');
  }

  if (config.timeoutMs <= 0) {
    throw new Error('Vision config: timeoutMs must be positive');
  }

  if (config.temperature < 0 || config.temperature > 2) {
    throw new Error('Vision config: temperature must be between 0 and 2');
  }

  if (config.maxTokens <= 0) {
    throw new Error('Vision config: maxTokens must be positive');
  }
}
