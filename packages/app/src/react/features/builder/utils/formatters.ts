/**
 * Format duration in milliseconds to human-readable string
 */
export const formatDuration = (duration?: number): string => {
  if (!duration) return '-';
  if (duration < 1) return '<1ms';
  if (duration < 1000) return `${Math.round(duration)}ms`;
  return `${(duration / 1000).toFixed(2)}s`;
};

/**
 * Format size in bytes to human-readable string
 */
export const formatSize = (size?: number): string => {
  if (!size) return '-';
  if (size < 1024) return `${size}B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
  return `${(size / (1024 * 1024)).toFixed(1)}MB`;
};

/**
 * Calculate size of an object in bytes
 */
export const calculateSize = (obj: any): number => {
  if (!obj) return 0;
  return new Blob([JSON.stringify(obj)]).size;
};
