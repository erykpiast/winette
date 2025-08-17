import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '#i18n';
import type { SupportedLanguage } from '#types/i18n';

export function LanguageSwitcher(): JSX.Element {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = (language: SupportedLanguage): void => {
    i18n.changeLanguage(language);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 1000,
      }}
    >
      <select
        value={i18n.language}
        onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
        style={{
          padding: '0.5rem',
          borderRadius: '4px',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          color: 'white',
          backdropFilter: 'blur(10px)',
          fontSize: '0.9rem',
        }}
      >
        {supportedLanguages.map((lang) => (
          <option
            key={lang}
            value={lang}
            style={{
              backgroundColor: '#667eea',
              color: 'white',
            }}
          >
            {t(`languages.${lang}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
