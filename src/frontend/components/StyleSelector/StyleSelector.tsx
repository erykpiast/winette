import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { ValidationError } from '#components/ValidationError';
import type { LabelStyleId } from '#hooks/useWineFormValidation';
import * as styles from './StyleSelector.css';

export interface StyleOption {
  id: LabelStyleId;
  name: string;
  description: string;
  previewIcon: string;
}

export interface StyleSelectorProps {
  /**
   * Currently selected style
   */
  selectedStyle: LabelStyleId;
  /**
   * Called when style selection changes
   */
  onStyleChange: (style: LabelStyleId) => void;
  /**
   * Error message to display
   */
  error?: string | undefined;
  /**
   * Whether the selector is disabled
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
 * Style selector component with 4 predefined wine label styles
 */
export function StyleSelector({
  selectedStyle,
  onStyleChange,
  error,
  disabled = false,
  className,
  name = 'style',
}: StyleSelectorProps): JSX.Element {
  const { t } = useTranslation();

  // Define the 4 style options with their characteristics
  const styleOptions: StyleOption[] = [
    {
      id: 'classic',
      name: t('wineForm.fields.style.options.classic.name'),
      description: t('wineForm.fields.style.options.classic.description'),
      previewIcon: '🏛️',
    },
    {
      id: 'modern',
      name: t('wineForm.fields.style.options.modern.name'),
      description: t('wineForm.fields.style.options.modern.description'),
      previewIcon: '🔷',
    },
    {
      id: 'elegant',
      name: t('wineForm.fields.style.options.elegant.name'),
      description: t('wineForm.fields.style.options.elegant.description'),
      previewIcon: '✨',
    },
    {
      id: 'funky',
      name: t('wineForm.fields.style.options.funky.name'),
      description: t('wineForm.fields.style.options.funky.description'),
      previewIcon: '🎨',
    },
  ];

  // Handle style selection
  const handleStyleClick = (styleId: LabelStyleId) => {
    if (!disabled) {
      onStyleChange(styleId);
    }
  };

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.label} id="style-selector-label">
        {t('wineForm.fields.style.label')}
        <span className={styles.requiredIndicator}>*</span>
      </div>

      <div
        className={styles.stylesGrid}
        role="radiogroup"
        aria-labelledby="style-selector-label"
        aria-invalid={!!error}
      >
        {styleOptions.map((option) => (
          <label
            key={option.id}
            className={styles.styleCard}
            data-selected={selectedStyle === option.id}
            data-disabled={disabled}
            aria-invalid={!!error}
          >
            <div className={styles.stylePreview} aria-hidden="true">
              {option.previewIcon}
            </div>
            <div className={styles.styleName}>{option.name}</div>
            <div className={styles.styleDescription}>{option.description}</div>

            {/* Hidden input for form integration */}
            <input
              type="radio"
              name={name}
              value={option.id}
              checked={selectedStyle === option.id}
              onChange={() => handleStyleClick(option.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleStyleClick(option.id);
                }
              }}
              className={styles.hiddenInput}
              disabled={disabled}
              aria-checked={selectedStyle === option.id}
            />
          </label>
        ))}
      </div>

      <div className={styles.errorContainer}>
        {error && <ValidationError message={error} fieldId={name || 'style'} />}
      </div>
    </div>
  );
}
