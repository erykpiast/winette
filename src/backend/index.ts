// Environment variables are loaded in config.ts before validation

// Initialize NewRelic APM first (must be before other imports)
if (process.env['NODE_ENV'] === 'production' && process.env['NEW_RELIC_LICENSE_KEY']) {
  require('newrelic');
}

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './lib/config.js';
import { initializeDatabase } from './lib/database.js';
import { errorHandler } from './middleware/error-handler.js';
import { observabilityMiddleware } from './middleware/observability.js';
import { rateLimiter } from './middleware/rate-limiter.js';
import { wineLabelsRouter } from './routes/wine-labels.js';

const app = express();

// Security middleware
app.use(
  helmet({
    crossOriginEmbedderPolicy: false, // Allow embedding for Vercel
    contentSecurityPolicy: false, // Disable CSP for API
  }),
);

// CORS configuration
app.use(
  cors({
    origin:
      config.NODE_ENV === 'production'
        ? ['https://winette.vercel.app', 'https://*.vercel.app']
        : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  }),
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Observability middleware
app.use(observabilityMiddleware);

// Rate limiting
app.use(rateLimiter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
  });
});

// API routes
app.use('/api/wine-labels', wineLabelsRouter);

// OpenAPI documentation endpoint
app.get('/api/openapi.json', (_req, res) => {
  res.json(require('./schema/openapi.json'));
});

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: 'The requested endpoint does not exist',
  });
});

// Global error handler
app.use(errorHandler);

const port = config.PORT || 3001;

// Initialize database
initializeDatabase().catch(console.error);

// For Vercel serverless functions
if (config.NODE_ENV === 'production') {
  module.exports = app;
} else {
  // For local development
  app.listen(port, () => {
    console.log(`🚀 Winette API server running on port ${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
    console.log(`📖 OpenAPI spec: http://localhost:${port}/api/openapi.json`);
  });
}

export default app;
