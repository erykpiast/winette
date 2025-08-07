import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { InputField } from '#components/InputField';

export interface AppellationFieldProps {
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
  /**
   * Maximum character length
   * @default 100
   */
  maxLength?: number;
  /**
   * Whether to show character count
   * @default true
   */
  showCharacterCount?: boolean;
}

/**
 * Appellation input field with character counting and validation (optional field)
 */
export function AppellationField({
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
  className,
  name = 'appellation',
  maxLength = 100,
  showCharacterCount = true,
}: AppellationFieldProps): JSX.Element {
  const { t } = useTranslation();

  // Handle input change with max length enforcement
  const handleChange = (newValue: string) => {
    // Respect max length
    if (newValue.length <= maxLength) {
      onChange(newValue);
    }
  };

  return (
    <InputField
      value={value}
      onChange={handleChange}
      onBlur={onBlur}
      label={t('wineForm.fields.appellation.label')}
      required={false}
      optional={t('wineForm.fields.appellation.optional')}
      placeholder={t('wineForm.fields.appellation.placeholder')}
      error={error}
      disabled={disabled}
      className={className}
      name={name}
      maxLength={maxLength}
      showCharacterCount={showCharacterCount}
      inputProps={{ autoComplete: 'off' }}
    />
  );
}
