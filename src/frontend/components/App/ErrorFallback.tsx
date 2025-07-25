import type { JSX } from 'react';
import type { FallbackProps } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';
import { reportPageAction } from '#lib/error-reporting';
import * as styles from './App.css';

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps): JSX.Element {
  const { t } = useTranslation();

  const handleRetry = () => {
    // Report user action to NewRelic
    reportPageAction('error_boundary_retry', {
      errorName: error.name,
      errorMessage: error.message,
      source: 'error-fallback',
    });

    resetErrorBoundary();
  };

  return (
    <div className={styles.app}>
      <header className={styles.appHeader}>
        <h1 className={styles.appHeaderTitle}>{t('brand.name')}</h1>
        <p className={styles.appHeaderSubtitle}>{t('brand.tagline')}</p>
      </header>

      <main className={styles.appMain}>
        <section className={styles.hero}>
          <h2 className={styles.heroTitle}>{t('hero.title')}</h2>
          <p className={styles.heroDescription}>{t('hero.description')}</p>
        </section>

        <section className={styles.comingSoon}>
          <div className={styles.placeholder}>
            <h3 className={styles.placeholderTitle}>{t('error.title')}</h3>
            <div
              style={{
                padding: '2rem',
                backgroundColor: '#ffebee',
                border: '1px solid #e57373',
                borderRadius: '4px',
                margin: '1rem 0',
              }}
            >
              <p style={{ color: '#c62828', marginBottom: '1rem' }}>❌ {error.message}</p>
              <button
                type="button"
                onClick={handleRetry}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                {t('error.tryAgain')}
              </button>
            </div>
            {import.meta.env.DEV && (
              <details style={{ marginTop: '1rem', fontSize: '0.8rem' }}>
                <summary>{t('error.detailsTitle')}</summary>
                <pre
                  style={{
                    backgroundColor: '#f5f5f5',
                    padding: '1rem',
                    borderRadius: '4px',
                    overflow: 'auto',
                    marginTop: '0.5rem',
                  }}
                >
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        </section>
      </main>

      <footer className={styles.appFooter}>
        <p className={styles.appFooterText}>{t('footer.copyright')}</p>
      </footer>
    </div>
  );
}
