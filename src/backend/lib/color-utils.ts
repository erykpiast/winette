import type { LabelDSL } from '#backend/types/label-generation.js';
import { logger } from './logger.js';

/**
 * Converts hex color to RGB values
 * @param hex - Hex color string (with or without #)
 * @returns RGB array [r, g, b]
 */
export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length !== 6 || !/^[0-9A-Fa-f]{6}$/.test(clean)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
}

/**
 * Validates hex color format
 * @param hex - Color string to validate
 * @returns True if valid hex color
 */
export function isValidHexColor(hex: string): boolean {
  return /^#?[0-9A-Fa-f]{6}$/.test(hex);
}

/**
 * Normalizes hex color format
 * @param hex - Raw color string
 * @returns Normalized hex color with #
 */
export function normalizeHexColor(hex: string): string {
  let clean = hex.replace('#', '').toUpperCase();

  // Expand 3-digit hex to 6-digit
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }

  if (clean.length !== 6 || !/^[0-9A-F]{6}$/.test(clean)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  return `#${clean}`;
}

/**
 * Calculates perceptual color distance using Delta E (CIE76)
 * This is more accurate than RGB Euclidean distance for human color perception
 * @param hex1 - First color
 * @param hex2 - Second color
 * @returns Delta E distance (0 = identical, >3 = noticeable difference)
 */
export function colorDistanceDeltaE(hex1: string, hex2: string): number {
  try {
    const [r1, g1, b1] = hexToRgb(hex1);
    const [r2, g2, b2] = hexToRgb(hex2);

    // Convert RGB to LAB color space for perceptual distance
    const toLab = (r: number, g: number, b: number) => {
      // Normalize RGB values to 0-1
      r = r / 255;
      g = g / 255;
      b = b / 255;

      // Apply gamma correction
      const gammaCorrect = (c: number) => (c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92);

      r = gammaCorrect(r);
      g = gammaCorrect(g);
      b = gammaCorrect(b);

      // Convert to XYZ color space
      const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) * 100;
      const y = (r * 0.2126729 + g * 0.7151522 + b * 0.072175) * 100;
      const z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) * 100;

      // Convert XYZ to LAB (D65 illuminant)
      const xn = 95.047;
      const yn = 100.0;
      const zn = 108.883;

      const fx = x / xn > 0.008856 ? Math.cbrt(x / xn) : (7.787 * x) / xn + 16 / 116;
      const fy = y / yn > 0.008856 ? Math.cbrt(y / yn) : (7.787 * y) / yn + 16 / 116;
      const fz = z / zn > 0.008856 ? Math.cbrt(z / zn) : (7.787 * z) / zn + 16 / 116;

      const l = 116 * fy - 16;
      const a = 500 * (fx - fy);
      const bValue = 200 * (fy - fz);

      return { l, a, b: bValue };
    };

    const lab1 = toLab(r1, g1, b1);
    const lab2 = toLab(r2, g2, b2);

    // Calculate Delta E (CIE76)
    return Math.sqrt((lab2.l - lab1.l) ** 2 + (lab2.a - lab1.a) ** 2 + (lab2.b - lab1.b) ** 2);
  } catch (error) {
    // Fallback to simple RGB distance if LAB conversion fails
    logger.warn('LAB color conversion failed, using RGB distance', {
      hex1,
      hex2,
      error: error instanceof Error ? error.message : String(error),
    });
    const [r1, g1, b1] = hexToRgb(hex1);
    const [r2, g2, b2] = hexToRgb(hex2);
    return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
  }
}

/**
 * Finds the closest palette role for a given hex color
 * Uses perceptual color distance for better matching
 * @param hexColor - Target hex color
 * @param palette - DSL palette with role colors
 * @returns Closest palette role
 */
export function hexToClosestPaletteRole(
  hexColor: string,
  palette: LabelDSL['palette'],
): 'primary' | 'secondary' | 'accent' | 'background' {
  try {
    const normalizedHex = normalizeHexColor(hexColor);
    const paletteEntries: Array<['primary' | 'secondary' | 'accent' | 'background', string]> = [
      ['primary', palette.primary],
      ['secondary', palette.secondary],
      ['accent', palette.accent],
      ['background', palette.background],
    ];

    let closestRole: 'primary' | 'secondary' | 'accent' | 'background' = 'primary';
    let minDistance = Infinity;

    for (const [role, paletteHex] of paletteEntries) {
      const distance = colorDistanceDeltaE(normalizedHex, paletteHex);
      if (distance < minDistance) {
        minDistance = distance;
        closestRole = role;
      }
    }

    logger.debug('Color mapped to palette role', {
      inputColor: hexColor,
      normalizedColor: normalizedHex,
      closestRole,
      distance: minDistance,
    });

    return closestRole;
  } catch (error) {
    logger.warn('Invalid hex color, defaulting to primary', {
      hexColor,
      error: error instanceof Error ? error.message : String(error),
    });
    return 'primary';
  }
}
