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
    this.storagePath = path.join('uploads');
    this.publicPath = path.join(this.storagePath, 'public');
    this.privatePath = path.join(this.storagePath, 'private');

    // Ensure directories exist synchronously during initialization
    this.ensureDirectoriesExistSync();
  }

  /**
   * Ensures that the required storage directories exist (synchronous version for constructor)
   */
  private ensureDirectoriesExistSync(): void {
    try {
      fs.mkdirSync(this.storagePath, { recursive: true });
      fs.mkdirSync(this.publicPath, { recursive: true });
      fs.mkdirSync(this.privatePath, { recursive: true });

      logger.info('Storage directories created successfully');
    } catch (error) {
      logger.error('Failed to create storage directories:', error);
      throw error;
    }
  }

  /**
   * Ensures that the required storage directories exist (async version)
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
    // Remove any ../ patterns and leading slashes
    const sanitizedKey = key.replace(/\.\.\//g, '').replace(/^\//, '');
    const fullPath = path.join(this.getBasePath(), sanitizedKey);

    logger.info(`Path mapping: ${key} -> ${sanitizedKey} -> ${fullPath}`);

    return fullPath;
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
   * Gets file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: { [key: string]: string } = {
      // Images
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'image/bmp': '.bmp',
      'image/tiff': '.tiff',
      'image/tif': '.tif',
      'image/ico': '.ico',
      'image/x-icon': '.ico',

      // Documents
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'application/vnd.ms-powerpoint': '.ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',

      // Text
      'text/plain': '.txt',
      'text/html': '.html',
      'text/css': '.css',
      'text/javascript': '.js',
      'text/csv': '.csv',

      // Data
      'application/json': '.json',
      'application/xml': '.xml',
      'application/zip': '.zip',
      'application/x-rar-compressed': '.rar',
      'application/x-7z-compressed': '.7z',

      // Video
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'video/ogg': '.ogv',
      'video/avi': '.avi',
      'video/mov': '.mov',
      'video/wmv': '.wmv',

      // Audio
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'audio/ogg': '.ogg',
      'audio/m4a': '.m4a',
      'audio/flac': '.flac',
    };

    return mimeToExt[mimeType.toLowerCase()] || '';
  }

  /**
   * Creates a multer middleware for file uploads
   */
  public createUploadMw({ key, purge, limits, fileFilter }: CreateUploadMwParams): multer.Multer {
    // Store the key and file info for each request to make it available later
    const requestStorage = new Map();

    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        try {
          const fileName = typeof key === 'function' ? key(req, file) : key;
          const baseFileName = fileName || this.generateUniqueKey(file.originalname);

          // Get proper extension from MIME type
          const extension = this.getExtensionFromMimeType(file.mimetype);

          // Create final filename with extension
          const finalFileName =
            extension && !baseFileName.toLowerCase().endsWith(extension.toLowerCase())
              ? baseFileName + extension
              : baseFileName;

          // Store the final filename and file info for this request
          requestStorage.set(req, {
            finalFileName,
            mimetype: file.mimetype,
            originalname: file.originalname,
          });

          logger.info(`File upload destination prepared:`, {
            originalKey: fileName,
            baseFileName,
            mimetype: file.mimetype,
            extension,
            finalFileName,
          });

          // Get the full file path and extract directory
          const filePath = this.getFilePath(finalFileName);
          const dirPath = path.dirname(filePath);

          // Ensure the directory exists
          await fsPromises.mkdir(dirPath, { recursive: true });

          cb(null, dirPath);
        } catch (error) {
          cb(error as Error, '');
        }
      },
      filename: (req, file, cb) => {
        try {
          // Retrieve the data we stored earlier
          const storedData = requestStorage.get(req);

          if (!storedData) {
            throw new Error('Unable to retrieve file data');
          }

          // Extract just the filename part (not the full path)
          const justFileName = path.basename(storedData.finalFileName);

          // Set up purge timeout if specified
          if (purge) {
            const filePath = this.getFilePath(storedData.finalFileName);
            // Delay the purge setup to ensure file is created first
            setTimeout(() => this.setupPurgeTimeout(filePath, purge), 1000);
          }

          logger.info(`File upload filename set:`, {
            originalname: file.originalname,
            mimetype: file.mimetype,
            storedFileName: storedData.finalFileName,
            diskFileName: justFileName,
          });

          cb(null, justFileName);
        } catch (error) {
          cb(error as Error, '');
        }
      },
    });

    const upload = multer({
      storage,
      limits,
      fileFilter,
    });

    // Wrap the multer middleware to add the key to the file object
    return {
      ...upload,
      single: (fieldName: string) => {
        const singleMiddleware = upload.single(fieldName);
        return (req, res, next) => {
          singleMiddleware(req, res, (err) => {
            if (err) return next(err);

            // Add the key property to the file object if file was uploaded
            if (req.file && requestStorage.has(req)) {
              const storedData = requestStorage.get(req);
              (req.file as any).key = storedData.finalFileName;

              // Clean up the stored data
              requestStorage.delete(req);
            }

            next();
          });
        };
      },
      // Add other multer methods if needed
      array: upload.array,
      fields: upload.fields,
      none: upload.none,
      any: upload.any,
    } as multer.Multer;
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
      const dirPath = path.dirname(filePath);

      // Ensure directory exists
      await fsPromises.mkdir(dirPath, { recursive: true });

      // Verify directory was created
      try {
        await fsPromises.access(dirPath);
      } catch (accessError) {
        logger.error(`Directory creation failed: ${dirPath}`, accessError);
        throw new Error(`Failed`);
      }

      // Convert body to buffer if it's a string
      const buffer = typeof body === 'string' ? Buffer.from(body) : body;

      // Write file
      await fsPromises.writeFile(filePath, buffer);

      // Set up purge timeout if specified
      if (purge) {
        this.setupPurgeTimeout(filePath, purge);
      }

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

      return { success: true };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist, consider it successfully deleted
        logger.info(`File not found (already deleted): ${key}`);
        return { success: true };
      }

      throw error;
    }
  }

  /**
   * Generates a public URL for accessing the file
   */
  public getPublicUrl(key: string): string {
    if (!key || typeof key !== 'string') {
      throw new Error('Key is required and must be a non-empty string for URL generation.');
    }

    if (this.accessControl === StorageACL.Private) {
      throw new Error('Private files are not accessible via public URL.');
    }

    const baseUrl = appConfig.env.UI_SERVER || `http://localhost:${appConfig.env.PORT || 3000}`;

    // Remove leading slash from key if present
    const cleanKey = key.replace(/^\//, '');

    return `${baseUrl}/uploads/public/${cleanKey}`;
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
    const filePath = this.getFilePath(key);
    if (options?.range) {
      const [startStr, endStr] = options.range.replace(/bytes=/, '').split('-');
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : undefined;
      return fs.createReadStream(filePath, { start, end });
    }
    return fs.createReadStream(filePath);
  }
}
