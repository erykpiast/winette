import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '#components/LanguageSwitcher';
import * as styles from './App.css';
import { useRandomPost } from './useAppApi';

export function AppContent(): JSX.Element {
  const { t } = useTranslation();
  const { data: wineLabel, refetch } = useRandomPost();

  if (!wineLabel) {
    return <div>Loading...</div>;
  }

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

        {/* Backend Integration Test Section */}
        <section className={styles.comingSoon}>
          <div className={styles.placeholder}>
            <h3 className={styles.placeholderTitle}>{t('test.title')}</h3>
            <p>{t('test.description')}</p>

            <button type="button" onClick={() => refetch()}>
              {t('test.fetchButton')}
            </button>

            <div
              style={{
                marginTop: '1rem',
                padding: '1rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                textAlign: 'left',
              }}
            >
              <h4>{t('test.wineLabelTitle', { name: wineLabel.name })}</h4>
              <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
                <p>
                  <strong>{t('test.winery')}:</strong> {wineLabel.winery}
                </p>
                <p>
                  <strong>{t('test.vintage')}:</strong> {wineLabel.vintage}
                </p>
                <p>
                  <strong>{t('test.region')}:</strong> {wineLabel.region}
                </p>
                <p>
                  <strong>{t('test.grapeVariety')}:</strong> {wineLabel.grape_variety}
                </p>
                <p>
                  <strong>{t('test.alcoholContent')}:</strong> {wineLabel.alcohol_content}%
                </p>
                <p>
                  <strong>{t('test.style')}:</strong> {wineLabel.style}
                </p>
                <p>
                  <strong>{t('test.tastingNotes')}:</strong> {wineLabel.tasting_notes}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.comingSoon}>
          <div className={styles.placeholder}>
            <h3 className={styles.placeholderTitle}>{t('phase1.title')}</h3>
            <p>{t('phase1.subtitle')}</p>
            <div className="features">
              <ul className={styles.featuresList}>
                <li className={styles.featuresListItem}>{t('phase1.features.projectSetup')}</li>
                <li className={styles.featuresListItem}>{t('phase1.features.reactQuery')}</li>
                <li className={styles.featuresListItem}>{t('phase1.features.errorBoundaries')}</li>
                <li className={styles.featuresListItem}>{t('phase1.features.backendApi')}</li>
                <li className={styles.featuresListItem}>{t('phase1.features.inputForm')}</li>
                <li className={styles.featuresListItem}>{t('phase1.features.styleSelection')}</li>
                <li className={styles.featuresListItem}>{t('phase1.features.labelPreview')}</li>
                <li className={styles.featuresListItem}>{t('phase1.features.exportFunctionality')}</li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.appFooter}>
        <p className={styles.appFooterText}>{t('footer.copyright')}</p>
      </footer>
    </div>
  );
}
