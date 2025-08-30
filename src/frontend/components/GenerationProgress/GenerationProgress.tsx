import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { RenderedLabel } from '#components/RenderedLabel';
import type { WineInputFormData } from '#hooks/useWineFormValidation';
import type { DesignScheme, GenerationStatus, LabelDSL } from '#hooks/useWineLabelGeneration';
import * as styles from './GenerationProgress.css';
import loaderSvg from './loader.svg';

// Helper component for rendered label completion state
function RenderedLabelCompletion({
  status,
  formData,
  onRestart,
  onCancel,
  t,
}: {
  status: GenerationStatus;
  formData: WineInputFormData;
  onRestart: () => void;
  onCancel: () => void;
  t: (key: string) => string;
}): ReactElement {
  return (
    <div className={styles.completedContainer}>
      <h2 className={styles.successTitle}>🎉 {t('generation.labelCompleted')}</h2>

      <RenderedLabel
        previewUrl={status.previewUrl!}
        {...(status.previewWidth && { width: status.previewWidth })}
        {...(status.previewHeight && { height: status.previewHeight })}
        {...(status.previewFormat && { format: status.previewFormat })}
        wineDetails={{
          producerName: formData.producerName,
          wineName: formData.wineName,
          vintage: formData.vintage,
          region: formData.region,
          variety: formData.wineVariety || undefined,
        }}
      />

      <div className={styles.actions}>
        <button type="button" className={styles.primaryButton} onClick={onRestart}>
          {t('generation.actions.another')}
        </button>
        <button type="button" className={styles.secondaryButton} onClick={onCancel}>
          {t('generation.actions.edit')}
        </button>
      </div>
    </div>
  );
}

// Helper component for DSL completion state
function DSLCompletion({
  description,
  onRestart,
  onCancel,
  t,
}: {
  description: LabelDSL;
  onRestart: () => void;
  onCancel: () => void;
  t: (key: string) => string;
}): ReactElement {
  const { palette, typography } = description;
  return (
    <div className={styles.completedContainer}>
      <h2 className={styles.successTitle}>✅ {t('generation.completedTitle')}</h2>
      <div className={styles.resultSummary}>
        <p>
          <strong>{t('generation.result.temperatureLabel')}:</strong> {palette.temperature}
        </p>
        <p>
          <strong>{t('generation.result.paletteLabel')}:</strong> {palette.primary} + {palette.secondary}
        </p>
        <p>
          <strong>{t('generation.result.typographyLabel')}:</strong> {typography.primary.family}
        </p>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.primaryButton} onClick={onRestart}>
          {t('generation.actions.another')}
        </button>
        <button type="button" className={styles.secondaryButton} onClick={onCancel}>
          {t('generation.actions.edit')}
        </button>
      </div>
    </div>
  );
}

// Helper component for design scheme completion state
function DesignSchemeCompletion({
  designScheme,
  onRestart,
  onCancel,
  t,
}: {
  designScheme: DesignScheme;
  onRestart: () => void;
  onCancel: () => void;
  t: (key: string) => string;
}): ReactElement {
  const { palette, typography } = designScheme;
  return (
    <div className={styles.completedContainer}>
      <h2 className={styles.successTitle}>✅ {t('generation.designCompleted')}</h2>
      <div className={styles.resultSummary}>
        <p>
          <strong>{t('generation.result.temperatureLabel')}:</strong> {palette.temperature}
        </p>
        <p>
          <strong>{t('generation.result.paletteLabel')}:</strong> {palette.primary.name} + {palette.secondary.name}
        </p>
        <p>
          <strong>{t('generation.result.typographyLabel')}:</strong> {typography.primary.family}
        </p>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.primaryButton} onClick={onRestart}>
          {t('generation.actions.another')}
        </button>
        <button type="button" className={styles.secondaryButton} onClick={onCancel}>
          {t('generation.actions.edit')}
        </button>
      </div>
    </div>
  );
}

export interface GenerationProgressProps {
  formData: WineInputFormData;
  submission?:
    | {
        submissionId?: string;
        generationId?: string;
      }
    | undefined;
  status?: GenerationStatus | { status: 'initializing' } | undefined;
  onCancel: () => void;
  onRestart: () => void;
}

