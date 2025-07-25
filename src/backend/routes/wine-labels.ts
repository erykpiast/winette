import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { CacheService } from '../lib/cache.js';
import { supabase, type WineLabel } from '../lib/database.js';
import { asyncHandler, createApiError } from '../middleware/error-handler.js';
import { apiRateLimiter } from '../middleware/rate-limiter.js';

const router = Router();

// Zod schemas for validation
const WineStyleSchema = z.enum(['red', 'white', 'rosé', 'sparkling', 'dessert']);

const CreateWineLabelSchema = z.object({
  name: z.string().min(1).max(100),
  winery: z.string().min(1).max(100),
  vintage: z
    .number()
    .int()
    .min(1800)
    .max(new Date().getFullYear() + 2),
  region: z.string().min(1).max(200),
  grape_variety: z.string().min(1).max(200),
  alcohol_content: z.number().min(0).max(50),
  tasting_notes: z.string().max(1000),
  style: WineStyleSchema,
});

const GetWineLabelsQuerySchema = z.object({
  style: WineStyleSchema.optional(),
  region: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

const WineLabelParamsSchema = z.object({
  id: z.string().uuid(),
});

/**
 * GET /api/wine-labels
 * Get wine labels with optional filtering and pagination
 */
router.get(
  '/',
  apiRateLimiter,
  asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    // Validate query parameters
    const query = GetWineLabelsQuerySchema.parse(req.query);

    // Create cache key based on query parameters
    const cacheKey = `wine_labels:${JSON.stringify(query)}`;

    // Try to get from cache first
    const cachedResult = await CacheService.get<{
      data: WineLabel[];
      total: number;
      hasMore: boolean;
    }>(cacheKey);

    if (cachedResult) {
      res.json({
        success: true,
        data: cachedResult.data,
        total: cachedResult.total,
        hasMore: cachedResult.hasMore,
        cached: true,
      });
      return;
    }

    // Build query
    let dbQuery = supabase
      .from('wine_labels')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(query.offset, query.offset + query.limit - 1);

    // Apply filters
    if (query.style) {
      dbQuery = dbQuery.eq('style', query.style);
    }

    if (query.region) {
      dbQuery = dbQuery.ilike('region', `%${query.region}%`);
    }

    const { data, error, count } = await dbQuery;

    if (error) {
      console.error('📊 Supabase error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw createApiError(`Failed to fetch wine labels: ${error.message}`, 500, 'DATABASE_ERROR');
    }

    const total = count || 0;
    const hasMore = query.offset + query.limit < total;

    const result = {
      data: data || [],
      total,
      hasMore,
    };

    // Cache the result for 5 minutes
    await CacheService.set(cacheKey, result, 300);

    res.json({
      success: true,
      ...result,
      cached: false,
    });
  }),
);

/**
 * GET /api/wine-labels/:id
 * Get a specific wine label by ID
 */
router.get(
  '/:id',
  apiRateLimiter,
  asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { id } = WineLabelParamsSchema.parse(req.params);

    // Check cache first
    const cacheKey = `wine_label:${id}`;
    const cachedLabel = await CacheService.get<WineLabel>(cacheKey);

    if (cachedLabel) {
      res.json({
        success: true,
        data: cachedLabel,
        cached: true,
      });
      return;
    }

    const { data, error } = await supabase.from('wine_labels').select('*').eq('id', id).single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw createApiError('Wine label not found', 404, 'NOT_FOUND');
      }
      throw createApiError('Failed to fetch wine label', 500, 'DATABASE_ERROR');
    }

    // Cache for 10 minutes
    await CacheService.set(cacheKey, data, 600);

    res.json({
      success: true,
      data,
      cached: false,
    });
  }),
);

/**
 * POST /api/wine-labels
 * Create a new wine label
 */
router.post(
  '/',
  apiRateLimiter,
  asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const labelData = CreateWineLabelSchema.parse(req.body);

    const { data, error } = await supabase.from('wine_labels').insert(labelData).select().single();

    if (error) {
      throw createApiError('Failed to create wine label', 500, 'DATABASE_ERROR');
    }

    // Invalidate related caches
    await CacheService.delete(`wine_label:${data.id}`);
    // Clear paginated results cache (simplified approach)
    // In production, you might want more sophisticated cache invalidation

    res.status(201).json({
      success: true,
      data,
    });
  }),
);

/**
 * PUT /api/wine-labels/:id
 * Update a wine label
 */
router.put(
  '/:id',
  apiRateLimiter,
  asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { id } = WineLabelParamsSchema.parse(req.params);
    const labelData = CreateWineLabelSchema.partial().parse(req.body);

    const { data, error } = await supabase.from('wine_labels').update(labelData).eq('id', id).select().single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw createApiError('Wine label not found', 404, 'NOT_FOUND');
      }
      throw createApiError('Failed to update wine label', 500, 'DATABASE_ERROR');
    }

    // Invalidate cache
    await CacheService.delete(`wine_label:${id}`);

    res.json({
      success: true,
      data,
    });
  }),
);

/**
 * DELETE /api/wine-labels/:id
 * Delete a wine label
 */
router.delete(
  '/:id',
  apiRateLimiter,
  asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { id } = WineLabelParamsSchema.parse(req.params);

    const { error } = await supabase.from('wine_labels').delete().eq('id', id);

    if (error) {
      throw createApiError('Failed to delete wine label', 500, 'DATABASE_ERROR');
    }

    // Invalidate cache
    await CacheService.delete(`wine_label:${id}`);

    res.json({
      success: true,
      message: 'Wine label deleted successfully',
    });
  }),
);

export { router as wineLabelsRouter };
