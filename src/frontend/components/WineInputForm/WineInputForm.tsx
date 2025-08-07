import type { JSX } from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { AppellationField } from '#components/AppellationField';
import { ProducerNameField } from '#components/ProducerNameField';
import { RegionField } from '#components/RegionField';
import { StyleSelector } from '#components/StyleSelector';
import { VintageField } from '#components/VintageField';
import { WineNameField } from '#components/WineNameField';
import { WineVarietyField } from '#components/WineVarietyField';
import { useWineFormValidation, type WineInputFormData } from '#hooks/useWineFormValidation';
import * as styles from './WineInputForm.css';

export interface WineInputFormProps {
  /**
   * Called when form is successfully submitted
   */
  onSubmit: (data: WineInputFormData) => void;
  /**
   * Initial form data (for editing or pre-population)
   */
  initialData?: Partial<WineInputFormData>;
  /**
   * Whether the form is currently processing submission
   */
  isSubmitting?: boolean;
  /**
   * Global form error message
   */
  submitError?: string | undefined;
  /**
   * Success message to display
   */
  successMessage?: string | undefined;
  /**
   * Additional CSS class name
   */
  className?: string;
}

/**
 * Main wine input form component that orchestrates all field components
 */
export function WineInputForm({
  onSubmit,
  initialData,
  isSubmitting = false,
  submitError,
  successMessage,
  className,
}: WineInputFormProps): JSX.Element {
  const { t } = useTranslation();
  const { validationRules, getErrorMessage } = useWineFormValidation();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue,
    trigger,
    clearErrors,
  } = useForm<WineInputFormData>({
    mode: 'onBlur',
    defaultValues: {
      region: initialData?.region || '',
      wineVariety: initialData?.wineVariety || '',
      producerName: initialData?.producerName || '',
      wineName: initialData?.wineName || '',
      vintage: initialData?.vintage || '',
      appellation: initialData?.appellation || '',
      style: initialData?.style || 'classic',
    },
  });

  // Watch form values for controlled components
  const watchedValues = watch();

  // Re-validate all fields when language changes to update error messages
  useEffect(() => {
    const hasAnyErrors = Object.keys(errors).length > 0;
    if (hasAnyErrors) {
      // Store currently focused element
      const activeElement = document.activeElement as HTMLElement;

      // Clear all errors first to remove cached messages
      clearErrors();

      // Re-trigger validation with fresh translation context
      setTimeout(() => {
        trigger();

        // Restore focus to the previously focused element
        if (activeElement && typeof activeElement.focus === 'function') {
          activeElement.focus();
        }
      }, 0);
    }
  }, [trigger, errors, clearErrors]);

  // Handle form submission
  const handleFormSubmit = handleSubmit((data) => {
    // Trim whitespace from all string fields
    const cleanedData: WineInputFormData = {
      region: data.region.trim(),
      wineVariety: data.wineVariety?.trim() || undefined,
      producerName: data.producerName.trim(),
      wineName: data.wineName.trim(),
      vintage: data.vintage.trim(),
      appellation: data.appellation?.trim() || undefined,
      style: data.style,
    };

    onSubmit(cleanedData);
  });

  // Handle form reset
  const handleReset = () => {
    reset({
      region: '',
      wineVariety: '',
      producerName: '',
      wineName: '',
      vintage: '',
      appellation: '',
      style: 'classic',
    });
  };

  // Handle field changes for controlled components
  const handleRegionChange = (value: string) => {
    setValue('region', value, { shouldValidate: true, shouldDirty: true });
  };

  const handleWineVarietyChange = (value: string) => {
    setValue('wineVariety', value, { shouldValidate: true, shouldDirty: true });
  };

  const handleProducerNameChange = (value: string) => {
    setValue('producerName', value, { shouldValidate: true, shouldDirty: true });
  };

  const handleWineNameChange = (value: string) => {
    setValue('wineName', value, { shouldValidate: true, shouldDirty: true });
  };

  const handleVintageChange = (value: string) => {
    setValue('vintage', value, { shouldValidate: true, shouldDirty: true });
  };

  const handleAppellationChange = (value: string) => {
    setValue('appellation', value, { shouldValidate: true, shouldDirty: true });
  };

  const handleStyleChange = (value: WineInputFormData['style']) => {
    setValue('style', value, { shouldValidate: true, shouldDirty: true });
  };

  // Handle field blur for validation
  const handleFieldBlur = (fieldName: keyof WineInputFormData) => {
    trigger(fieldName);
  };

  return (
    <div className={`${styles.formContainer} ${className || ''}`}>
      <h2 className={styles.formTitle}>{t('wineForm.title')}</h2>
      <p className={styles.formDescription}>{t('wineForm.description')}</p>

      <form onSubmit={handleFormSubmit} className={styles.form} noValidate>
        {/* Required fields first */}
        <div className={styles.fieldGroup}>
          <ProducerNameField
            {...register('producerName', validationRules.producerName)}
            value={watchedValues.producerName}
            onChange={handleProducerNameChange}
            onBlur={() => handleFieldBlur('producerName')}
            error={getErrorMessage(errors.producerName)}
            disabled={isSubmitting}
          />
        </div>

        <div className={styles.fieldGroup}>
          <WineNameField
            {...register('wineName', validationRules.wineName)}
            value={watchedValues.wineName}
            onChange={handleWineNameChange}
            onBlur={() => handleFieldBlur('wineName')}
            error={getErrorMessage(errors.wineName)}
            disabled={isSubmitting}
          />
        </div>

        <div className={styles.fieldGroup}>
          <RegionField
            {...register('region', validationRules.region)}
            value={watchedValues.region}
            onChange={handleRegionChange}
            onBlur={() => handleFieldBlur('region')}
            error={getErrorMessage(errors.region)}
            disabled={isSubmitting}
          />
        </div>

        <div className={styles.fieldGroup}>
          <VintageField
            {...register('vintage', validationRules.vintage)}
            value={watchedValues.vintage}
            onChange={handleVintageChange}
            onBlur={() => handleFieldBlur('vintage')}
            error={getErrorMessage(errors.vintage)}
            disabled={isSubmitting}
          />
        </div>

        {/* Optional fields at the end */}
        <div className={styles.fieldGroup}>
          <WineVarietyField
            {...register('wineVariety', validationRules.wineVariety)}
            value={watchedValues.wineVariety}
            onChange={handleWineVarietyChange}
            onBlur={() => handleFieldBlur('wineVariety')}
            error={getErrorMessage(errors.wineVariety)}
            disabled={isSubmitting}
          />
        </div>

        <div className={styles.fieldGroup}>
          <AppellationField
            {...register('appellation', validationRules.appellation)}
            value={watchedValues.appellation || ''}
            onChange={handleAppellationChange}
            onBlur={() => handleFieldBlur('appellation')}
            error={getErrorMessage(errors.appellation)}
            disabled={isSubmitting}
          />
        </div>

        {/* Style selection at the very end */}
        <div className={styles.fieldGroup}>
          <StyleSelector
            {...register('style', validationRules.style)}
            selectedStyle={watchedValues.style}
            onStyleChange={handleStyleChange}
            error={getErrorMessage(errors.style)}
            disabled={isSubmitting}
          />
        </div>

        <div className={styles.buttonGroup}>
          <button
            type="button"
            onClick={handleReset}
            disabled={isSubmitting || !isDirty}
            className={styles.secondaryButton}
          >
            {t('wineForm.actions.clear')}
          </button>

          <button type="submit" disabled={isSubmitting} className={styles.primaryButton}>
            {isSubmitting ? (
              <>
                <div className={styles.loadingSpinner} aria-hidden="true" />
                {t('wineForm.actions.processing')}
              </>
            ) : (
              t('wineForm.actions.continue')
            )}
          </button>
        </div>

        {submitError && (
          <div className={styles.formError} role="alert">
            {submitError}
          </div>
        )}

        {successMessage && <output className={styles.successMessage}>{successMessage}</output>}
      </form>
    </div>
  );
}
