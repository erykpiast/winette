// Test for global content-addressable storage paths

import { describe, expect, it } from 'vitest';
import { getContentAddressablePath, getStoragePath } from '#backend/lib/image-storage.js';

describe('Content-Addressable Storage', () => {
  describe('Global Content-Addressable Paths', () => {
    it('should generate deterministic content-addressable paths', () => {
      const checksum = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab';
      const format = 'png';

      const path = getContentAddressablePath(checksum, format);

      expect(path).toBe('content/abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab.png');
    });

    it('should handle different formats', () => {
      const checksum = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12';

      expect(getContentAddressablePath(checksum, 'png')).toBe(
        'content/1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12.png',
      );
      expect(getContentAddressablePath(checksum, 'jpg')).toBe(
        'content/1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12.jpg',
      );
      expect(getContentAddressablePath(checksum, 'webp')).toBe(
        'content/1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12.webp',
      );
    });

    it('should ensure same checksum = same path (global deduplication)', () => {
      const checksum = 'shared1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc';
      const format = 'png';

      // Same content should always get same URL regardless of context
      const path1 = getContentAddressablePath(checksum, format);
      const path2 = getContentAddressablePath(checksum, format);

      expect(path1).toBe(path2);
      expect(path1).toBe('content/shared1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc.png');
    });

    it('should ensure different checksums = different paths', () => {
      const checksum1 = 'content1567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const checksum2 = 'content2567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const format = 'png';

      const path1 = getContentAddressablePath(checksum1, format);
      const path2 = getContentAddressablePath(checksum2, format);

      expect(path1).not.toBe(path2);
      expect(path1).toBe('content/content1567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef.png');
      expect(path2).toBe('content/content2567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef.png');
    });

    it('should use full checksum for collision prevention', () => {
      // Two checksums that share first 12 characters but differ later
      const checksum1 = 'abcdef123456DIFFERENT1234567890abcdef1234567890abcdef1234567890';
      const checksum2 = 'abcdef123456DIFFERENT7890abcdef1234567890abcdef1234567890abcdef12';
      const format = 'png';

      const path1 = getContentAddressablePath(checksum1, format);
      const path2 = getContentAddressablePath(checksum2, format);

      expect(path1).not.toBe(path2);
      expect(path1).toBe('content/abcdef123456DIFFERENT1234567890abcdef1234567890abcdef1234567890.png');
      expect(path2).toBe('content/abcdef123456DIFFERENT7890abcdef1234567890abcdef1234567890abcdef12.png');
    });
  });

  describe('Legacy Path Generation (Backward Compatibility)', () => {
    it('should generate deterministic paths with checksum', () => {
      const generationId = 'gen-123';
      const assetId = 'background';
      const format = 'png';
      const checksum = 'abcdef1234567890abcdef1234567890abcdef12';

      const path = getStoragePath(generationId, assetId, format, checksum);

      expect(path).toBe('gen/gen-123/background-abcdef123456.png');
    });

    it('should generate legacy paths without checksum', () => {
      const generationId = 'gen-123';
      const assetId = 'background';
      const format = 'png';

      const path = getStoragePath(generationId, assetId, format);

      expect(path).toBe('gen/gen-123/background.png');
    });
  });
});
