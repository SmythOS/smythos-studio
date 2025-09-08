/**
 * Tests for general utilities - following KISS principle
 */
import { describe, it, expect, vi } from 'vitest';
import { uid, hasKeyTemplateVar, parseTemplate, fsExists } from '@core/utils/general.utils';

vi.mock('fs/promises', () => ({
  default: { access: vi.fn() },
}));

describe('General Utils', () => {
  describe('uid', () => {
    it('generates unique strings', () => {
      const id1 = uid();
      const id2 = uid();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^[A-Z0-9]+$/);
    });
  });

  describe('hasKeyTemplateVar', () => {
    it('detects KEY template variables', () => {
      expect(hasKeyTemplateVar('{{KEY(test)}}')).toBe(true);
      expect(hasKeyTemplateVar('{{normal}}')).toBe(false);
      expect(hasKeyTemplateVar('')).toBe(false);
    });
  });

  describe('parseTemplate', () => {
    it('replaces template variables', () => {
      const result = parseTemplate('Hello {{name}}', { name: 'John' });
      expect(result).toBe('Hello John');
    });

    it('preserves KEY variables', () => {
      const result = parseTemplate('{{KEY(secret)}} {{name}}', { name: 'John' });
      expect(result).toBe('{{KEY(secret)}} John');
    });

    it('handles false values', () => {
      const result = parseTemplate('{{active}}', { active: false });
      expect(result).toBe('false');
    });
  });

  describe('fsExists', () => {
    it('returns true when file exists', async () => {
      const fs = await import('fs/promises');
      (fs.default.access as any).mockResolvedValue(undefined);

      const result = await fsExists('/test/path');
      expect(result).toBe(true);
    });

    it('returns false when file does not exist', async () => {
      const fs = await import('fs/promises');
      (fs.default.access as any).mockRejectedValue(new Error('ENOENT'));

      const result = await fsExists('/missing');
      expect(result).toBe(false);
    });
  });
});
