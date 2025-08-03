import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { AutocompleteField } from '#components/AutocompleteField';
import { WINE_REGIONS } from '../../data/wine-regions';

export interface RegionFieldProps {
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
 * Region/Appellation input field with autocomplete
 */
export function RegionField({
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
  className,
  name = 'region',
}: RegionFieldProps): JSX.Element {
  const { t } = useTranslation();

  const props: Parameters<typeof AutocompleteField>[0] = {
    value,
    onChange,
    onBlur,
    options: WINE_REGIONS,
    label: t('wineForm.fields.region.label'),
    required: true,
    placeholder: t('wineForm.fields.region.placeholder'),
    disabled,
    noResultsMessage: t('wineForm.autocomplete.noResults', {
      type: t('wineForm.fields.region.label').toLowerCase(),
      query: value,
    }),
  };

  if (error !== undefined) props.error = error;
  if (className !== undefined) props.className = className;
  if (name !== undefined) props.name = name;

  return <AutocompleteField {...props} />;
}
