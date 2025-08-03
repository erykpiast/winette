import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { AutocompleteField } from '#components/AutocompleteField';
import { WINE_VARIETIES } from '../../data/wine-varieties';

export interface WineVarietyFieldProps {
  /**
   * Current field value
   */
  value?: string | undefined;
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
 * Wine variety input field with autocomplete (optional field)
 */
export function WineVarietyField({
  value = '',
  onChange,
  onBlur,
  error,
  disabled = false,
  className,
  name = 'wineVariety',
}: WineVarietyFieldProps): JSX.Element {
  const { t } = useTranslation();

  const props: Parameters<typeof AutocompleteField>[0] = {
    value,
    onChange,
    onBlur,
    options: WINE_VARIETIES,
    label: t('wineForm.fields.wineVariety.label'),
    optional: t('wineForm.fields.wineVariety.optional'),
    placeholder: t('wineForm.fields.wineVariety.placeholder'),
    disabled,
    noResultsMessage: t('wineForm.autocomplete.noResults', {
      type: t('wineForm.fields.wineVariety.label').toLowerCase(),
      query: value,
    }),
  };

  if (error !== undefined) props.error = error;
  if (className !== undefined) props.className = className;
  if (name !== undefined) props.name = name;

  return <AutocompleteField {...props} />;
}
