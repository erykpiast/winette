import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

export const defaultLanguage = 'en';
export const supportedLanguages = ['en', 'fr'] as const;

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: defaultLanguage,
    supportedLngs: supportedLanguages,
    debug: import.meta.env.DEV,

    // HTTP backend configuration
    backend: {
      loadPath:
        import.meta.env.PROD && window.location.pathname.includes('/winette/')
          ? '/winette/locales/{{lng}}/{{ns}}.json'
          : '/locales/{{lng}}/{{ns}}.json',
      addPath:
        import.meta.env.PROD && window.location.pathname.includes('/winette/')
          ? '/winette/locales/{{lng}}/{{ns}}.json'
          : '/locales/{{lng}}/{{ns}}.json',
      allowMultiLoading: false,
      crossDomain: false,
      withCredentials: false,
      overrideMimeType: false,
      requestOptions: {
        cache: 'default',
      },
    },

    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },

    // React suspense configuration
    react: {
      useSuspense: true,
      bindI18n: 'languageChanged',
      bindI18nStore: '',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i'],
    },

    // Load translations on initialization
    initImmediate: false,
    load: 'languageOnly',
  });

export default i18n;
