import type { Preview } from '@storybook/react';
import { initialize, mswLoader } from 'msw-storybook-addon';
import { handlers } from '../src/frontend/mocks/handlers.js';
import '../src/frontend/styles/reset.css.ts';

// Initialize MSW with error handling for production builds
try {
  initialize({
    onUnhandledRequest: 'warn',
    serviceWorker: {
      url: window.location.pathname.includes('/winette/') ? '/winette/mockServiceWorker.js' : './mockServiceWorker.js',
    },
  });
} catch (error) {
  console.warn('MSW initialization failed:', error);
  console.warn('Storybook will continue without mocking capabilities');
}

export default {
  loaders: [mswLoader],
  parameters: {
    msw: {
      handlers,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
} satisfies Preview;
