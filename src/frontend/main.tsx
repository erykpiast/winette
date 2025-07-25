import { App } from '#components/App';
import { I18nProvider } from '#components/I18nProvider';
import { initializeGlobalErrorHandlers } from '#lib/error-reporting';
import '#styles/reset.css.ts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Initialize NewRelic Browser Agent
if (import.meta.env.PROD && import.meta.env.VITE_NEWRELIC_LICENSE_KEY) {
  (() => {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.innerHTML = `
      window.NREUM||(NREUM={});
      NREUM.info = {
        "beacon": "bam.nr-data.net",
        "licenseKey": "${import.meta.env.VITE_NEWRELIC_LICENSE_KEY}",
        "applicationID": "${import.meta.env.VITE_NEWRELIC_APPLICATION_ID}",
        "transactionName": "",
        "queueTime": 0,
        "applicationTime": 0,
        "ttGuid": "",
        "agentToken": "",
        "agent": ""
      };
    `;
    document.head.appendChild(script);

    // Load the NewRelic browser agent
    const agentScript = document.createElement('script');
    agentScript.src = 'https://js-agent.newrelic.com/nr-loader-spa-current.min.js';
    agentScript.async = true;
    document.head.appendChild(agentScript);
  })();
}

// Initialize global error handlers for comprehensive error tracking
initializeGlobalErrorHandlers();

// Create QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);

root.render(
  <StrictMode>
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <App />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </I18nProvider>
  </StrictMode>,
);
