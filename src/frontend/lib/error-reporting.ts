/// <reference types="vite/client" />
/**
 * Comprehensive error reporting utilities for NewRelic integration
 */

interface ErrorContext {
  source?: string;
  componentStack?: string;
  errorBoundary?: boolean;
  userId?: string;
  action?: string;
  additional?: Record<string, string | number | boolean>;
}

/**
 * Get browser and environment context for error reporting
 */
function getErrorContext(): Record<string, string | number | boolean> {
  return {
    userAgent: navigator.userAgent,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    platform: navigator.platform,
    language: navigator.language,
    connectionType: (navigator as { connection?: { effectiveType?: string } }).connection?.effectiveType || 'unknown',
    isOnline: navigator.onLine,
    environment: import.meta.env.MODE || 'unknown',
    buildVersion: import.meta.env.VITE_BUILD_VERSION || 'unknown',
  };
}

declare global {
  interface Window {
    newrelic?: {
      noticeError: (error: Error, attributes?: Record<string, string | number | boolean>) => void;
      setCustomAttribute: (key: string, value: string | number | boolean) => void;
      addPageAction: (actionName: string, attributes?: Record<string, string | number | boolean>) => void;
    };
  }
}

/**
 * Report errors to NewRelic with enhanced context
 */
export function reportError(error: Error, context: ErrorContext = {}): void {
  // Always log to console in development
  if (import.meta.env.DEV) {
    console.error('Error reported:', error);
    console.error('Context:', context);
  }

  // Report to NewRelic if available
  if (window.newrelic?.noticeError) {
    const baseContext = getErrorContext();
    const additionalContext = context.additional || {};

    // Flatten all attributes to match NewRelic's expected format
    const errorAttributes: Record<string, string | number | boolean> = {
      ...baseContext,
      errorName: error.name,
      errorMessage: error.message,
      stackTrace: error.stack || 'No stack trace available',
      ...(context.source && { 'error.source': context.source }),
      ...(context.componentStack && { 'error.componentStack': context.componentStack }),
      ...(context.errorBoundary !== undefined && { 'error.fromBoundary': context.errorBoundary }),
      ...(context.userId && { 'user.id': context.userId }),
      ...(context.action && { 'user.action': context.action }),
      ...additionalContext,
    };

    try {
      window.newrelic.noticeError(error, errorAttributes);

      // Additional custom attributes are already included in errorAttributes above
    } catch (reportingError) {
      // Fail silently but log in development
      if (import.meta.env.DEV) {
        console.error('Failed to report error to NewRelic:', reportingError);
      }
    }
  }
}

/**
 * Report custom events and user actions to NewRelic
 */
export function reportPageAction(actionName: string, attributes: Record<string, string | number | boolean> = {}): void {
  if (window.newrelic?.addPageAction) {
    try {
      window.newrelic.addPageAction(actionName, {
        ...attributes,
        timestamp: Date.now(),
        url: window.location.href,
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to report page action to NewRelic:', error);
      }
    }
  }
}

/**
 * Set custom attributes for the current user session
 */
export function setUserContext(userId: string, userAttributes: Record<string, string | number | boolean> = {}): void {
  if (window.newrelic?.setCustomAttribute) {
    try {
      window.newrelic.setCustomAttribute('user.id', userId);

      Object.entries(userAttributes).forEach(([key, value]) => {
        if (
          (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') &&
          window.newrelic?.setCustomAttribute
        ) {
          window.newrelic.setCustomAttribute(`user.${key}`, value);
        }
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to set user context in NewRelic:', error);
      }
    }
  }
}

/**
 * Report API errors with request context
 */
export function reportApiError(
  error: Error,
  requestContext: {
    endpoint: string;
    method: string;
    status?: number;
    duration?: number;
  },
): void {
  reportError(error, {
    source: 'api-request',
    action: `${requestContext.method} ${requestContext.endpoint}`,
    additional: {
      endpoint: requestContext.endpoint,
      method: requestContext.method,
      status: requestContext.status ?? 0,
      duration: requestContext.duration ?? 0,
      isApiError: true,
    },
  });
}

/**
 * Initialize global error handlers
 */
export function initializeGlobalErrorHandlers(): void {
  // Handle unhandled JavaScript errors
  window.addEventListener('error', (event) => {
    reportError(event.error || new Error(event.message), {
      source: 'global-error-handler',
      additional: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'javascript-error',
      },
    });
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));

    reportError(error, {
      source: 'global-promise-rejection',
      additional: {
        type: 'unhandled-promise-rejection',
        reason: String(event.reason),
      },
    });
  });

  // Handle resource loading errors
  window.addEventListener(
    'error',
    (event) => {
      if (event.target && event.target !== window) {
        const target = event.target as HTMLElement;
        reportError(new Error(`Resource loading failed: ${target.tagName}`), {
          source: 'resource-loading-error',
          additional: {
            tagName: target.tagName,
            src: (target as HTMLImageElement).src || (target as HTMLAnchorElement).href || '',
            type: 'resource-error',
          },
        });
      }
    },
    true,
  );

  if (import.meta.env.DEV) {
    console.log('Global error handlers initialized');
  }
}
