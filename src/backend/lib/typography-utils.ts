import { logger } from './logger.js';

/**
 * Font size multiplier configuration
 */
export interface FontSizeMultipliers {
  larger: number;
  smaller: number;
  normal: number;
  xLarge: number;
  xxLarge: number;
  xSmall: number;
  xxSmall: number;
}

/**
 * Default font size multipliers based on CSS relative size keywords
 */
export const DEFAULT_FONT_SIZE_MULTIPLIERS: FontSizeMultipliers = {
  larger: 1.2,
  smaller: 0.8,
  normal: 1.0,
  xLarge: 1.5,
  xxLarge: 2.0,
  xSmall: 0.625,
  xxSmall: 0.5,
};

/**
 * Font size constraints
 */
export const FONT_SIZE_CONSTRAINTS = {
  MIN: 1,
  MAX: 200,
} as const;

/**
 * Parses font size from various input formats and returns a numeric pixel value
 *
 * Supported formats:
 * - Numbers: 16, 20.5
 * - Pixel values: "16px", "20"
 * - Percentages: "120%", "80%"
 * - Relative keywords: "larger", "smaller", "normal"
 * - CSS size keywords: "x-large", "xx-small", etc.
 *
 * @param fontSizeHint - Font size input (string or number)
 * @param currentSize - Current font size for relative calculations
 * @param multipliers - Custom multiplier configuration
 * @returns Computed font size (minimum 1px, maximum 200px)
 */
export function parseFontSize(
  fontSizeHint: string | number,
  currentSize: number,
  multipliers: FontSizeMultipliers = DEFAULT_FONT_SIZE_MULTIPLIERS,
): number {
  // Handle numeric input directly
  if (typeof fontSizeHint === 'number') {
    const size = Math.round(fontSizeHint);
    return Math.max(FONT_SIZE_CONSTRAINTS.MIN, Math.min(FONT_SIZE_CONSTRAINTS.MAX, size));
  }

  const hint = fontSizeHint.toLowerCase().trim();

  // Handle empty string
  if (!hint) {
    return currentSize;
  }

  // Check for pixel values (with or without 'px' suffix)
  const pixelMatch = hint.match(/^(\d+(?:\.\d+)?)(?:px)?$/);
  if (pixelMatch?.[1]) {
    const size = Math.round(parseFloat(pixelMatch[1]));
    return Math.max(FONT_SIZE_CONSTRAINTS.MIN, Math.min(FONT_SIZE_CONSTRAINTS.MAX, size));
  }

  // Check for percentage values
  const percentMatch = hint.match(/^(\d+(?:\.\d+)?)%$/);
  if (percentMatch?.[1]) {
    const percent = parseFloat(percentMatch[1]) / 100;
    const size = Math.round(currentSize * percent);
    return Math.max(FONT_SIZE_CONSTRAINTS.MIN, Math.min(FONT_SIZE_CONSTRAINTS.MAX, size));
  }

  // Handle relative size keywords
  const relativeMultipliers: Record<string, number> = {
    'xx-small': multipliers.xxSmall,
    'x-small': multipliers.xSmall,
    small: multipliers.smaller,
    smaller: multipliers.smaller,
    medium: multipliers.normal,
    normal: multipliers.normal,
    large: multipliers.larger,
    larger: multipliers.larger,
    big: multipliers.larger,
    bigger: multipliers.larger,
    'x-large': multipliers.xLarge,
    'xx-large': multipliers.xxLarge,
  };

  const multiplier = relativeMultipliers[hint];
  if (multiplier !== undefined) {
    const size = Math.round(currentSize * multiplier);
    const constrainedSize = Math.max(FONT_SIZE_CONSTRAINTS.MIN, Math.min(FONT_SIZE_CONSTRAINTS.MAX, size));

    logger.debug('Parsed font size from hint', {
      hint,
      currentSize,
      multiplier,
      computedSize: size,
      constrainedSize,
    });

    return constrainedSize;
  }

  // Try to parse as a number (fallback for edge cases)
  const parsed = parseFloat(hint);
  if (!Number.isNaN(parsed) && parsed > 0) {
    const size = Math.round(parsed);
    return Math.max(FONT_SIZE_CONSTRAINTS.MIN, Math.min(FONT_SIZE_CONSTRAINTS.MAX, size));
  }

  // Fallback to current size if hint is unrecognized
  logger.warn('Unrecognized font size hint, using current size', {
    hint: fontSizeHint,
    currentSize,
  });
  return currentSize;
}
