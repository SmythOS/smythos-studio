import { PutObjectCommandInput } from '@aws-sdk/client-s3';
import path from 'path';
import { Readable } from 'stream';
import crypto from 'crypto';

import S3Storage from './S3Storage.class';
import { stream2buffer } from '../utils.service';
import type { Metadata } from '../../types';
import appConfig from '../../config';
import { S3_DAILY_PURGE_LIFECYCLE_TAG } from '../../constants';
import multer, { StorageEngine } from 'multer';
import multerS3, { AUTO_CONTENT_TYPE } from '../../lib/multer-s3';

// TODO: make user ID required when available

type AclRules = Metadata;

/**
 * The SmythStorage class extends the S3Storage class to provide an additional layer of abstraction.
 * It ensures proper access control and maintains an organized folder structure within the S3 bucket.
 *
 * @class SmythStorage
 *
 * This class is designed to handle specific storage requirements for the Smyth application, including:
 * - Enforcing access control rules.
 * - Organizing stored objects into specific folders for better manageability.
 */
export default class SmythPubStaticStorage extends S3Storage {
  constructor() {
    super(appConfig.env.AWS_S3_PUB_BUCKET_NAME || '', { region: appConfig.env.AWS_S3_PUB_REGION });
  }

  public static hash(data: string | Buffer): string {
    const hash = crypto.createHash('md5');
    hash.update(data);
    return hash.digest('hex');
  }

  public async getContent(
    key: string,
    responseType = 'stream',
  ): Promise<{
    data: Buffer | Readable | undefined;
    lastModified: Date | undefined;
    contentType: string | undefined;
  }> {
    const response = await super.getObject(key);

    const body = response?.Body;

    if (responseType === 'buffer') {
      if (body && body instanceof Readable) {
        return {
          data: await stream2buffer(body),
          lastModified: response?.LastModified,
          contentType: response?.ContentType,
        };
      }
    }

    return {
      data: body as Readable,
      lastModified: response?.LastModified,
      contentType: response?.ContentType,
    };
  }

  public static path(...paths: string[]): string {
    // use path.posix.join to ensure forward slashes
    return path.posix.join(...paths);
  }

  public async saveContent({
    key,
    body,
    contentType,
    purge,
    skipAclCheck,
  }: {
    key: string;
    body: any;
    contentType?: string;
    purge?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    skipAclCheck?: boolean;
  }): Promise<any> {
    let otherParams: Partial<PutObjectCommandInput> = {};

    if (!skipAclCheck) otherParams.ACL = 'public-read';

    // set content type if provided
    if (contentType) otherParams.ContentType = contentType;

    // set lifecycle if cleanup provided
    if (purge === 'DAILY') otherParams.Tagging = S3_DAILY_PURGE_LIFECYCLE_TAG;

    await super.putObject(key, body, otherParams);

    return { success: true, url: `https://${appConfig.env.AWS_S3_PUB_BUCKET_NAME}/${key}` };
  }

  public getMulter({
    key,
    purge,
    limits,
    fileFilter,
  }: {
    limits?: multer.Options['limits'];
    purge?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    fileFilter?: multer.Options['fileFilter'];
    key: string | ((req: any, file: Express.Multer.File) => string);
  }): multer.Multer {
    const upload = multer({
      storage: multerS3({
        s3: this.client,
        bucket: this.bucket,
        key: async (req, file, cb) => {
          const keyStr = typeof key === 'function' ? key(req, file) : key;
          cb(null, keyStr);
        },
        contentType: AUTO_CONTENT_TYPE,
        tagging: purge === 'DAILY' ? S3_DAILY_PURGE_LIFECYCLE_TAG : undefined,
      }),
      limits,
      fileFilter,
    });

    return upload;
  }

  public getPublicUrl(key: string): string {
    return `https://${appConfig.env.AWS_S3_PUB_BUCKET_NAME}/${key}`;
  }
}
