import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ApiClientError, apiClient } from '#lib/api-client';
import { reportApiError } from '#lib/error-reporting';
import type { components } from '#types/api';

// Type aliases for better readability
type WineLabel = components['schemas']['WineLabel'];
type CreateWineLabelRequest = components['schemas']['CreateWineLabelRequest'];
type UpdateWineLabelRequest = components['schemas']['UpdateWineLabelRequest'];
type WineStyle = components['schemas']['WineStyle'];

interface GetWineLabelsParams {
  style?: WineStyle;
  region?: string;
  limit?: number;
  offset?: number;
}

interface UseWineLabelsResult {
  data: WineLabel[];
  total: number;
  hasMore: boolean;
  cached: boolean;
}

/**
 * Hook for fetching wine labels with optional filtering and pagination
 */
export function useWineLabels(params: GetWineLabelsParams = {}) {
  const { t } = useTranslation();

  return useSuspenseQuery({
    queryKey: ['wineLabels', params],
    queryFn: async () => {
      try {
        // Convert params to string/number record for API client
        const queryParams: Record<string, string | number> = {};
        if (params.style) queryParams.style = params.style;
        if (params.region) queryParams.region = params.region;
        if (params.limit) queryParams.limit = params.limit;
        if (params.offset) queryParams.offset = params.offset;

        const response = await apiClient.get<WineLabel[]>('/api/wine-labels', queryParams);

        if (!response.success || !response.data) {
          throw new Error('Invalid response from server');
        }

        return {
          data: response.data,
          total: response.total || 0,
          hasMore: response.hasMore || false,
          cached: response.cached || false,
        } as UseWineLabelsResult;
      } catch (error) {
        const apiError = error instanceof Error ? error : new Error(String(error));

        // Report API error to NewRelic
        const requestContext: Parameters<typeof reportApiError>[1] = {
          endpoint: '/api/wine-labels',
          method: 'GET',
        };
        if (error instanceof ApiClientError) {
          requestContext.status = error.statusCode;
        }
        reportApiError(apiError, requestContext);

        if (error instanceof ApiClientError) {
          throw new Error(error.message);
        }
        throw new Error(t('api.fetchError'));
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook for fetching a single wine label by ID
 */
export function useWineLabel(id: string) {
  const { t } = useTranslation();

  return useQuery({
    queryKey: ['wineLabel', id],
    queryFn: async () => {
      try {
        const response = await apiClient.get<WineLabel>(`/api/wine-labels/${id}`);

        if (!response.success || !response.data) {
          throw new Error('Wine label not found');
        }

        return response.data;
      } catch (error) {
        const apiError = error instanceof Error ? error : new Error(String(error));

        // Report API error to NewRelic
        const requestContext: Parameters<typeof reportApiError>[1] = {
          endpoint: `/api/wine-labels/${id}`,
          method: 'GET',
        };
        if (error instanceof ApiClientError) {
          requestContext.status = error.statusCode;
        }
        reportApiError(apiError, requestContext);

        if (error instanceof ApiClientError) {
          if (error.statusCode === 404) {
            throw new Error(t('api.wineLabel.notFound'));
          }
          throw new Error(error.message);
        }
        throw new Error(t('api.fetchError'));
      }
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: !!id,
  });
}

/**
 * Hook for creating a new wine label
 */
export function useCreateWineLabel() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateWineLabelRequest) => {
      try {
        const response = await apiClient.post<WineLabel>('/api/wine-labels', data);

        if (!response.success || !response.data) {
          throw new Error('Failed to create wine label');
        }

        return response.data;
      } catch (error) {
        const apiError = error instanceof Error ? error : new Error(String(error));

        // Report API error to NewRelic
        const requestContext: Parameters<typeof reportApiError>[1] = {
          endpoint: '/api/wine-labels',
          method: 'POST',
        };
        if (error instanceof ApiClientError) {
          requestContext.status = error.statusCode;
        }
        reportApiError(apiError, requestContext);

        if (error instanceof ApiClientError) {
          // Handle validation errors
          if (error.statusCode === 400 && error.details) {
            const fieldErrors = error.details.map((d) => `${d.field}: ${d.message}`).join(', ');
            throw new Error(`${t('api.validation.failed')}: ${fieldErrors}`);
          }
          throw new Error(error.message);
        }
        throw new Error(t('api.createError'));
      }
    },
    onSuccess: (newWineLabel) => {
      // Invalidate and refetch wine labels list
      queryClient.invalidateQueries({ queryKey: ['wineLabels'] });

      // Add the new wine label to the cache
      queryClient.setQueryData(['wineLabel', newWineLabel.id], newWineLabel);
    },
  });
}

/**
 * Hook for updating a wine label
 */
export function useUpdateWineLabel() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateWineLabelRequest }) => {
      try {
        const response = await apiClient.put<WineLabel>(`/api/wine-labels/${id}`, data);

        if (!response.success || !response.data) {
          throw new Error('Failed to update wine label');
        }

        return response.data;
      } catch (error) {
        const apiError = error instanceof Error ? error : new Error(String(error));

        // Report API error to NewRelic
        const requestContext: Parameters<typeof reportApiError>[1] = {
          endpoint: `/api/wine-labels/${id}`,
          method: 'PUT',
        };
        if (error instanceof ApiClientError) {
          requestContext.status = error.statusCode;
        }
        reportApiError(apiError, requestContext);

        if (error instanceof ApiClientError) {
          if (error.statusCode === 404) {
            throw new Error(t('api.wineLabel.notFound'));
          }
          if (error.statusCode === 400 && error.details) {
            const fieldErrors = error.details.map((d) => `${d.field}: ${d.message}`).join(', ');
            throw new Error(`${t('api.validation.failed')}: ${fieldErrors}`);
          }
          throw new Error(error.message);
        }
        throw new Error(t('api.updateError'));
      }
    },
    onSuccess: (updatedWineLabel) => {
      // Update wine labels list cache
      queryClient.invalidateQueries({ queryKey: ['wineLabels'] });

      // Update the specific wine label cache
      queryClient.setQueryData(['wineLabel', updatedWineLabel.id], updatedWineLabel);
    },
  });
}

