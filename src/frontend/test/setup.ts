import '@testing-library/jest-dom';
import type { ReactNode } from 'react';
import { vi } from 'vitest';

// Provide a minimal mock for react-i18next to ensure tests see real strings
vi.mock('react-i18next', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-i18next')>();

  // Simple translation lookup for tests
  const translations: Record<string, string> = {
    'wineForm.autocomplete.noResultsDefault': 'No results found',
    'wineForm.autocomplete.toggleAria': 'toggle menu',
    'wineForm.autocomplete.toggleTitle': 'Toggle dropdown',
  };

  return {
    ...mod,
    useTranslation: () => ({
      t: (key: string) => translations[key] || key,
      i18n: {
        changeLanguage: vi.fn(),
        language: 'en',
      },
    }),
    Trans: ({ children }: { children: ReactNode }) => children,
    I18nextProvider: ({ children }: { children: ReactNode }) => children,
  } as unknown as typeof mod;
});

// Mock fetch for i18next HTTP backend during testing
global.fetch = vi.fn().mockImplementation((url: string) => {
  // Mock translation files
  if (url.includes('/locales/en/translation.json')) {
    const payload = {
      brand: {
        name: 'Winette',
        tagline: 'AI-Powered Wine Label Designer',
      },
      languages: {
        en: 'English',
        fr: 'French',
      },
      hero: {
        title: 'Design Professional Wine Labels in Minutes',
        description:
          'Create beautiful, contextually appropriate wine bottle labels with AI-powered assistance. Enter your wine details and let our intelligent system generate professional designs for you.',
      },
      test: {
        title: 'Backend Integration Test',
        description: 'Testing full-stack communication with real database:',
        loading: 'Loading backend test data...',
        fetchButton: 'Fetch New Random Wine',
        wineLabelTitle: '{{name}}',
        winery: 'Winery',
        vintage: 'Vintage',
        region: 'Region',
        grapeVariety: 'Grape Variety',
        alcoholContent: 'Alcohol Content',
        style: 'Style',
        tastingNotes: 'Tasting Notes',
      },
      phase1: {
        title: 'Phase 1: Foundation',
        subtitle: 'Text-only label generator coming soon...',
        features: {
          projectSetup: '✓ Project setup complete',
          reactQuery: '✓ TanStack Query integrated',
          errorBoundaries: '✓ Suspense + Error Boundaries',
          inputForm: '⏳ Core input form',
          styleSelection: '⏳ Style selection system',
          labelPreview: '⏳ Text-only label preview',
          exportFunctionality: '⏳ Basic export functionality',
        },
      },
      loading: {
        title: 'Loading...',
        description: 'Fetching data from the backend...',
      },
      error: {
        title: 'Something went wrong',
        tryAgain: 'Try Again',
        detailsTitle: 'Error Details (Development)',
        label: 'Error',
      },
      footer: {
        copyright: '© 2024 Winette. Empowering winemakers with AI-assisted design.',
      },
      wineForm: {
        title: 'Create Your Wine Label',
        description: 'Enter your wine details below to get started with AI-powered label design',
        fields: {
          region: {
            label: 'Wine Region',
            placeholder: 'e.g., Bordeaux, Napa Valley, Tuscany',
          },
          wineVariety: {
            label: 'Wine Variety',
            placeholder: 'e.g., Cabernet Sauvignon, Chardonnay',
            optional: '(optional)',
          },
          producerName: {
            label: 'Producer Name',
            placeholder: 'Your winery or producer name',
          },
          wineName: {
            label: 'Wine Name',
            placeholder: 'e.g., Grand Vin, Reserve, Estate',
          },
          vintage: {
            label: 'Vintage',
            placeholder: 'e.g., 2021',
          },
          appellation: {
            label: 'Appellation',
            placeholder: 'e.g., AOC Bordeaux, AVA Napa Valley',
            optional: '(optional)',
          },
        },
        actions: {
          clear: 'Clear',
          continue: 'Continue',
          processing: 'Processing...',
        },
        autocomplete: {
          noResults: 'Use "{{query}}"',
          noResultsDefault: 'No results found',
          loading: 'Searching...',
          suggestions: '{{type}} suggestions',
          toggleAria: 'toggle menu',
          toggleTitle: 'Toggle dropdown',
        },
      },
      generation: {
        status: 'Status',
        generationId: 'Generation ID',
      },
      api: {
        fetchError: 'Failed to fetch post',
      },
    };
    return Promise.resolve({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(payload)),
      json: () => Promise.resolve(payload),
    });
  }

  if (url.includes('/locales/fr/translation.json')) {
    const payload = {
      brand: {
        name: 'Winette',
        tagline: "Concepteur d'étiquettes de vin assisté par IA",
      },
      languages: {
        en: 'Anglais',
        fr: 'Français',
      },
      hero: {
        title: 'Concevez des étiquettes de vin professionnelles en quelques minutes',
        description:
          "Créez de belles étiquettes de bouteilles de vin adaptées au contexte avec l'assistance de l'IA. Entrez les détails de votre vin et laissez notre système intelligent générer des designs professionnels pour vous.",
      },
      test: {
        title: "Test d'intégration backend",
        description: 'Test de communication full-stack avec vraie base de données :',
        loading: 'Chargement des données de test backend...',
        fetchButton: 'Récupérer un nouveau vin aléatoire',
        wineLabelTitle: '{{name}}',
        winery: 'Vignoble',
        vintage: 'Millésime',
        region: 'Région',
        grapeVariety: 'Cépage',
        alcoholContent: 'Teneur en alcool',
        style: 'Style',
        tastingNotes: 'Notes de dégustation',
      },
      phase1: {
        title: 'Phase 1 : Fondation',
        subtitle: "Générateur d'étiquettes texte seulement à venir...",
        features: {
          projectSetup: '✓ Configuration du projet terminée',
          reactQuery: '✓ TanStack Query intégré',
          errorBoundaries: '✓ Suspense + Error Boundaries',
          inputForm: '⏳ Formulaire de saisie principal',
          styleSelection: '⏳ Système de sélection de style',
          labelPreview: "⏳ Aperçu d'étiquette texte seulement",
          exportFunctionality: "⏳ Fonctionnalité d'export de base",
        },
      },
      loading: {
        title: 'Chargement...',
        description: 'Récupération des données depuis le backend...',
      },
      error: {
        title: "Quelque chose s'est mal passé",
        tryAgain: 'Réessayer',
        detailsTitle: "Détails de l'erreur (Développement)",
        label: 'Erreur',
      },
      footer: {
        copyright: "© 2024 Winette. Donner aux vignerons les moyens de concevoir avec l'IA.",
      },
      wineForm: {
        title: 'Créez votre étiquette de vin',
        description:
          "Entrez les détails de votre vin ci-dessous pour commencer la conception d'étiquette assistée par IA",
        fields: {
          region: {
            label: 'Région vinicole',
            placeholder: 'ex. Bordeaux, Vallée de Napa, Toscane',
          },
          wineVariety: {
            label: 'Cépage',
            placeholder: 'ex. Cabernet Sauvignon, Chardonnay',
            optional: '(optionnel)',
          },
          producerName: {
            label: 'Nom du producteur',
            placeholder: 'Votre domaine viticole ou nom de producteur',
          },
          wineName: {
            label: 'Nom du vin',
            placeholder: 'ex. Grand Vin, Réserve, Domaine',
          },
          vintage: {
            label: 'Millésime',
            placeholder: 'ex. 2021',
          },
          appellation: {
            label: 'Appellation',
            placeholder: 'ex. AOC Bordeaux, AVA Napa Valley',
            optional: '(optionnel)',
          },
        },
        actions: {
          clear: 'Effacer',
          continue: 'Continuer',
          processing: 'Traitement...',
        },
        autocomplete: {
          noResults: 'Utiliser "{{query}}"',
          noResultsDefault: 'Aucun résultat trouvé',
          loading: 'Recherche...',
          suggestions: 'Suggestions de {{type}}',
          toggleAria: 'basculer le menu',
          toggleTitle: 'Basculer la liste',
        },
      },
      generation: {
        status: 'Statut',
        generationId: 'ID de génération',
      },
      api: {
        fetchError: 'Échec de la récupération du post',
      },
    };
    return Promise.resolve({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(payload)),
      json: () => Promise.resolve(payload),
    });
  }

  // Fallback for other URLs
  return Promise.reject(new Error(`Unmocked fetch URL: ${url}`));
});

// Mock NewRelic for tests
vi.mock('newrelic', () => ({
  default: {
    noticeError: vi.fn(),
    addCustomAttribute: vi.fn(),
    recordMetric: vi.fn(),
    incrementMetric: vi.fn(),
    setTransactionName: vi.fn(),
    addCustomAttributes: vi.fn(),
  },
}));

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    PROD: false,
    VITE_NEWRELIC_LICENSE_KEY: 'test-license-key',
    VITE_NEWRELIC_APPLICATION_ID: 'test-app-id',
  },
  writable: true,
});
