import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { InputField } from '#components/InputField';

export interface VintageFieldProps {
  /**
   * Current field value
   */
  value: string;
  /**
   * Called when value changes
   */
  onChange: (value: string) => void;
  /**
   * Called when field loses focus
   */
  onBlur: () => void;
  /**
   * Error message to display
   */
  error?: string | undefined;
  /**
   * Whether the field is disabled
   */
  disabled?: boolean;
  /**
   * Additional CSS class name
   */
  className?: string;
  /**
   * Field name for form registration
   */
  name?: string;
}

/**
 * Vintage input field with year validation and NV option
 */
export function VintageField({
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
  className,
  name = 'vintage',
}: VintageFieldProps): JSX.Element {
  const { t } = useTranslation();

  // Handle input change with validation for year format
  const handleChange = (newValue: string) => {
    const raw = newValue.replace(/\s+/g, '');
    const normalizedValue = raw.toUpperCase();

    // Allow empty during typing
    if (raw === '') {
      onChange('');
      return;
    }

    // Allow partial numeric year up to 4 digits
    if (/^\d{1,4}$/.test(raw)) {
      onChange(raw);
      return;
    }

    // Allow incremental typing of NV or N.V.
    if (
      normalizedValue === 'N' ||
      normalizedValue === 'NV' ||
      normalizedValue === 'N.' ||
      normalizedValue === 'N.V' ||
      normalizedValue === 'N.V.'
    ) {
      onChange(normalizedValue);
      return;
    }
  };

  return (
    <InputField
      value={value}
      onChange={handleChange}
      onBlur={onBlur}
      label={t('wineForm.fields.vintage.label')}
      required
      placeholder={t('wineForm.fields.vintage.placeholder')}
      error={error}
      disabled={disabled}
      className={className}
      name={name}
      maxLength={6} // Max length for "N.V." or 4-digit year
      inputProps={{
        autoComplete: 'off',
        type: 'text',
      }}
    />
  );
}
