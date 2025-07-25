import { useRandomWineLabel } from '#hooks/useWineLabels';
import type { components } from '#types/api';

// Re-export the wine label interface for backward compatibility
export type WineLabel = components['schemas']['WineLabel'];

/**
 * Hook for fetching a random wine label from our backend
 * Replaces the old JSONPlaceholder implementation
 */
export function useRandomPost() {
  return useRandomWineLabel();
}
