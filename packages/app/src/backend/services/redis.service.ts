import Redis from 'ioredis';

import config from '../config';

/**
 * Redis client configuration for rate limiting
 * TODO: This Redis client configuration is duplicated in src/backend/index.ts.
 * Consider extracting to a shared config file (e.g. src/config/redis.ts) to maintain DRY principles
 * and ensure consistent Redis configuration across the application.
 */
const redisClient = new Redis({
  sentinels: config.env.REDIS_SENTINEL_HOSTS.split(',').map((host) => {
    const [hostname, port] = host.split(':');
    return { host: hostname, port: parseInt(port) };
  }),
  name: config.env.REDIS_MASTER_NAME,
  password: config.env.REDIS_PASSWORD,
});

export { redisClient };
