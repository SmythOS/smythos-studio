import { Request, Response, NextFunction } from 'express';
import { Logger } from '@smythos/sre';

import config from '@core/config';

const console = Logger('(Core) Middleware: RateLimiter');

// Configuration from environment variables with sensible defaults
const REQUESTS_PER_MINUTE = config.env.REQ_LIMIT_PER_MINUTE as number;
const MAX_CONCURRENT_REQUESTS = config.env.MAX_CONCURRENT_REQUESTS as number;
const WINDOW_SIZE_MS = 60 * 1000; // 1 minute window
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Cleanup every 5 minutes

interface RateLimitEntry {
  requests: number[];
  lastCleanup: number;
}

interface ConcurrentEntry {
  count: number;
  expires: number;
}

// In-memory stores
const rateLimitStore = new Map<string, RateLimitEntry>();
const concurrentStore = new Map<string, ConcurrentEntry>();

/**
 * Check if IP should be excluded from rate limiting
 */
const shouldExcludeIP = (ip: string): boolean => {
  const excludedPrefixes = [
    '127.0.0.1', // localhost IPv4
    '::1', // localhost IPv6
    '10.20.', // internal network
    '10.30.', // internal network
    '192.168.', // private network
    '172.16.', // private network
  ];
  return excludedPrefixes.some(prefix => ip.startsWith(prefix));
};

/**
 * Clean up expired entries from stores
 */
const cleanupExpiredEntries = (): void => {
  const now = Date.now();

  // Cleanup rate limit entries
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.lastCleanup > CLEANUP_INTERVAL_MS) {
      entry.requests = entry.requests.filter(timestamp => now - timestamp < WINDOW_SIZE_MS);
      entry.lastCleanup = now;

      if (entry.requests.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }

  // Cleanup concurrent request entries
  for (const [key, entry] of concurrentStore.entries()) {
    if (entry.expires < now) {
      concurrentStore.delete(key);
    }
  }
};

/**
 * Check if request exceeds rate limit
 */
const checkRateLimit = (clientIP: string): boolean => {
  if (REQUESTS_PER_MINUTE <= 0) return false; // Rate limiting disabled

  const now = Date.now();
  const entry = rateLimitStore.get(clientIP);

  if (!entry) {
    rateLimitStore.set(clientIP, {
      requests: [now],
      lastCleanup: now,
    });
    return false;
  }

  // Clean up old requests
  entry.requests = entry.requests.filter(timestamp => now - timestamp < WINDOW_SIZE_MS);

  if (entry.requests.length >= REQUESTS_PER_MINUTE) {
    return true; // Rate limit exceeded
  }

  entry.requests.push(now);
  entry.lastCleanup = now;
  return false;
};

/**
 * Check concurrent requests and return cleanup function
 */
const checkConcurrentRequests = (clientIP: string): (() => void) | null => {
  if (MAX_CONCURRENT_REQUESTS <= 0) return null; // Concurrent limiting disabled

  const now = Date.now();
  const entry = concurrentStore.get(clientIP);
  const currentCount = entry?.count || 0;

  if (currentCount >= MAX_CONCURRENT_REQUESTS) {
    throw new Error('Concurrent limit exceeded');
  }

  // Increment counter
  concurrentStore.set(clientIP, {
    count: currentCount + 1,
    expires: now + 60 * 1000, // 1 minute TTL
  });

  // Return cleanup function
  return () => {
    const entry = concurrentStore.get(clientIP);
    if (entry && entry.count > 0) {
      if (entry.count === 1) {
        concurrentStore.delete(clientIP);
      } else {
        concurrentStore.set(clientIP, {
          ...entry,
          count: entry.count - 1,
        });
      }
    }
  };
};

// Periodic cleanup every 5 minutes
setInterval(cleanupExpiredEntries, CLEANUP_INTERVAL_MS);

/**
 * Rate limiting middleware
 * Provides simple rate limiting and concurrent request limiting
 */
const RateLimiter = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    // Skip rate limiting for excluded IPs (localhost, private networks)
    if (shouldExcludeIP(clientIP)) {
      return next();
    }

    // Check rate limit
    if (checkRateLimit(clientIP)) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`);
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(WINDOW_SIZE_MS / 1000), // seconds until window resets
      });
      return;
    }

    // Check concurrent requests
    let cleanupConcurrent: (() => void) | null = null;
    try {
      cleanupConcurrent = checkConcurrentRequests(clientIP);
    } catch (err) {
      if (err.message === 'Concurrent limit exceeded') {
        console.log(`Concurrent request limit exceeded for IP: ${clientIP}`);
        res.status(429).json({
          error: 'Too Many Requests',
          message: 'Too many concurrent requests. Please try again later.',
        });
        return;
      }
      throw err; // Re-throw unexpected errors
    }

    // Set up cleanup for concurrent requests if needed
    if (cleanupConcurrent) {
      const cleanup = () => {
        res.removeListener('finish', cleanup);
        res.removeListener('close', cleanup);
        res.removeListener('error', cleanup);
        cleanupConcurrent();
      };

      res.on('finish', cleanup);
      res.on('close', cleanup);
      res.on('error', cleanup);
    }

    next();
  } catch (err) {
    console.error('Unexpected error in rate limiter:', err);
    // Don't block requests on unexpected errors
    next();
  }
};

export default RateLimiter;
