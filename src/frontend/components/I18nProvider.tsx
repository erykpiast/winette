import type { JSX, ReactNode } from 'react';
import { Suspense, useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n, { supportedLanguages } from '#i18n';
import { reportError, reportPageAction } from '#lib/error-reporting';

interface I18nProviderProps {
  children: ReactNode;
}

/**
 * Fallback component shown while translations are loading
 */
function I18nLoadingFallback(): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '1.2rem',
        color: '#667eea',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <div style={{ textAlign: 'center', color: 'white' }}>
        <div
          style={{
            fontSize: '2rem',
            marginBottom: '1rem',
          }}
        >
          ⏳
        </div>
        <div>Loading translations...</div>
      </div>
    </div>
  );
}

/**
 * Provider that ensures i18n is properly initialized before rendering children
 */
export function I18nProvider({ children }: I18nProviderProps): JSX.Element {
  const [isI18nReady, setIsI18nReady] = useState(false);

  useEffect(() => {
    // Check if i18n is already initialized
    if (i18n.isInitialized) {
      setIsI18nReady(true);
      return;
    }

    // Wait for i18n to initialize
    const handleInitialized = () => {
      console.log('i18n initialized successfully');

      // Report successful i18n initialization
      reportPageAction('i18n_initialized', {
        language: i18n.language,
        supportedLanguages: supportedLanguages.join(', '),
        source: 'i18n-provider',
      });

      setIsI18nReady(true);
    };

    const handleFailedLoading = (lng: string, ns: string, msg: string) => {
      console.error(`Failed to load translation: ${lng}/${ns}`, msg);

      // Report translation loading failures to NewRelic
      reportError(new Error(`Translation loading failed: ${lng}/${ns}`), {
        source: 'i18n-loading',
        action: 'translation-loading-failed',
        additional: {
          language: lng,
          namespace: ns,
          errorMessage: msg,
          loadPath: '/locales/{{lng}}/{{ns}}.json',
          isI18nError: true,
        },
      });
    };

    const handleLoaded = (loaded: Record<string, unknown>) => {
      console.log('Translations loaded:', loaded);
    };

    i18n.on('initialized', handleInitialized);
    i18n.on('failedLoading', handleFailedLoading);
    i18n.on('loaded', handleLoaded);

    // Initialize i18n if not already done
    if (!i18n.isInitialized) {
      i18n.init().catch((error) => {
        console.error('Failed to initialize i18n:', error);

        // Report i18n initialization failures to NewRelic
        reportError(error, {
          source: 'i18n-initialization',
          action: 'i18n-init-failed',
          additional: {
            isI18nError: true,
            initializationAttempt: true,
          },
        });

        // Still set ready to true to prevent infinite loading
        setIsI18nReady(true);
      });
    }

    return () => {
      i18n.off('initialized', handleInitialized);
      i18n.off('failedLoading', handleFailedLoading);
      i18n.off('loaded', handleLoaded);
    };
  }, []);

  if (!isI18nReady) {
    return <I18nLoadingFallback />;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <Suspense fallback={<I18nLoadingFallback />}>{children}</Suspense>
    </I18nextProvider>
  );
}
