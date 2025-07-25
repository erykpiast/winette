import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import * as styles from './App.css';

export function LoadingFallback(): JSX.Element {
  const { t } = useTranslation();

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
            <h3 className={styles.placeholderTitle}>{t('loading.title')}</h3>
            <p>{t('loading.description')}</p>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '2rem',
                fontSize: '2rem',
              }}
            >
              ⏳
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
