/**
 * LangSmith Tracing Configuration
 *
 * Initializes LangSmith tracing for observability of LangChain operations.
 * Environment variables are automatically picked up by LangChain when present.
 */

import { logger } from './logger.js';

/**
 * Initialize LangSmith tracing based on environment variables
 *
 * Required environment variables:
 * - LANGSMITH_TRACING: Set to "true" to enable tracing
 * - LANGSMITH_API_KEY: Your LangSmith API key
 * - LANGSMITH_PROJECT: Project name in LangSmith (e.g., "winette")
 * - LANGSMITH_ENDPOINT: LangSmith endpoint URL (optional, defaults to https://api.smith.langchain.com)
 */
export function initializeLangSmithTracing(): boolean {
  const tracingEnabled = process.env.LANGSMITH_TRACING === 'true';
  const apiKey = process.env.LANGSMITH_API_KEY;
  const project = process.env.LANGSMITH_PROJECT;
  const endpoint = process.env.LANGSMITH_ENDPOINT;

  if (!tracingEnabled) {
    logger.debug('LangSmith tracing disabled (LANGSMITH_TRACING not set to "true")');
    return false;
  }

  if (!apiKey) {
    logger.warn('LangSmith tracing enabled but LANGSMITH_API_KEY not found');
    return false;
  }

  if (!project) {
    logger.warn('LangSmith tracing enabled but LANGSMITH_PROJECT not found');
    return false;
  }

  // LangChain automatically picks up these environment variables
  // We just need to validate they're present
  logger.info('LangSmith tracing initialized', {
    project,
    endpoint: endpoint || 'https://api.smith.langchain.com',
    hasApiKey: !!apiKey,
    apiKeyPrefix: apiKey.substring(0, 8),
  });

  return true;
}

/**
 * Check if LangSmith tracing is properly configured
 */
export function isTracingConfigured(): boolean {
  return process.env.LANGSMITH_TRACING === 'true' && !!process.env.LANGSMITH_API_KEY && !!process.env.LANGSMITH_PROJECT;
}

/**
 * Get tracing configuration summary for debugging
 */
export function getTracingConfig() {
  return {
    enabled: process.env.LANGSMITH_TRACING === 'true',
    hasApiKey: !!process.env.LANGSMITH_API_KEY,
    project: process.env.LANGSMITH_PROJECT || 'not-set',
    endpoint: process.env.LANGSMITH_ENDPOINT || 'default',
  };
}
