import type { JSX } from 'react';
import { Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackendTestSection } from '#components/BackendTestSection/BackendTestSection';
import { LanguageSwitcher } from '#components/LanguageSwitcher';
import { WineInputForm } from '#components/WineInputForm';
import type { WineInputFormData } from '#hooks/useWineFormValidation';
import * as styles from './App.css';

export function AppContent(): JSX.Element {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<WineInputFormData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();

  // Handle form submission
  const handleFormSubmit = async (data: WineInputFormData) => {
    setIsSubmitting(true);
    setSubmitError(undefined);

    try {
      // TODO: In Phase 1.3, this will navigate to style selection
      // For now, just store the data and show it
      console.log('Form submitted with data:', data);
      setFormData(data);

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmitError('Failed to process form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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

        {/* Wine Input Form - Phase 1.2 */}
        <section>
          <WineInputForm onSubmit={handleFormSubmit} isSubmitting={isSubmitting} submitError={submitError} />
        </section>

        {/* Display submitted form data (temporary for Phase 1.2) */}
        {formData && (
          <section className={styles.comingSoon}>
            <div className={styles.placeholder}>
              <h3 className={styles.placeholderTitle}>Form Submitted Successfully!</h3>
              <p>Your wine details have been captured. In Phase 1.3, you'll proceed to style selection.</p>

              <div
                style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  border: '1px solid #10b981',
                  borderRadius: '8px',
                  backgroundColor: '#f0fdf4',
                  textAlign: 'left',
                }}
              >
                <h4>Your Wine Details:</h4>
                <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <p>
                    <strong>Region:</strong> {formData.region}
                  </p>
                  {formData.wineVariety && (
                    <p>
                      <strong>Wine Variety:</strong> {formData.wineVariety}
                    </p>
                  )}
                  <p>
                    <strong>Producer Name:</strong> {formData.producerName}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

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
