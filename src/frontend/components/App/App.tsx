import type { ErrorInfo, JSX } from 'react';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AppContent } from './AppContent';
import { ErrorFallback } from './ErrorFallback';
import { LoadingFallback } from './LoadingFallback';

/**
 * Error handler for the ErrorBoundary
 */
function handleError(error: Error, errorInfo: ErrorInfo) {
  // Log error details to console in development
  if (import.meta.env.DEV) {
    console.error('Error caught by boundary:', error);
    console.error('Component stack:', errorInfo.componentStack);
  }

  // Report to NewRelic in production
  if (import.meta.env.PROD && window.newrelic) {
    window.newrelic.noticeError(error, {
      source: 'error-boundary',
      componentStack: errorInfo.componentStack || 'unknown',
    });
  }
}

export default function App(): JSX.Element {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onError={handleError}>
      <Suspense fallback={<LoadingFallback />}>
        <AppContent />
      </Suspense>
    </ErrorBoundary>
  );
}
