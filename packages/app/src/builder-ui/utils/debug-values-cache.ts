import type { Workspace } from '../workspace/Workspace.class';

declare var workspace: Workspace;

interface CacheEntry {
  data: any;
  timestamp: number;
  size: number;
}

// Cache configuration and state
const debugInputsCache = new Map<string, CacheEntry>();
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_SINGLE_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const CACHE_EXPIRY_TIME = 4 * 60 * 60 * 1000; // 4 hours
let currentCacheSize = 0;

// Utility functions
const calculateDataSize = (data: any): number => {
  if (data instanceof File) return data.size;
  if (typeof data !== 'object' || data === null) return JSON.stringify(data).length * 2;

  return Object.entries(data).reduce((total, [, value]) => {
    if (typeof value === 'object' && value !== null) {
      if ('type' in value && value.type === 'file_reference' && 'size' in value)
        return total + (value.size as number);
      if ('files' in value && Array.isArray(value.files))
        return total + value.files.reduce((sum: number, f: any) => sum + (f.size || 0), 0);
      return total + JSON.stringify(value).length * 2;
    }
    return total + String(value).length * 2;
  }, 0);
};

const isExpired = (timestamp: number) => Date.now() - timestamp > CACHE_EXPIRY_TIME;

const generateVersionInfo = (componentId: string) =>
  `${btoa(componentId).slice(0, 10)}-${workspace?.agent?.data?.version || '1.0.0'}-${Math.floor(Date.now() / (1000 * 60 * 60))}`;

// Cache management operations
const removeEntry = (key: string) => {
  const entry = debugInputsCache.get(key);
  if (entry) {
    currentCacheSize -= entry.size;
    debugInputsCache.delete(key);
  }
  return !!entry;
};

const addEntry = (key: string, data: any, size = calculateDataSize(data)) => {
  removeEntry(key); // Remove existing if present
  ensureCacheSpace(size);

  const entry: CacheEntry = { data, timestamp: Date.now(), size };
  debugInputsCache.set(key, entry);
  currentCacheSize += size;
  return entry;
};

const cleanupExpiredEntries = () => {
  [...debugInputsCache.entries()]
    .filter(([, entry]) => isExpired(entry.timestamp))
    .forEach(([key]) => removeEntry(key));
};

const evictOldestEntries = (requiredSize: number) => {
  const sortedEntries = [...debugInputsCache.entries()].sort(
    ([, a], [, b]) => a.timestamp - b.timestamp,
  );
  let freedSize = 0;

  for (const [key] of sortedEntries) {
    const entry = debugInputsCache.get(key);
    if (entry) {
      freedSize += entry.size;
      removeEntry(key);
      if (freedSize >= requiredSize) break;
    }
  }
};

const ensureCacheSpace = (newEntrySize: number) => {
  cleanupExpiredEntries();
  const spaceNeeded = currentCacheSize + newEntrySize - MAX_CACHE_SIZE;
  if (spaceNeeded > 0) evictOldestEntries(spaceNeeded);
};

// Public API
export const saveDebugInputValues = (componentId: string, inputValues: Record<string, any>) => {
  try {
    const dataToCache = {
      version: generateVersionInfo(componentId),
      timestamp: Date.now(),
      values: inputValues,
    };
    addEntry(`debug-inputs-${componentId}`, dataToCache);
  } catch (error) {
    console.error('Error saving debug input values:', error);
  }
};

export const getDebugInputValues = (componentId: string): Record<string, any> | null => {
  try {
    const entry = debugInputsCache.get(`debug-inputs-${componentId}`);
    if (!entry) return null;

    if (isExpired(entry.timestamp)) {
      removeEntry(`debug-inputs-${componentId}`);
      return null;
    }

    if (entry.data.version !== generateVersionInfo(componentId)) {
      removeEntry(`debug-inputs-${componentId}`);
      return null;
    }

    return entry.data.values;
  } catch (error) {
    console.error('Error retrieving debug input values:', error);
    return null;
  }
};

export const cacheFileObjects = (componentId: string, inputName: string, files: File[]) => {
  const validFiles = files.filter((file) => file.size <= MAX_SINGLE_FILE_SIZE);
  if (validFiles.length === 0) return;

  const size = validFiles.reduce((total, file) => total + file.size, 0);
  addEntry(`file-objects-${componentId}-${inputName}`, validFiles, size);
};

export const getCachedFileObjects = (componentId: string, inputName: string): File[] | null => {
  const entry = debugInputsCache.get(`file-objects-${componentId}-${inputName}`);
  if (!entry) return null;

  if (isExpired(entry.timestamp)) {
    removeEntry(`file-objects-${componentId}-${inputName}`);
    return null;
  }

  return entry.data;
};

export const clearComponentCache = (componentId: string) => {
  [...debugInputsCache.keys()]
    .filter((key) => key.includes(componentId))
    .forEach((key) => removeEntry(key));
};

export const clearAllCache = () => {
  debugInputsCache.clear();
  currentCacheSize = 0;
};

export const getCacheStats = () => {
  if (debugInputsCache.size === 0) {
    return { entriesCount: 0, totalSize: '0 MB', oldestEntry: 'None', newestEntry: 'None' };
  }

  const timestamps = [...debugInputsCache.values()].map((entry) => entry.timestamp);
  return {
    entriesCount: debugInputsCache.size,
    totalSize: `${(currentCacheSize / 1024 / 1024).toFixed(2)} MB`,
    oldestEntry: new Date(Math.min(...timestamps)).toLocaleString(),
    newestEntry: new Date(Math.max(...timestamps)).toLocaleString(),
  };
};

// Periodic cleanup
if (typeof window !== 'undefined') {
  setInterval(cleanupExpiredEntries, 30 * 60 * 1000); // Every 30 minutes
}
