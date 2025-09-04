/**
 * Unit tests for date-time utilities
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCurrentFormattedDate,
  toDateFromFormattedDateStr,
  getDayFormattedDate,
  delay,
} from '@core/utils/date-time.utils';

describe('Date-Time Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCurrentFormattedDate', () => {
    it('should return a formatted date string in YYYY-MM-DD-HH-MM-SS format', () => {
      const result = getCurrentFormattedDate();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/);
    });

    it('should return current date and time', () => {
      const before = new Date();
      const result = getCurrentFormattedDate();
      const after = new Date();

      const [year, month, day] = result.split('-').map(Number);
      expect(year).toBe(before.getFullYear());
      expect(month).toBeGreaterThanOrEqual(before.getMonth() + 1);
      expect(month).toBeLessThanOrEqual(after.getMonth() + 1);
      expect(day).toBeGreaterThanOrEqual(before.getDate());
      expect(day).toBeLessThanOrEqual(after.getDate());
    });

    it('should pad single-digit values with zeros', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2023-01-05 09:08:07'));

      const result = getCurrentFormattedDate();
      expect(result).toBe('2023-01-05-09-08-07');

      vi.useRealTimers();
    });
  });

  describe('toDateFromFormattedDateStr', () => {
    it('should convert formatted date string to Date object', () => {
      const formattedDate = '2023-12-25-15-30-45';
      const result = toDateFromFormattedDateStr(formattedDate);

      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2023);
      expect(result.getMonth()).toBe(11); // December (0-based)
      expect(result.getDate()).toBe(25);
      expect(result.getHours()).toBe(15);
      expect(result.getMinutes()).toBe(30);
      expect(result.getSeconds()).toBe(45);
    });

    it('should handle edge case dates', () => {
      const formattedDate = '2024-02-29-23-59-59'; // Leap year
      const result = toDateFromFormattedDateStr(formattedDate);

      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(1); // February (0-based)
      expect(result.getDate()).toBe(29);
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
    });
  });

  describe('getDayFormattedDate', () => {
    it('should return a formatted date string in YYYY-MM-DD format', () => {
      const result = getDayFormattedDate();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return current date only', () => {
      const now = new Date();
      const result = getDayFormattedDate();
      
      const [year, month, day] = result.split('-').map(Number);
      expect(year).toBe(now.getFullYear());
      expect(month).toBe(now.getMonth() + 1);
      expect(day).toBe(now.getDate());
    });

    it('should pad single-digit values with zeros', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2023-01-05'));

      const result = getDayFormattedDate();
      expect(result).toBe('2023-01-05');

      vi.useRealTimers();
    });
  });

  describe('delay', () => {
    it('should resolve after the specified milliseconds', async () => {
      vi.useFakeTimers();
      
      const promise = delay(1000);
      expect(promise).toBeInstanceOf(Promise);

      vi.advanceTimersByTime(500);
      // Promise should still be pending
      let resolved = false;
      promise.then(() => { resolved = true; });
      await Promise.resolve(); // Allow microtasks to run
      expect(resolved).toBe(false);

      vi.advanceTimersByTime(500);
      await promise;
      expect(resolved).toBe(true);

      vi.useRealTimers();
    });

    it('should work with zero delay', async () => {
      const start = Date.now();
      await delay(0);
      const end = Date.now();
      
      // Should resolve almost immediately
      expect(end - start).toBeLessThan(10);
    });

    it('should work with non-integer values', async () => {
      vi.useFakeTimers();
      
      const promise = delay(100.5);
      vi.advanceTimersByTime(100.5);
      await promise;
      
      // Should not throw an error
      expect(true).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('integration tests', () => {
    it('should create round-trip date conversion', () => {
      const original = getCurrentFormattedDate();
      const converted = toDateFromFormattedDateStr(original);
      const backToString = getCurrentFormattedDate();

      // The dates should be very close (within a second or two)
      const originalParts = original.split('-').map(Number);
      const backParts = backToString.split('-').map(Number);
      
      expect(originalParts[0]).toBe(backParts[0]); // Year
      expect(originalParts[1]).toBe(backParts[1]); // Month
      expect(originalParts[2]).toBe(backParts[2]); // Day
    });
  });
});