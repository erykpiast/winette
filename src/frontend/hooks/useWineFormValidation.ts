import { useMemo } from 'react';
import type { FieldError, RegisterOptions } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

export interface WineInputFormData {
  region: string;
  wineVariety?: string | undefined;
  producerName: string;
}

export interface ValidationRules {
  region: RegisterOptions<WineInputFormData, 'region'>;
  wineVariety: RegisterOptions<WineInputFormData, 'wineVariety'>;
  producerName: RegisterOptions<WineInputFormData, 'producerName'>;
}

/**
 * Validation patterns for wine form fields
 */
const VALIDATION_PATTERNS = {
  // Letters, spaces, hyphens, apostrophes, accented characters
  region: /^[a-zA-ZÀ-ÿ\u0100-\u017F\s\-'.]+$/,
  // Letters, spaces, hyphens, accented characters
  wineVariety: /^[a-zA-ZÀ-ÿ\u0100-\u017F\s\-'.]+$/,
  // Alphanumeric, spaces, common punctuation for winery names
  producerName: /^[a-zA-ZÀ-ÿ\u0100-\u017F0-9\s\-'.&,]+$/,
} as const;

/**
 * Custom hook for wine form validation rules and utilities
 */
export function useWineFormValidation() {
  const { t } = useTranslation();

  const validationRules: ValidationRules = useMemo(
    () => ({
      region: {
        required: {
          value: true,
          message: t('wineForm.fields.region.required'),
        },
        minLength: {
          value: 2,
          message: t('wineForm.fields.region.minLength'),
        },
        maxLength: {
          value: 100,
          message: t('wineForm.fields.region.maxLength'),
        },
        pattern: {
          value: VALIDATION_PATTERNS.region,
          message: t('wineForm.fields.region.invalid'),
        },
        validate: {
          notEmpty: (value: string) => {
            const trimmed = value?.trim();
            if (!trimmed) {
              return t('wineForm.fields.region.required');
            }
            return true;
          },
          noOnlySpaces: (value: string) => {
            if (value && value.trim().length === 0) {
              return t('wineForm.fields.region.required');
            }
            return true;
          },
        },
      },
      wineVariety: {
        maxLength: {
          value: 100,
          message: t('wineForm.fields.wineVariety.maxLength'),
        },
        pattern: {
          value: VALIDATION_PATTERNS.wineVariety,
          message: t('wineForm.fields.wineVariety.invalid'),
        },
        validate: {
          noOnlySpaces: (value?: string) => {
            if (value && value.trim().length === 0) {
              return t('wineForm.fields.wineVariety.invalid');
            }
            return true;
          },
        },
      },
      producerName: {
        required: {
          value: true,
          message: t('wineForm.fields.producerName.required'),
        },
        minLength: {
          value: 2,
          message: t('wineForm.fields.producerName.minLength'),
        },
        maxLength: {
          value: 100,
          message: t('wineForm.fields.producerName.maxLength'),
        },
        pattern: {
          value: VALIDATION_PATTERNS.producerName,
          message: t('wineForm.fields.producerName.invalid'),
        },
        validate: {
          notEmpty: (value: string) => {
            const trimmed = value?.trim();
            if (!trimmed) {
              return t('wineForm.fields.producerName.required');
            }
            return true;
          },
          noOnlySpaces: (value: string) => {
            if (value && value.trim().length === 0) {
              return t('wineForm.fields.producerName.required');
            }
            return true;
          },
        },
      },
    }),
    [t],
  );

  /**
   * Helper function to get user-friendly error message from FieldError
   */
  const getErrorMessage = useMemo(
    () =>
      (error?: FieldError): string | undefined => {
        if (!error) return undefined;
        return error.message || t('wineForm.validation.invalidInput');
      },
    [t],
  );

  /**
   * Helper function to check if a field has an error
   */
  const hasError = useMemo(
    () =>
      (error?: FieldError): boolean => {
        return !!error;
      },
    [],
  );

  /**
   * Helper function to validate individual field values (for real-time validation)
   */
  const validateField = useMemo(
    () =>
      (fieldName: keyof WineInputFormData, value: string | undefined): string | true => {
        const rules = validationRules[fieldName];
        const fieldValue = value || '';

        // Required validation
        if ('required' in rules && rules.required) {
          const requiredRule = rules.required;
          if (typeof requiredRule === 'object' && requiredRule.value) {
            if (!fieldValue.trim()) {
              return requiredRule.message || `${fieldName} is required`;
            }
          }
        }

        // Min length validation
        if ('minLength' in rules && rules.minLength) {
          const minLengthRule = rules.minLength;
          if (typeof minLengthRule === 'object' && fieldValue.length < minLengthRule.value) {
            return minLengthRule.message || `${fieldName} is too short`;
          }
        }

        // Max length validation
        if ('maxLength' in rules && rules.maxLength) {
          const maxLengthRule = rules.maxLength;
          if (typeof maxLengthRule === 'object' && fieldValue.length > maxLengthRule.value) {
            return maxLengthRule.message || `${fieldName} is too long`;
          }
        }

        // Pattern validation
        if ('pattern' in rules && rules.pattern) {
          const patternRule = rules.pattern;
          if (
            typeof patternRule === 'object' &&
            'value' in patternRule &&
            patternRule.value &&
            !patternRule.value.test(fieldValue)
          ) {
            return patternRule.message || `${fieldName} format is invalid`;
          }
        }

        // Custom validation
        if ('validate' in rules && rules.validate && typeof rules.validate === 'object') {
          for (const [, validator] of Object.entries(rules.validate)) {
            if (typeof validator === 'function') {
              const result = validator(fieldValue, {} as WineInputFormData);
              if (typeof result === 'string') {
                return result;
              }
            }
          }
        }

        return true;
      },
    [validationRules],
  );

  return {
    validationRules,
    getErrorMessage,
    hasError,
    validateField,
    patterns: VALIDATION_PATTERNS,
  };
}
