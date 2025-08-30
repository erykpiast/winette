// Robust JSON extraction utilities for LLM responses
// Handles common issues with malformed JSON from language models

import { logger } from './logger.js';

/**
 * Extracts JSON from text that may contain mixed content or formatting issues
 * common in LLM responses. Attempts multiple strategies progressively.
 *
 * @param text - Raw text from LLM that should contain JSON
 * @returns Parsed JSON object
 * @throws Error if no valid JSON can be extracted
 */
export function extractJSON(text: string): unknown {
  // Strategy 1: Try direct parse first (fastest path)
  try {
    return JSON.parse(text);
  } catch {
    // Continue to more sophisticated strategies
  }

  // Strategy 2: Extract JSON from markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```/);
  if (codeBlockMatch?.[1]) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch {
      logger.debug('Failed to parse JSON from code block', {
        codeBlock: codeBlockMatch[1].substring(0, 100),
      });
    }
  }

  // Strategy 3: Find raw JSON object/array in mixed content
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch?.[1]) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {
      logger.debug('Failed to parse extracted JSON pattern', {
        extracted: jsonMatch[1].substring(0, 100),
      });
    }
  }

  // Strategy 4: Clean common formatting issues and try again
  const cleaned = cleanJSONText(text);
  if (cleaned !== text) {
    try {
      return JSON.parse(cleaned);
    } catch {
      logger.debug('Failed to parse cleaned JSON', {
        cleaned: cleaned.substring(0, 100),
      });
    }
  }

  // Strategy 5: Try to fix common JSON syntax issues
  const fixed = fixCommonJSONIssues(cleaned || text);
  if (fixed !== (cleaned || text)) {
    try {
      return JSON.parse(fixed);
    } catch {
      logger.debug('Failed to parse syntax-fixed JSON', {
        fixed: fixed.substring(0, 100),
      });
    }
  }

  // All strategies failed
  throw new Error(`Failed to extract valid JSON from text: ${text.substring(0, 200)}...`);
}

/**
 * Cleans common non-JSON content from text
 */
function cleanJSONText(text: string): string {
  return text
    .replace(/^[^{[]*/, '') // Remove leading non-JSON characters
    .replace(/[^}\]]*$/, '') // Remove trailing non-JSON characters
    .trim();
}

/**
 * Fixes common JSON syntax issues that LLMs sometimes produce
 */
function fixCommonJSONIssues(text: string): string {
  return (
    text
      // Remove BOM and zero-width characters first
      .replace(/^\uFEFF/, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      // Remove trailing commas before closing braces/brackets
      .replace(/,(\s*[}\]])/g, '$1')
      // Fix unquoted object keys (improved pattern to avoid conflicts)
      .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
      // Fix single quotes to double quotes (but not in string values)
      .replace(/(?<!\\)'/g, '"')
      // Fix undefined/null literals
      .replace(/:\s*undefined/g, ': null')
      // Fix NaN and Infinity
      .replace(/:\s*NaN/g, ': null')
      .replace(/:\s*Infinity/g, ': 999999999')
      .replace(/:\s*-Infinity/g, ': -999999999')
      // Remove JavaScript comments
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Fix common typos in boolean/null values
      .replace(/:\s*True\b/g, ': true')
      .replace(/:\s*False\b/g, ': false')
      .replace(/:\s*None\b/g, ': null')
      .replace(/:\s*NULL\b/g, ': null')
      // Remove excess whitespace while preserving structure
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Validates that extracted JSON matches expected structure
 * This is a basic structural validator - use Zod for schema validation
 *
 * @param json - Parsed JSON object
 * @param expectedKeys - Array of keys that should exist at the root level
 * @returns true if structure looks valid
 */
export function validateJSONStructure(json: unknown, expectedKeys: string[] = []): boolean {
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return false;
  }

  const obj = json as Record<string, unknown>;

  // Check that expected keys exist
  for (const key of expectedKeys) {
    if (!(key in obj)) {
      return false;
    }
  }

  return true;
}

/**
 * Extracts and validates JSON in one step
 * Combines extraction with basic structure validation
 *
 * @param text - Raw text from LLM
 * @param expectedKeys - Keys that should exist in the JSON object
 * @returns Validated JSON object
 * @throws Error if extraction or validation fails
 */
export function extractAndValidateJSON(text: string, expectedKeys: string[] = []): unknown {
  const json = extractJSON(text);

  if (!validateJSONStructure(json, expectedKeys)) {
    throw new Error(`Extracted JSON does not have expected structure. Expected keys: ${expectedKeys.join(', ')}`);
  }

  return json;
}

/**
 * Type-safe JSON extraction with fallback
 * Useful for handling partial responses or degraded behavior
 *
 * @param text - Raw text from LLM
 * @param fallback - Fallback value if extraction fails
 * @returns Parsed JSON or fallback value
 */
export function extractJSONWithFallback<T>(text: string, fallback: T): T | unknown {
  try {
    return extractJSON(text);
  } catch (error) {
    logger.warn('JSON extraction failed, using fallback', {
      error: error instanceof Error ? error.message : String(error),
      fallback: typeof fallback,
    });
    return fallback;
  }
}