export function GenerationProgress({
  formData,
  submission,
  status,
  onCancel,
  onRestart,
}: GenerationProgressProps): ReactElement {
  const { t } = useTranslation();

  const isCompleted = status?.status === 'completed';
  const isFailed = status?.status === 'failed';
  const statusKey = (status?.status as string | undefined) ?? 'initializing';
  const friendlyStatus = t(`generation.statuses.${statusKey}`, { defaultValue: statusKey });

  // Show completed state - handle both design scheme and full DSL
  if (isCompleted) {
    // Check if we have a rendered label preview
    const hasRenderedLabel = status && 'previewUrl' in status && status.previewUrl;

    // Prefer rendered label if available
    if (hasRenderedLabel) {
      return (
        <RenderedLabelCompletion status={status} formData={formData} onRestart={onRestart} onCancel={onCancel} t={t} />
      );
    }

    // Prefer full DSL if available, fall back to design scheme
    const description = status && 'description' in status ? status.description : null;
    const designScheme = status && 'designScheme' in status ? status.designScheme : null;

    if (description) {
      return <DSLCompletion description={description} onRestart={onRestart} onCancel={onCancel} t={t} />;
    } else if (designScheme) {
      return <DesignSchemeCompletion designScheme={designScheme} onRestart={onRestart} onCancel={onCancel} t={t} />;
    }
  }

  // Show failed state
  if (isFailed) {
    return (
      <div className={styles.failedContainer}>
        <h2 className={styles.errorTitle}>❌ {t('generation.failedTitle')}</h2>
        {status && 'error' in status && status.error && (
          <p className={styles.errorMessage}>
            {t('error.label')}: {status.error}
          </p>
        )}
        <div className={styles.actions}>
          <button type="button" className={styles.primaryButton} onClick={onCancel}>
            {t('generation.actions.retry')}
          </button>
          <button type="button" className={styles.secondaryButton} onClick={onCancel}>
            {t('generation.actions.edit')}
          </button>
        </div>
      </div>
    );
  }

  // Show processing state with form-like layout
  return (
    <div className={styles.formContainer}>
      <h2 className={styles.formTitle}>{t('wineForm.title')}</h2>
      <div className={styles.formContent}>
        {/* Form fields in spec order */}
        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>{t('generation.fields.region')}</span>
          <div className={styles.fieldValue}>{formData.region}</div>
        </div>

        {formData.appellation && (
          <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>{t('generation.fields.appellation')}</span>
            <div className={styles.fieldValue}>{formData.appellation}</div>
          </div>
        )}

        {formData.wineVariety && (
          <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>{t('generation.fields.variety')}</span>
            <div className={styles.fieldValue}>{formData.wineVariety}</div>
          </div>
        )}

        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>{t('generation.fields.producer')}</span>
          <div className={styles.fieldValue}>{formData.producerName}</div>
        </div>

        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>{t('generation.fields.wine')}</span>
          <div className={styles.fieldValue}>{formData.wineName}</div>
        </div>

        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>{t('generation.fields.vintage')}</span>
          <div className={styles.fieldValue}>{formData.vintage}</div>
        </div>

        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>{t('generation.fields.style')}</span>
          <div className={styles.fieldValue}>{t(`styles.${formData.style}`)}</div>
        </div>

        {/* Semi-transparent overlay with spinner */}
        <div className={styles.overlay} aria-busy="true">
          <div className={styles.overlayContent}>
            <div className={styles.spinnerWrapper}>
              <img src={loaderSvg} alt={t('generation.loading')} className={styles.spinner} aria-hidden="true" />
            </div>
            <p className={styles.processingText} aria-live="polite">
              {status?.status === 'initializing' ? t('generation.initializing') : t('generation.processing')}
            </p>
            <p className={styles.processingSubtext}>{t('generation.longRunning')}</p>
            <p className={styles.processingNote}>{t('generation.keepTabOpen')}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className={styles.buttonGroup}>
          <button type="button" className={styles.primaryButton} onClick={onCancel}>
            {t('generation.actions.cancel')}
          </button>
          <button type="button" className={styles.secondaryButton} onClick={onRestart}>
            {t('generation.actions.restart')}
          </button>
        </div>
      </div>

      {/* Status line */}
      <div className={styles.statusLine}>
        <span>
          {t('generation.status')}: {friendlyStatus}…
        </span>
        {submission?.generationId && (
          <>
            <span className={styles.separator}>•</span>
            <span>
              {t('generation.generationId')}: {submission.generationId.substring(0, 8)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
