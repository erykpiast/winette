import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock fetch for i18next HTTP backend during testing
global.fetch = vi.fn().mockImplementation((url: string) => {
  // Mock translation files
  if (url.includes('/locales/en/translation.json')) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          brand: {
            name: 'Winette',
            tagline: 'AI-Powered Wine Label Designer',
          },
          hero: {
            title: 'Design Professional Wine Labels in Minutes',
            description:
              'Create beautiful, contextually appropriate wine bottle labels with AI-powered assistance. Enter your wine details and let our intelligent system generate professional designs for you.',
          },
          test: {
            title: 'TanStack Query Test',
            description: 'Testing backend communication with JSONPlaceholder API:',
            fetchButton: 'Fetch New Random Post',
            postTitle: 'Post #{{id}}',
            userId: 'User ID: {{userId}}',
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
          },
          footer: {
            copyright: '© 2024 Winette. Empowering winemakers with AI-assisted design.',
          },
          api: {
            fetchError: 'Failed to fetch post',
          },
        }),
    });
  }

  if (url.includes('/locales/fr/translation.json')) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          brand: {
            name: 'Winette',
            tagline: "Concepteur d'étiquettes de vin assisté par IA",
          },
          hero: {
            title: 'Concevez des étiquettes de vin professionnelles en quelques minutes',
            description:
              "Créez de belles étiquettes de bouteilles de vin adaptées au contexte avec l'assistance de l'IA. Entrez les détails de votre vin et laissez notre système intelligent générer des designs professionnels pour vous.",
          },
          test: {
            title: 'Test TanStack Query',
            description: "Test de communication backend avec l'API JSONPlaceholder :",
            fetchButton: 'Récupérer un nouveau post aléatoire',
            postTitle: 'Post #{{id}}',
            userId: 'ID utilisateur : {{userId}}',
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
          },
          footer: {
            copyright: "© 2024 Winette. Donner aux vignerons les moyens de concevoir avec l'IA.",
          },
          api: {
            fetchError: 'Échec de la récupération du post',
          },
        }),
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
