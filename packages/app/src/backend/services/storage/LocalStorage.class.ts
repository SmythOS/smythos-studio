import crypto from 'crypto';
import fs, { promises as fsPromises } from 'fs';
import multer from 'multer';
import path from 'path';
import appConfig from '../../config';
import {
  CreateUploadMwParams,
  DeleteContentParams,
  FileMetadata,
  SaveContentParams,
  StaticStorage,
  StorageACL,
} from './StaticStorage';

const logger = console;

/**
 * LocalStorage class provides file system-based storage functionality
 * that mirrors S3Storage but stores files locally on the server.
 *
 * Features:
 * - Stores files in public/private directories based on access control
 * - Supports file uploads via multer
 * - Implements purge policies for temporary files
 * - Provides public URL generation for web access
 */
export default class LocalStorage implements StaticStorage {
  private readonly storagePath: string;
  private readonly publicPath: string;
  private readonly privatePath: string;
  private readonly purgeJobsMap: Map<string, NodeJS.Timeout> = new Map();

  constructor(protected readonly accessControl: StorageACL) {
    // Base storage path from config or default to user data directory
    this.storagePath = appConfig.env.DATA_PATH || path.join(process.cwd(), 'data');
    this.publicPath = path.join(this.storagePath, StorageACL.PublicRead);
    this.privatePath = path.join(this.storagePath, StorageACL.Private);

    // Ensure directories exist
    this.ensureDirectoriesExist();
  }

  /**
   * Ensures that the required storage directories exist
   */
  private async ensureDirectoriesExist(): Promise<void> {
    try {
      await fsPromises.mkdir(this.storagePath, { recursive: true });
      await fsPromises.mkdir(this.publicPath, { recursive: true });
      await fsPromises.mkdir(this.privatePath, { recursive: true });
    } catch (error) {
      logger.error('Failed to create storage directories:', error);
      throw error;
    }
  }

  /**
   * Gets the appropriate base path based on access control
   */
  private getBasePath(): string {
    return this.accessControl === StorageACL.PublicRead ? this.publicPath : this.privatePath;
  }