/**
 * Hook for deleting a wine label
 */
export function useDeleteWineLabel() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        const response = await apiClient.delete(`/api/wine-labels/${id}`);

        if (!response.success) {
          throw new Error('Failed to delete wine label');
        }

        return { id };
      } catch (error) {
        const apiError = error instanceof Error ? error : new Error(String(error));

        // Report API error to NewRelic
        const requestContext: Parameters<typeof reportApiError>[1] = {
          endpoint: `/api/wine-labels/${id}`,
          method: 'DELETE',
        };
        if (error instanceof ApiClientError) {
          requestContext.status = error.statusCode;
        }
        reportApiError(apiError, requestContext);

        if (error instanceof ApiClientError) {
          if (error.statusCode === 404) {
            throw new Error(t('api.wineLabel.notFound'));
          }
          throw new Error(error.message);
        }
        throw new Error(t('api.deleteError'));
      }
    },
    onSuccess: ({ id }) => {
      // Remove from wine labels list cache
      queryClient.invalidateQueries({ queryKey: ['wineLabels'] });

      // Remove the specific wine label from cache
      queryClient.removeQueries({ queryKey: ['wineLabel', id] });
    },
  });
}

/**
 * Hook for getting a random wine label (replaces the JSONPlaceholder functionality)
 */
export function useRandomWineLabel() {
  const { t } = useTranslation();

  return useSuspenseQuery({
    queryKey: ['randomWineLabel'],
    queryFn: async () => {
      try {
        // Get the first wine label from a random fetch
        const response = await apiClient.get<WineLabel[]>('/api/wine-labels', {
          limit: 1,
          offset: Math.floor(Math.random() * 10), // Random offset for variety
        });

        if (!response.success || !response.data || response.data.length === 0) {
          throw new Error('No wine labels found');
        }

        return response.data[0];
      } catch (error) {
        const apiError = error instanceof Error ? error : new Error(String(error));

        // Report API error to NewRelic
        const requestContext: Parameters<typeof reportApiError>[1] = {
          endpoint: '/api/wine-labels',
          method: 'GET',
        };
        if (error instanceof ApiClientError) {
          requestContext.status = error.statusCode;
        }
        reportApiError(apiError, requestContext);

        if (error instanceof ApiClientError) {
          throw new Error(error.message);
        }
        throw new Error(t('api.fetchError'));
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
