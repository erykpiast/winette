import newrelic from 'newrelic';
import { config } from './config.js';

// Initialize NewRelic with environment configuration
if (config.NEW_RELIC_LICENSE_KEY) {
  // NewRelic is configured via environment variables:
  // NEW_RELIC_LICENSE_KEY, NEW_RELIC_APP_NAME, NEW_RELIC_NO_CONFIG_FILE
  // The agent will auto-initialize when imported
}

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogContext {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Logger utility that sends logs and errors to NewRelic in production
 * Falls back to console methods in development or when NewRelic is not configured
 */
class Logger {
  #isNewRelicAvailable?: boolean;
  #isDevelopment?: boolean;

  private get isNewRelicAvailable(): boolean {
    if (this.#isNewRelicAvailable === undefined) {
      this.#isNewRelicAvailable = !!config.NEW_RELIC_LICENSE_KEY;
    }
    return this.#isNewRelicAvailable;
  }

  private get isDevelopment(): boolean {
    if (this.#isDevelopment === undefined) {
      this.#isDevelopment = config.NODE_ENV === 'development';
    }
    return this.#isDevelopment;
  }

  /**
   * Log an informational message
   */
  info(message: string, context?: LogContext): void {
    if (this.isNewRelicAvailable) {
      newrelic.recordLogEvent({
        message,
        level: 'info',
        timestamp: Date.now(),
        ...context,
      });
    }

    // Also log to console in development for immediate visibility
    if (this.isDevelopment) {
      if (context) {
        console.log(message, context);
      } else {
        console.log(message);
      }
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    if (this.isNewRelicAvailable) {
      newrelic.recordLogEvent({
        message,
        level: 'warn',
        timestamp: Date.now(),
        ...context,
      });
    }

    // Also log to console in development
    if (this.isDevelopment) {
      if (context) {
        console.warn(message, context);
      } else {
        console.warn(message);
      }
    }
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.isNewRelicAvailable) {
      // Report error to NewRelic if it's an Error object
      if (error instanceof Error) {
        // Filter context to only include values NewRelic accepts
        const filteredContext = context
          ? Object.fromEntries(
              Object.entries({ message, ...context })
                .filter(
                  ([, value]) => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean',
                )
                .map(([key, value]) => [key, value as string | number | boolean]),
            )
          : { message };
        newrelic.noticeError(error, filteredContext);
      }

      // Also log as a log event with error details in context
      const errorDetails =
        error instanceof Error
          ? {
              errorName: error.name,
              errorMessage: error.message,
              errorStack: error.stack || '',
            }
          : { errorMessage: String(error) };

      newrelic.recordLogEvent({
        message,
        level: 'error',
        timestamp: Date.now(),
        ...errorDetails,
        ...context,
      });
    }

    // Also log to console in development
    if (this.isDevelopment) {
      if (error && context) {
        console.error(message, error, context);
      } else if (error) {
        console.error(message, error);
      } else if (context) {
        console.error(message, context);
      } else {
        console.error(message);
      }
    }
  }

  /**
   * Log a debug message (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isNewRelicAvailable) {
      newrelic.recordLogEvent({
        message,
        level: 'debug',
        timestamp: Date.now(),
        ...context,
      });
    }

    // Debug logs always go to console in development
    if (this.isDevelopment) {
      if (context) {
        console.debug(message, context);
      } else {
        console.debug(message);
      }
    }
  }

  /**
   * Report an error to NewRelic without logging
   */
  reportError(error: Error, context?: LogContext): void {
    if (this.isNewRelicAvailable) {
      // Filter context to only include values NewRelic accepts
      const filteredContext = context
        ? Object.fromEntries(
            Object.entries(context)
              .filter(
                ([, value]) => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean',
              )
              .map(([key, value]) => [key, value as string | number | boolean]),
          )
        : undefined;
      newrelic.noticeError(error, filteredContext);
    }

    // In development, log to console for visibility
    if (this.isDevelopment) {
      console.error('Error reported:', error, context);
    }
  }

  /**
   * Add custom attributes to the current transaction
   */
  addCustomAttribute(key: string, value: string | number | boolean): void {
    if (this.isNewRelicAvailable) {
      newrelic.addCustomAttribute(key, value);
    }
  }

  /**
   * Set the name of the current transaction
   */
  setTransactionName(name: string): void {
    if (this.isNewRelicAvailable) {
      newrelic.setTransactionName(name);
    }
  }

  /**
   * Record a custom metric
   */
  recordMetric(name: string, value: number): void {
    if (this.isNewRelicAvailable) {
      newrelic.recordMetric(name, value);
    }
  }

  /**
   * Create a segment for timing operations
   */
  createSegment<T>(name: string, operation: () => T | Promise<T>): T | Promise<T> {
    if (this.isNewRelicAvailable) {
      return newrelic.startSegment(name, true, operation);
    }
    return operation();
  }
}

// Export a singleton instance
export const logger = new Logger();
