import type { Element } from '#backend/types/label-generation.js';

/**
 * Formats element information for use in LLM prompts
 * Provides consistent element ID display across all adapters
 *
 * @param elements - Array of DSL elements
 * @returns Formatted string with element IDs and descriptions
 */
export function formatElementIdsForPrompt(elements: Element[]): string {
  return elements
    .map((el) => {
      const description = el.type === 'text' ? `: "${el.text}"` : '';
      return `- "${el.id}" (${el.type}${description})`;
    })
    .join('\n');
}

/**
 * Creates a simple comma-separated list of element IDs
 * Used for simpler prompt formats that don't need descriptions
 *
 * @param elements - Array of DSL elements
 * @returns Comma-separated element ID list
 */
export function formatElementIdsList(elements: Element[]): string {
  return elements.map((el) => el.id).join(', ');
}

/**
 * Creates a numbered list of elements for prompts
 * Useful for prompts that need indexed references
 *
 * @param elements - Array of DSL elements
 * @returns Numbered list of elements
 */
export function formatElementIdsNumbered(elements: Element[]): string {
  return elements
    .map((el, index) => {
      const description = el.type === 'text' ? `: "${el.text}"` : '';
      return `${index + 1}. "${el.id}" (${el.type}${description})`;
    })
    .join('\n');
}
