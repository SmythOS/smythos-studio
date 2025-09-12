/**
 * Unit tests for chat utilities
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import {
  buildConversationId,
  parseDateFromConvId,
  getChatPrefixByEnv,
  parseDateRange,
  isValidDateRange,
  CHAT_PREFIXES,
} from '@core/utils/chat.utils';

// Mock crypto
vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn(() => ({
      toString: vi.fn(() => 'abcd1234'),
    })),
  },
}));

// Mock date-time utils
vi.mock('@core/utils/date-time.utils', () => ({
  getCurrentFormattedDate: vi.fn(() => '2023-12-25-15-30-45'),
  toDateFromFormattedDateStr: vi.fn((dateStr: string) => {
    const [year, month, day, hour, minute, second] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, hour, minute, second);
  }),
}));

describe('Chat Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CHAT_PREFIXES', () => {
    it('should have correct prefixes for test and prod environments', () => {
      expect(CHAT_PREFIXES.test).toBe('chat-test-');
      expect(CHAT_PREFIXES.prod).toBe('chat-');
    });
  });

  describe('buildConversationId', () => {
    it('should build conversation ID with prod prefix by default', () => {
      const result = buildConversationId();
      expect(result).toBe('chat-2023-12-25-15-30-45-chat-2023-12-25-15-30-45-abcd1234');
    });

    it('should build conversation ID with test prefix when isTestConv is true', () => {
      const result = buildConversationId(undefined, true);
      expect(result).toBe('chat-test-2023-12-25-15-30-45-chat-test-2023-12-25-15-30-45-abcd1234');
    });

    it('should use provided uid when given', () => {
      const customUid = 'custom-uid-123';
      const result = buildConversationId(customUid, false);
      expect(result).toBe('chat-2023-12-25-15-30-45-custom-uid-123');
    });

    it('should use test prefix with custom uid', () => {
      const customUid = 'custom-test-uid';
      const result = buildConversationId(customUid, true);
      expect(result).toBe('chat-test-2023-12-25-15-30-45-custom-test-uid');
    });

    it('should call crypto.randomBytes when no uid provided', () => {
      buildConversationId();
      expect(crypto.randomBytes).toHaveBeenCalledWith(8);
    });
  });

  describe('parseDateFromConvId', () => {
    it('should parse date from conversation ID', () => {
      const convId = 'chat-2023-12-25-15-30-45-some-suffix';
      const result = parseDateFromConvId(convId);

      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2023);
      expect(result?.getMonth()).toBe(11); // December (0-based)
      expect(result?.getDate()).toBe(25);
    });

    it('should return null for invalid conversation ID format', () => {
      expect(parseDateFromConvId('invalid-format')).toBeNull();
      expect(parseDateFromConvId('chat-invalid-date')).toBeNull();
      expect(parseDateFromConvId('')).toBeNull();
    });

    it('should parse date from test conversation ID', () => {
      const convId = 'chat-test-2024-01-01-12-00-00-test-suffix';
      const result = parseDateFromConvId(convId);

      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0); // January (0-based)
      expect(result?.getDate()).toBe(1);
    });
  });

  describe('getChatPrefixByEnv', () => {
    it('should return correct prefix for test environment', () => {
      const result = getChatPrefixByEnv('test');
      expect(result).toBe('chat-test-');
    });

    it('should return correct prefix for prod environment', () => {
      const result = getChatPrefixByEnv('prod');
      expect(result).toBe('chat-');
    });
  });

  describe('parseDateRange', () => {
    it('should parse valid date range string', () => {
      const result = parseDateRange('1609459200000,1609545600000');
      expect(result).toEqual({
        start: 1609459200000,
        end: 1609545600000,
      });
    });

    it('should handle single comma separated values', () => {
      const result = parseDateRange('123,456');
      expect(result).toEqual({
        start: 123,
        end: 456,
      });
    });

    it('should handle invalid numbers gracefully', () => {
      const result = parseDateRange('invalid,range');
      expect(result).toEqual({
        start: NaN,
        end: NaN,
      });
    });
  });

  describe('isValidDateRange', () => {
    it('should return true for valid date ranges', () => {
      expect(isValidDateRange('100,200')).toBe(true);
      expect(isValidDateRange('1609459200000,1609545600000')).toBe(true);
      expect(isValidDateRange('0,1')).toBe(true);
    });

    it('should return false for invalid date ranges', () => {
      expect(isValidDateRange('200,100')).toBe(false); // start > end
      expect(isValidDateRange('100,100')).toBe(false); // start === end
      expect(isValidDateRange('invalid,range')).toBe(false); // NaN values
      expect(isValidDateRange('100')).toBe(false); // Missing comma
      expect(isValidDateRange('')).toBe(false); // Empty string
      expect(isValidDateRange('100,')).toBe(false); // Missing end
      expect(isValidDateRange(',200')).toBe(false); // Missing start
    });

    it('should return false for null or undefined input', () => {
      expect(isValidDateRange(null as any)).toBe(false);
      expect(isValidDateRange(undefined as any)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isValidDateRange('0,0')).toBe(false); // Equal values
      expect(isValidDateRange('-100,-50')).toBe(true); // Negative numbers
      expect(isValidDateRange('-100,50')).toBe(true); // Negative to positive
    });
  });

  describe('integration tests', () => {
    it('should create conversation ID that can be parsed for date', () => {
      const convId = buildConversationId();
      const parsedDate = parseDateFromConvId(convId);

      expect(parsedDate).toBeInstanceOf(Date);
      expect(parsedDate?.getFullYear()).toBe(2023);
      expect(parsedDate?.getMonth()).toBe(11); // December
      expect(parsedDate?.getDate()).toBe(25);
    });

    it('should handle test environment end-to-end', () => {
      const convId = buildConversationId(undefined, true);
      const parsedDate = parseDateFromConvId(convId);
      const prefix = getChatPrefixByEnv('test');

      expect(convId.startsWith(prefix)).toBe(true);
      expect(parsedDate).toBeInstanceOf(Date);
    });
  });
});
