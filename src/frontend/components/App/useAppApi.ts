import { useRandomWineLabel } from '../../hooks/useWineLabels.js';
import type { components } from '../../types/api.js';

// Re-export the wine label interface for backward compatibility
export type WineLabel = components['schemas']['WineLabel'];

/**
 * Hook for fetching a random wine label from our backend
 * Replaces the old JSONPlaceholder implementation
 */
export function useRandomPost() {
  return useRandomWineLabel();
}
