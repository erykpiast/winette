import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import * as styles from '../App/App.css';
import { useRandomPost } from '../App/useAppApi';

/**
 * Backend integration test section - separated to avoid blocking the form
 * Note: This component uses useSuspenseQuery, so wineLabel will never be undefined
 */
export function BackendTestSection(): JSX.Element {
  const { t } = useTranslation();
  const { data: wineLabel, refetch } = useRandomPost();

  // TypeScript doesn't know that useSuspenseQuery guarantees data is defined
  if (!wineLabel) {
    throw new Error('Wine label data should be available due to Suspense');
  }

  return (
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
  );
}
