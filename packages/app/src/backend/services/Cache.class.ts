import path from 'path';

import config from '../config';
import SmythFS from './SmythFS.class';
import { CacheData } from '../types';

const memoryCache = {};
let hasCacheClearInterval = false;

class Cache extends SmythFS {
  private cacheDir = path.join(config.env.DATA_PATH, '.cache');
  private fileDir;
  private directory: string;
  private provider: 'file' | 'memory' | 'redis' = 'file';

  constructor({
    directory = '',
    provider = 'file',
  }: {
    directory?: string;
    provider?: 'file' | 'memory' | 'redis';
  }) {
    super();

    this.directory = directory;
    this.provider = provider;

    if (this.provider === 'file') {
      if (!this.directory) {
        throw new Error('Cache directory is required');
      }
      this.fileDir = path.join(this.cacheDir, this.directory);
      // Create cache directory if not exists
      this.ensureDirectory(this.fileDir);
    } else if (this.provider === 'memory') {
      if (!hasCacheClearInterval) {
        hasCacheClearInterval = true;
        setInterval(
          () => {
            for (const key in memoryCache) {
              const content = memoryCache[key];

              if (content?.expiredAt) {
                const currentDate = new Date();
                const currentTime = currentDate.getTime();

                if (currentTime > content?.expiredAt) {
                  delete memoryCache[key];
                }
              }
            }
          },
          5 * 60 * 1000, // 5 minutes
        );
      }
    }
  }

  public async get(key: string, extendTTL?: number): Promise<{ data: any; expired?: boolean }> {
    if (this.provider === 'file') {
      const currentDate = new Date();
      const filePath = path.join(this.fileDir, `${key.replace(/\//g, '_')}.json`);
      const content = await this.readJsonFile(filePath);

      let expired = false;

      if (content?.expiredAt) {
        const currentTime = currentDate.getTime();
        const expireTime = new Date(content.expiredAt).getTime();

        if (currentTime > expireTime) {
          expired = true;
        }
      }

      return { data: content?.data, expired };
    } else if (this.provider === 'memory') {
      // extend TTL
      if (extendTTL) {
        const content = memoryCache?.[key];

        if (content?.expiredAt) {
          this.set(key, content.data, extendTTL);
        }
      }
      return memoryCache?.[key];
    }
  }

  /**
   * Set cache
   * @param {string} key Cache key
   * @param value Cache value
   * @param ttl Time to live in Seconds
   */

  public async set(
    key: string,
    value: Record<string, any>,
    ttl: number | null = null,
  ): Promise<void> {
    if (this.provider === 'file') {
      const currentDate = new Date();
      const filePath = path.join(this.fileDir, `${key.replace(/\//g, '_')}.json`);
      let expiredAt = null;
      let content: CacheData = {};

      content.createdAt = currentDate.toISOString();

      if (ttl) {
        currentDate.setTime(currentDate.getTime() + ttl * 1000);
        expiredAt = currentDate.toISOString();
        content.expiredAt = expiredAt;
      }

      content.data = value;

      this.writeJsonFile(filePath, content);
    } else if (this.provider === 'memory') {
      let content: CacheData = { data: value };

      const currentDate = new Date();
      currentDate.setTime(currentDate.getTime() + (ttl * 1000 || 0));
      content.expiredAt = currentDate.getTime();

      memoryCache[key] = content;
    }
  }

  public async update(filename: string, key: string, value: unknown): Promise<void> {
    const currentDate = new Date();
    const filePath = path.join(this.fileDir, `${filename}.json`);

    const hasFile = await this.hasFile(filePath);

    if (!hasFile) {
      await this.writeJsonFile(filePath, {
        createdAt: currentDate.toISOString(),
        updatedAt: currentDate.toISOString(),
        data: { [key]: value },
      });

      return;
    }

    const content = await this.readJsonFile(filePath);

    if (content) {
      this.writeJsonFile(filePath, {
        updatedAt: currentDate.toISOString(),
        data: { ...content.data, [key]: value },
      });
    }
  }

  public async deleteFile(filename: string): Promise<void> {
    const filePath = path.join(this.fileDir, `${filename}.json`);
    super.deleteFile(filePath);
  }

  public async delete(key: string): Promise<void> {
    if (this.provider === 'memory') {
      if (memoryCache?.[key]) {
        delete memoryCache[key];
      }
    }
  }
}

export default Cache;
