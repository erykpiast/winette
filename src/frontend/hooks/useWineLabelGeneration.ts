import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ApiClientError, apiClient } from '#lib/api-client';
import { reportApiError } from '#lib/error-reporting';
import type { WineInputFormData } from './useWineFormValidation';

// Backend API response types (from Phase 1.3.2)
interface SubmitWineLabelResponse {
  submissionId: string;
  generationId: string;
  statusUrl: string;
  queueMessageId?: string;
}

export interface GenerationStatus {
  id: string;
  submissionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  description?: LabelDescription;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

interface LabelDescription {
  colorPalette: {
    primary: { hex: string; rgb: [number, number, number]; name: string };
    secondary: { hex: string; rgb: [number, number, number]; name: string };
    accent: { hex: string; rgb: [number, number, number]; name: string };
    background: { hex: string; rgb: [number, number, number]; name: string };
    temperature: 'warm' | 'cool' | 'neutral';
    contrast: 'high' | 'medium' | 'low';
  };
  typography: {
    primary: {
      family: string;
      weight: number;
      style: 'normal' | 'italic';
      letterSpacing: number;
      characteristics: string[];
    };
    secondary: {
      family: string;
      weight: number;
      style: 'normal' | 'italic';
      letterSpacing: number;
      characteristics: string[];
    };
    hierarchy: {
      producerEmphasis: 'dominant' | 'balanced' | 'subtle';
      vintageProminence: 'featured' | 'standard' | 'minimal';
      regionDisplay: 'prominent' | 'integrated' | 'subtle';
    };
  };
  layout: {
    alignment: 'centered' | 'left' | 'right' | 'asymmetric';
    composition: 'classical' | 'dynamic' | 'minimal' | 'ornate';
    whitespace: 'generous' | 'balanced' | 'compact';
    structure: 'rigid' | 'organic' | 'geometric';
  };
  imagery: {
    primaryTheme: 'vineyard' | 'cellar' | 'estate' | 'abstract' | 'botanical' | 'geometric';
    elements: string[];
    style: 'photographic' | 'illustration' | 'watercolor' | 'engraving' | 'minimal' | 'art';
    complexity: 'simple' | 'moderate' | 'detailed';
  };
  decorations: Array<{
    type: 'border' | 'frame' | 'flourish' | 'pattern' | 'divider';
    theme: string;
    placement: 'full' | 'corners' | 'top-bottom' | 'accent';
    weight: 'delicate' | 'moderate' | 'bold';
  }>;
  mood: {
    overall: string;
    attributes: string[];
  };
}

// Transform form data to backend API format
function transformFormDataToSubmission(formData: WineInputFormData) {
  return {
    producerName: formData.producerName,
    wineName: formData.wineName,
    vintage: formData.vintage,
    variety: formData.wineVariety || 'Unknown',
    region: formData.region,
    appellation: formData.appellation || 'Unknown',
    style: formData.style,
  };
}

/**
 * Hook for submitting wine label generation requests
 */
export function useSubmitWineLabelGeneration() {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (formData: WineInputFormData) => {
      try {
        const submissionData = transformFormDataToSubmission(formData);
        const response = await apiClient.post<SubmitWineLabelResponse>('/api/wine-labels', submissionData);

        if (!response.success || !response.data) {
          throw new Error('Failed to submit wine label generation request');
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
        throw new Error(t('api.submitError') || 'Failed to submit wine label generation request');
      }
    },
  });
}

/**
 * Hook for polling generation status
 */
export function useGenerationStatus(generationId: string | null, options: { enabled?: boolean } = {}) {
  const { t } = useTranslation();

  return useQuery({
    queryKey: ['generationStatus', generationId],
    queryFn: async () => {
      if (!generationId) {
        throw new Error('Generation ID is required');
      }

      try {
        const response = await apiClient.get<GenerationStatus>(`/api/wine-labels/generations/${generationId}`);

        if (!response.success || !response.data) {
          throw new Error('Failed to fetch generation status');
        }

        return response.data;
      } catch (error) {
        const apiError = error instanceof Error ? error : new Error(String(error));

        // Report API error to NewRelic
        const requestContext: Parameters<typeof reportApiError>[1] = {
          endpoint: `/api/wine-labels/generations/${generationId}`,
          method: 'GET',
        };
        if (error instanceof ApiClientError) {
          requestContext.status = error.statusCode;
        }
        reportApiError(apiError, requestContext);

        if (error instanceof ApiClientError) {
          if (error.statusCode === 404) {
            throw new Error(t('api.generation.notFound') || 'Generation not found');
          }
          throw new Error(error.message);
        }
        throw new Error(t('api.fetchError') || 'Failed to fetch generation status');
      }
    },
    enabled: !!generationId && options.enabled !== false,
    refetchInterval: (query) => {
      // Poll every 2 seconds while pending or processing
      const data = query.state.data;
      if (data?.status === 'pending' || data?.status === 'processing') {
        return 2000;
      }
      // Stop polling when completed or failed
      return false;
    },
    retry: (failureCount, error) => {
      // Don't retry 404 errors (generation not found)
      if (error instanceof Error && error.message.includes('not found')) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
  });
}

/**
 * Hook that combines submission and status polling
 */
export function useWineLabelGenerationFlow() {
  const submitMutation = useSubmitWineLabelGeneration();

  const statusQuery = useGenerationStatus(submitMutation.data?.generationId || null, {
    enabled: !!submitMutation.data?.generationId,
  });

  return {
    // Submission state
    submit: submitMutation.mutate,
    isSubmitting: submitMutation.isPending,
    submitError: submitMutation.error?.message,
    submissionData: submitMutation.data,

    // Status polling state
    generationStatus: statusQuery.data,
    isPolling: statusQuery.isFetching,
    statusError: statusQuery.error?.message,

    // Computed states
    isCompleted: statusQuery.data?.status === 'completed',
    isFailed: statusQuery.data?.status === 'failed',
    isProcessing: statusQuery.data?.status === 'processing' || statusQuery.data?.status === 'pending',

    // Reset function
    reset: () => {
      submitMutation.reset();
    },
  };
}
