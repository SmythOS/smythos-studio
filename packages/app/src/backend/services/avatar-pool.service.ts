/**
 * AvatarPoolService - Provides random avatar selection from existing S3 storage
 * Uses in-memory caching to avoid hitting S3 on every request
 */

import { assetStorage } from './storage';

/** Cache for avatar keys */
let cachedAvatarKeys: string[] = [];
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Refreshes the avatar keys cache from S3 storage
 */
async function refreshCache(): Promise<void> {
  try {
    // Cast to S3Storage to access listKeys method
    const s3Storage = assetStorage as any;
    if (typeof s3Storage.listKeys === 'function') {
      // Fallback to generic listKeys method if listKeys is not available
      cachedAvatarKeys = await s3Storage.listKeys('teams/common/', 3000);
      cacheTimestamp = Date.now();
    } else {
      throw new Error('listKeys method not available on storage');
    }
  } catch (error) {
    console.error('[AvatarPool] Failed to refresh cache:', error);
    throw error;
  }
}

/**
 * Ensures cache is populated and not expired
 */
async function ensureCacheReady(): Promise<void> {
  const now = Date.now();
  const isExpired = now - cacheTimestamp > CACHE_TTL_MS;

  if (cachedAvatarKeys.length === 0 || isExpired) {
    await refreshCache();
  }
}

/**
 * Gets a random avatar URL from the cached pool
 * @returns Promise resolving to a random avatar public URL
 */
export async function getRandomAvatarUrl(): Promise<string> {
  await ensureCacheReady();

  if (cachedAvatarKeys.length === 0) {
    throw new Error('No avatars available in the pool');
  }

  const randomIndex = Math.floor(Math.random() * cachedAvatarKeys.length);
  const randomKey = cachedAvatarKeys[randomIndex];

  return assetStorage.getPublicUrl(randomKey);
}
