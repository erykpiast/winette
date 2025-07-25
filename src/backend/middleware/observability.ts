import type { NextFunction, Request, Response } from 'express';
import { config } from '../lib/config.js';

// Import NewRelic for observability
interface NewRelicAgent {
  noticeError(error: Error, customAttributes?: Record<string, string | number | boolean>): void;
  addCustomAttribute(name: string, value: string | number | boolean): void;
  recordMetric(name: string, value: number): void;
  incrementMetric(name: string, amount?: number): void;
  setTransactionName(category: string, name: string): void;
  addCustomAttributes(attributes: Record<string, string | number | boolean>): void;
}

let newrelic: NewRelicAgent | null = null;
if (config.NODE_ENV === 'production' && config.NEW_RELIC_LICENSE_KEY) {
  try {
    newrelic = require('newrelic');
  } catch (error) {
    console.warn('NewRelic not available:', error);
  }
}

/**
 * Middleware to add observability features to API endpoints
 */
export function observabilityMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Set custom attributes for the transaction
  if (newrelic) {
    newrelic.addCustomAttributes({
      'http.method': req.method,
      'http.url': req.url,
      'http.route': req.route?.path || req.path,
      'user.ip': req.ip || 'unknown',
      'user.agent': req.headers['user-agent'] || 'unknown',
    });

    // Set transaction name based on route
    const transactionName = `${req.method} ${req.route?.path || req.path}`;
    newrelic.setTransactionName('WebFrameworkUri', transactionName);
  }

  // Log request details in development
  if (config.NODE_ENV === 'development') {
    console.log(`${req.method} ${req.url} - ${req.ip}`);
  }

  // Intercept response to add metrics
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - startTime;

    // Record metrics
    if (newrelic) {
      newrelic.recordMetric('Custom/Response/Duration', duration);
      newrelic.recordMetric(`Custom/Response/StatusCode/${res.statusCode}`, 1);
      newrelic.incrementMetric('Custom/Requests/Total');

      // Add response attributes
      newrelic.addCustomAttributes({
        'http.status_code': res.statusCode,
        'http.response_time': duration,
        'http.response_size': data ? data.length : 0,
      });
    }

    // Log response details in development
    if (config.NODE_ENV === 'development') {
      console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
    }

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Helper function to record custom metrics
 */
export function recordCustomMetric(name: string, value: number): void {
  if (newrelic) {
    newrelic.recordMetric(`Custom/${name}`, value);
  }
}

/**
 * Helper function to increment custom metrics
 */
export function incrementCustomMetric(name: string, amount = 1): void {
  if (newrelic) {
    newrelic.incrementMetric(`Custom/${name}`, amount);
  }
}

/**
 * Helper function to add custom attributes to the current transaction
 */
export function addCustomAttributes(attributes: Record<string, string | number | boolean>): void {
  if (newrelic) {
    newrelic.addCustomAttributes(attributes);
  }
}
