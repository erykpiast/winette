import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { config } from '../lib/config.js';

// Import NewRelic for error reporting
interface NewRelicAgent {
  noticeError(error: Error, customAttributes?: Record<string, string | number | boolean>): void;
  addCustomAttribute(name: string, value: string | number | boolean): void;
}

let newrelic: NewRelicAgent | null = null;
if (config.NODE_ENV === 'production' && config.NEW_RELIC_LICENSE_KEY) {
  try {
    newrelic = require('newrelic');
  } catch (error) {
    console.warn('NewRelic not available:', error);
  }
}

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Global error handler middleware
 */
export function errorHandler(error: ApiError, req: Request, res: Response, _next: NextFunction): void {
  // Log error details
  console.error('API Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip || 'unknown',
  });

  // Report to NewRelic in production
  if (config.NODE_ENV === 'production' && newrelic) {
    newrelic.noticeError(error, {
      'custom.source': 'api-error',
      'custom.method': req.method,
      'custom.endpoint': req.path,
      'custom.url': req.url,
      'custom.ip': req.ip || 'unknown',
      'custom.userAgent': req.headers['user-agent'] || 'unknown',
    });
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      message: 'Invalid request data',
      details: error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    });
    return;
  }

  // Handle known API errors
  if (error.statusCode) {
    res.status(error.statusCode).json({
      error: error.code || 'API Error',
      message: error.message,
    });
    return;
  }

  // Handle database errors
  if (error.message.includes('PGRST') || error.message.includes('PostgreSQL')) {
    res.status(500).json({
      error: 'Database error',
      message: 'A database operation failed. Please try again.',
    });
    return;
  }

  // Default error response
  const statusCode = 500;
  const message = config.NODE_ENV === 'production' ? 'Internal server error' : error.message;

  res.status(statusCode).json({
    error: 'Internal Server Error',
    message,
    ...(config.NODE_ENV === 'development' && { stack: error.stack }),
  });
}

/**
 * Create an API error with status code
 */
export function createApiError(message: string, statusCode = 500, code?: string): ApiError {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  if (code !== undefined) {
    error.code = code;
  }
  return error;
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
