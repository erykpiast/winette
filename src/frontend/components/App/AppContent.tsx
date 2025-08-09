import type { JSX } from 'react';
import { Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackendTestSection } from '#components/BackendTestSection/BackendTestSection';
import { GenerationProgress } from '#components/GenerationProgress';
import { LanguageSwitcher } from '#components/LanguageSwitcher';
import { WineInputForm } from '#components/WineInputForm';
import type { WineInputFormData } from '#hooks/useWineFormValidation';
import { useWineLabelGenerationFlow } from '#hooks/useWineLabelGeneration';
import * as styles from './App.css';

export function AppContent(): JSX.Element {
  const { t } = useTranslation();
  const [lastSubmittedFormData, setLastSubmittedFormData] = useState<WineInputFormData | null>(null);
  const [isOptimistic, setIsOptimistic] = useState(false);

  // Use the new wine label generation flow
  const { submit, isSubmitting, submitError, submissionData, generationStatus, reset } = useWineLabelGenerationFlow();

  // Handle form submission with optimistic update
  const handleFormSubmit = (data: WineInputFormData) => {
    setLastSubmittedFormData(data);
    setIsOptimistic(true);
    submit(data);
  };

  // Handle submission success/error
  useEffect(() => {
    if (submissionData && isOptimistic) {
      // Submission successful
      setIsOptimistic(false);
    }
  }, [submissionData, isOptimistic]);

  useEffect(() => {
    if (submitError && isOptimistic) {
      // Submission failed, return to form
      setIsOptimistic(false);
    }
  }, [submitError, isOptimistic]);

  // Handle cancel - return to form with values
  const handleCancel = () => {
    setIsOptimistic(false);
    reset();
  };

  // Handle restart - clear everything
  const handleRestart = () => {
    setLastSubmittedFormData(null);
    setIsOptimistic(false);
    reset();
  };

  return (
    <div className={styles.app}>
      <LanguageSwitcher />
      <header className={styles.appHeader}>
        <h1 className={styles.appHeaderTitle}>{t('brand.name')}</h1>
        <p className={styles.appHeaderSubtitle}>{t('brand.tagline')}</p>
      </header>

      <main className={styles.appMain}>
        <section className={styles.hero}>
          <h2 className={styles.heroTitle}>{t('hero.title')}</h2>
          <p className={styles.heroDescription}>{t('hero.description')}</p>
        </section>

        {/* Wine Input Form or Generation Progress */}
        <section>
          {(isOptimistic || submissionData) && lastSubmittedFormData ? (
            <GenerationProgress
              formData={lastSubmittedFormData}
              submission={submissionData || undefined}
              status={isOptimistic && !submissionData ? { status: 'initializing' } : generationStatus}
              onCancel={handleCancel}
              onRestart={handleRestart}
            />
          ) : (
            <WineInputForm
              onSubmit={handleFormSubmit}
              isSubmitting={isSubmitting}
              submitError={submitError}
              initialData={lastSubmittedFormData || {}}
            />
          )}
        </section>

        {/* Backend Integration Test Section - Wrapped in Suspense */}
        <Suspense
          fallback={
            <section className={styles.comingSoon}>
              <div className={styles.placeholder}>
                <h3 className={styles.placeholderTitle}>{t('test.title')}</h3>
                <p>Loading backend test data...</p>
              </div>
            </section>
          }
        >
          <BackendTestSection />
        </Suspense>
      </main>

      <footer className={styles.appFooter}>
        <p className={styles.appFooterText}>{t('footer.copyright')}</p>
      </footer>
    </div>
  );
}