  /**
   * Gets the full file path for a given key
   */
  private getFilePath(key: string): string {
    // Sanitize the key to prevent directory traversal attacks
    const sanitizedKey = key.replace(/\.\.\//g, '').replace(/^\//, '');
    return path.join(this.getBasePath(), sanitizedKey);
  }

  /**
   * Generates a unique key for file uploads when not provided
   */
  private generateUniqueKey(originalName?: string): string {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(8).toString('hex');
    const extension = originalName ? path.extname(originalName) : '';
    return `${timestamp}-${randomBytes}${extension}`;
  }

  /**
   * Sets up purge timeout for temporary files
   */
  private setupPurgeTimeout(filePath: string, purge: 'DAILY' | 'WEEKLY' | 'MONTHLY'): void {
    const purgeDelays = {
      DAILY: 24 * 60 * 60 * 1000, // 24 hours
      WEEKLY: 7 * 24 * 60 * 60 * 1000, // 7 days
      MONTHLY: 30 * 24 * 60 * 60 * 1000, // 30 days
    };

    const delay = purgeDelays[purge];
    if (delay) {
      const timeout = setTimeout(async () => {
        try {
          await fsPromises.unlink(filePath);
          logger.info(`Purged temporary file: ${filePath}`);
          this.purgeJobsMap.delete(filePath);
        } catch (error) {
          logger.error(`Failed to purge file ${filePath}:`, error);
        }
      }, delay);

      this.purgeJobsMap.set(filePath, timeout);
    }
  }

  /**
   * Cancels purge timeout for a file
   */
  private cancelPurgeTimeout(filePath: string): void {
    const timeout = this.purgeJobsMap.get(filePath);
    if (timeout) {
      clearTimeout(timeout);
      this.purgeJobsMap.delete(filePath);
    }
  }

  /**
   * Creates a multer middleware for file uploads
   */
  public createUploadMw({ key, purge, limits, fileFilter }: CreateUploadMwParams): multer.Multer {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.getBasePath());
      },
      filename: (req, file, cb) => {
        try {
          const fileName = typeof key === 'function' ? key(req, file) : key;
          const finalFileName = fileName || this.generateUniqueKey(file.originalname);

          // Set up purge timeout if specified
          if (purge) {
            const filePath = path.join(this.getBasePath(), finalFileName);
            // Delay the purge setup to ensure file is created first
            setTimeout(() => this.setupPurgeTimeout(filePath, purge), 1000);
          }

          cb(null, finalFileName);
        } catch (error) {
          cb(error as Error, '');
        }
      },
    });

    return multer({
      storage,
      limits,
      fileFilter,
    });
  }

  /**
   * Saves content to a file
   */
  public async saveContent({
    key,
    body,
    contentType,
    purge,
    skipAclCheck,
  }: SaveContentParams): Promise<{ success: boolean; url: string }> {
    if (!key || typeof key !== 'string') {
      throw new Error('The key must be a non-empty string.');
    }

    if (body === undefined || body === null) {
      throw new Error('Body cannot be null or undefined.');
    }

    try {
      const filePath = this.getFilePath(key);

      // Ensure directory exists
      await fsPromises.mkdir(path.dirname(filePath), { recursive: true });

      // Convert body to buffer if it's a string
      const buffer = typeof body === 'string' ? Buffer.from(body) : body;

      // Write file
      await fsPromises.writeFile(filePath, buffer);

      // Set up purge timeout if specified
      if (purge) {
        this.setupPurgeTimeout(filePath, purge);
      }

      logger.info(`File successfully saved: ${filePath}`);

      return {
        success: true,
        url: this.getPublicUrl(key),
      };
    } catch (error) {
      logger.error(`Error saving file with key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Deletes content from storage
   */
  public async deleteContent({ key }: DeleteContentParams): Promise<{ success: boolean }> {
    if (!key || typeof key !== 'string') {
      throw new Error('The key must be a non-empty string.');
    }

    try {
      const filePath = this.getFilePath(key);

      // Cancel any pending purge timeout
      this.cancelPurgeTimeout(filePath);

      // Delete the file
      await fsPromises.unlink(filePath);

      logger.info(`File successfully deleted: ${filePath}`);

      return { success: true };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist, consider it successfully deleted
        logger.info(`File not found (already deleted): ${key}`);
        return { success: true };
      }

      logger.error(`Error deleting file with key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Generates a public URL for accessing the file
   */
  public getPublicUrl(key: string): string {
    if (this.accessControl === StorageACL.Private) {
      throw new Error('Private files are not accessible via public URL.');
    }
    const accessPath = StorageACL.PublicRead;

    const baseUrl = appConfig.env.UI_SERVER || `http://localhost:${appConfig.env.PORT || 3000}`;

    // Remove leading slash from key if present
    const cleanKey = key.replace(/^\//, '');

    return `${baseUrl}/static/${accessPath}/${cleanKey}`;
  }

  /**
   * Cleanup method to clear all purge timeouts (useful for shutdown)
   */
  public cleanup(): void {
    for (const [filePath, timeout] of this.purgeJobsMap.entries()) {
      clearTimeout(timeout);
      logger.info(`Cancelled purge timeout for: ${filePath}`);
    }
    this.purgeJobsMap.clear();
  }

  async stat(key: string): Promise<FileMetadata> {
    const stats = await fs.promises.stat(this.getFilePath(key));
    return {
      size: stats.size,
      lastModified: stats.mtime,
    };
  }

  async getStream(key: string, options?: { range?: string }) {
    const filePath = path.join(this.getBasePath(), key);
    if (options?.range) {
      const [startStr, endStr] = options.range.replace(/bytes=/, '').split('-');
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : undefined;
      return fs.createReadStream(filePath, { start, end });
    }
    return fs.createReadStream(filePath);
  }
}
