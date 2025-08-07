import Redis from 'ioredis';
import NodeCache from 'node-cache';
import config from '../config';

/**
 * Interface defining the caching operations supported by the application
 * This interface is designed to be Redis-compatible while allowing for alternative implementations
 */
export interface ICache {
  client: Redis | NodeCache;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...options: string[]): Promise<'OK' | null>;
  setex(key: string, seconds: number, value: string): Promise<'OK' | null>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  call(...args: string[]): Promise<any>;
}

/**
 * Redis implementation of the ICache interface
 */
export class RedisCache implements ICache {
  public client: Redis;

  constructor() {
    if (!config.env.REDIS_SENTINEL_HOSTS) {
      throw new Error('Redis configuration is required for RedisCache');
    }

    this.client = new Redis({
      sentinels: config.env.REDIS_SENTINEL_HOSTS?.split(',').map((host) => {
        const [hostname, port] = host.split(':');
        return { host: hostname, port: parseInt(port) };
      }),
      name: config.env.REDIS_MASTER_NAME,
      password: config.env.REDIS_PASSWORD,
    });
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ...options: string[]): Promise<'OK' | null> {
    return this.client.set(key, value, ...(options as any[])) as Promise<'OK' | null>;
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK' | null> {
    return this.client.setex(key, seconds, value);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async exists(key: string): Promise<number> {
    return this.client.exists(key);
  }

  async call(...args: any[]): Promise<any> {
    // return this.client.call(...args );
    return this.client.call.apply(this.client, args);
  }
}

/**
 * In-memory implementation of the ICache interface using node-cache
 */
export class MemoryCache implements ICache {
  public client: NodeCache;

  constructor() {
    this.client = new NodeCache();
  }

  async get(key: string): Promise<string | null> {
    const value = this.client.get<string>(key);
    return value || null;
  }

  async set(key: string, value: string, ...options: string[]): Promise<'OK' | null> {
    let ttlSeconds: number | undefined;

    // Handle Redis-style options
    for (let i = 0; i < options.length; i += 2) {
      const option = options[i]?.toUpperCase();
      const optionValue = options[i + 1];

      switch (option) {
        case 'EX':
          ttlSeconds = parseInt(optionValue);
          break;
        case 'PX':
          ttlSeconds = parseInt(optionValue) / 1000;
          break;
      }
    }

    this.client.set(key, value, ttlSeconds);
    return 'OK';
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK' | null> {
    this.client.set(key, value, seconds);
    return 'OK';
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async exists(key: string): Promise<number> {
    return this.client.has(key) ? 1 : 0;
  }

  async call(...args: string[]): Promise<any> {
    throw new Error('Raw command execution is not supported in memory cache');
  }
}

// Create the appropriate cache instance based on configuration
const cacheClient: ICache = config.flags.useRedis ? new RedisCache() : new MemoryCache();

// Log which cache implementation is being used
console.log(`Using ${config.flags.useRedis ? 'Redis' : 'in-memory'} cache implementation`);

export { cacheClient };
