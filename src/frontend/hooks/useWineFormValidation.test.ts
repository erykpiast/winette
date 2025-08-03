import { renderHook } from '@testing-library/react';
import type { FieldError } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { useWineFormValidation } from './useWineFormValidation';

describe('useWineFormValidation', () => {
  it('returns validation rules and utilities', () => {
    const { result } = renderHook(() => useWineFormValidation());

    expect(result.current.validationRules).toHaveProperty('region');
    expect(result.current.validationRules).toHaveProperty('wineVariety');
    expect(result.current.validationRules).toHaveProperty('producerName');
    expect(typeof result.current.getErrorMessage).toBe('function');
    expect(typeof result.current.hasError).toBe('function');
    expect(typeof result.current.validateField).toBe('function');
    expect(result.current.patterns).toBeDefined();
  });

  it('validates region field correctly', () => {
    const { result } = renderHook(() => useWineFormValidation());

    const regionValidation = result.current.validateField('region', '');
    expect(typeof regionValidation).toBe('string');

    const validRegion = result.current.validateField('region', 'Bordeaux');
    expect(validRegion).toBe(true);
  });

  it('validates wine variety field correctly', () => {
    const { result } = renderHook(() => useWineFormValidation());

    const emptyVariety = result.current.validateField('wineVariety', '');
    // Since wine variety validation might return error message for empty values
    expect(typeof emptyVariety === 'string' || emptyVariety === true).toBe(true);

    const validVariety = result.current.validateField('wineVariety', 'Cabernet Sauvignon');
    expect(validVariety).toBe(true);
  });

  it('validates producer name field correctly', () => {
    const { result } = renderHook(() => useWineFormValidation());

    const producerValidation = result.current.validateField('producerName', '');
    expect(typeof producerValidation).toBe('string');

    const validProducer = result.current.validateField('producerName', 'Château Margaux');
    expect(validProducer).toBe(true);
  });

  it('hasError utility works correctly', () => {
    const { result } = renderHook(() => useWineFormValidation());

    expect(result.current.hasError(undefined)).toBe(false);
    expect(result.current.hasError({ type: 'required', message: 'Error' })).toBe(true);
  });

  it('getErrorMessage utility works correctly', () => {
    const { result } = renderHook(() => useWineFormValidation());

    expect(result.current.getErrorMessage(undefined)).toBeUndefined();
    expect(result.current.getErrorMessage({ type: 'required', message: 'Test error' })).toBe('Test error');
  });

  it('validation patterns work correctly', () => {
    const { result } = renderHook(() => useWineFormValidation());

    const { patterns } = result.current;

    expect(patterns.region.test('Bordeaux')).toBe(true);
    expect(patterns.region.test('Loire Valley')).toBe(true);
    expect(patterns.region.test('Invalid@#$')).toBe(false);

    expect(patterns.wineVariety.test('Cabernet Sauvignon')).toBe(true);
    expect(patterns.wineVariety.test('Pinot Noir')).toBe(true);

    expect(patterns.producerName.test('Château Margaux')).toBe(true);
    expect(patterns.producerName.test('Smith & Sons')).toBe(true);
    expect(patterns.producerName.test('Winery 123')).toBe(true);
  });

  it('validates minimum length requirements', () => {
    const { result } = renderHook(() => useWineFormValidation());

    // Region: minimum 2 characters
    expect(result.current.validateField('region', 'A')).toMatch(/too short|minLength/);
    expect(result.current.validateField('region', 'AB')).toBe(true);

    // Producer: minimum 2 characters
    expect(result.current.validateField('producerName', 'A')).toMatch(/too short|minLength/);
    expect(result.current.validateField('producerName', 'AB')).toBe(true);
  });

  it('validates maximum length requirements', () => {
    const { result } = renderHook(() => useWineFormValidation());

    const longString = 'a'.repeat(101); // 101 characters

    // All fields: maximum 100 characters
    expect(result.current.validateField('region', longString)).toMatch(/too long|maxLength/);
    expect(result.current.validateField('wineVariety', longString)).toMatch(/too long|maxLength/);
    expect(result.current.validateField('producerName', longString)).toMatch(/too long|maxLength/);

    const validString = 'a'.repeat(100); // 100 characters
    expect(result.current.validateField('region', validString)).toBe(true);
    expect(result.current.validateField('wineVariety', validString)).toBe(true);
    expect(result.current.validateField('producerName', validString)).toBe(true);
  });

  it('validates pattern requirements for different field types', () => {
    const { result } = renderHook(() => useWineFormValidation());

    // Region: only letters, spaces, hyphens, apostrophes, accented chars
    expect(result.current.validateField('region', 'Valid Region')).toBe(true);
    expect(result.current.validateField('region', 'Saint-Émilion')).toBe(true);
    expect(result.current.validateField('region', "Val d'Aosta")).toBe(true);
    expect(result.current.validateField('region', 'Invalid123')).toMatch(/invalid|format/);
    expect(result.current.validateField('region', 'Invalid@#$')).toMatch(/invalid|format/);

    // Wine variety: same pattern as region
    expect(result.current.validateField('wineVariety', 'Cabernet Sauvignon')).toBe(true);
    expect(result.current.validateField('wineVariety', 'Gewürztraminer')).toBe(true);
    expect(result.current.validateField('wineVariety', 'Invalid123')).toMatch(/invalid|format/);

    // Producer: allows numbers and additional punctuation
    expect(result.current.validateField('producerName', 'Château Margaux')).toBe(true);
    expect(result.current.validateField('producerName', 'Smith & Sons')).toBe(true);
    expect(result.current.validateField('producerName', 'Winery 123')).toBe(true);
    expect(result.current.validateField('producerName', 'Valid, LLC')).toBe(true);
    expect(result.current.validateField('producerName', 'Invalid@#$')).toMatch(/invalid|format/);
  });

  it('validates whitespace-only values correctly', () => {
    const { result } = renderHook(() => useWineFormValidation());

    // Region and producer (required fields) should reject whitespace-only
    expect(result.current.validateField('region', '   ')).toMatch(/required/);
    expect(result.current.validateField('producerName', '\t\n  ')).toMatch(/required/);

    // Wine variety (optional) should reject whitespace-only with different message
    expect(result.current.validateField('wineVariety', '   ')).toMatch(/invalid/);
  });

  it('validates empty values correctly', () => {
    const { result } = renderHook(() => useWineFormValidation());

    // Required fields should fail on empty
    expect(result.current.validateField('region', '')).toMatch(/required/);
    expect(result.current.validateField('region', undefined)).toMatch(/required/);
    expect(result.current.validateField('producerName', '')).toMatch(/required/);
    expect(result.current.validateField('producerName', undefined)).toMatch(/required/);

    // Optional field: both undefined and empty string fail due to noOnlySpaces validator
    // (undefined gets converted to '' in validateField function)
    expect(result.current.validateField('wineVariety', undefined)).toMatch(/invalid/);
    expect(result.current.validateField('wineVariety', '')).toMatch(/invalid/);
  });

  it('getErrorMessage handles fallback for missing message', () => {
    const { result } = renderHook(() => useWineFormValidation());

    // Error with no message should use fallback
    const errorWithoutMessage = { type: 'custom' } as FieldError;
    const fallbackMessage = result.current.getErrorMessage(errorWithoutMessage);
    expect(fallbackMessage).toMatch(/invalid/i); // Should use translation fallback
  });

  it('validates accented characters correctly', () => {
    const { result } = renderHook(() => useWineFormValidation());

    // Test various accented characters that should be valid
    const accentedNames = [
      'Côte de Beaune', // French
      'Doña Blanca', // Spanish
      'Grüner Veltliner', // German
      "Barbera d'Alba", // Italian
      'São Paulo', // Portuguese
    ];

    accentedNames.forEach((name) => {
      expect(result.current.validateField('region', name)).toBe(true);
      expect(result.current.validateField('wineVariety', name)).toBe(true);
      expect(result.current.validateField('producerName', name)).toBe(true);
    });
  });

  it('validates edge cases in custom validators', () => {
    const { result } = renderHook(() => useWineFormValidation());

    // Test null/undefined handling in custom validators
    expect(result.current.validateField('region', null as unknown as string | undefined)).toMatch(/required/);
    expect(result.current.validateField('wineVariety', null as unknown as string | undefined)).toMatch(/invalid/);
    expect(result.current.validateField('producerName', null as unknown as string | undefined)).toMatch(/required/);

    // Test mixed whitespace characters
    expect(result.current.validateField('region', '\r\n\t ')).toMatch(/required/);
    expect(result.current.validateField('wineVariety', '\r\n\t ')).toMatch(/invalid/);
  });
});
