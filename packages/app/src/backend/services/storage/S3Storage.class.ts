import {
  DeleteObjectCommand,
  DeleteObjectCommandInput,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from '@aws-sdk/client-s3';
import multer from 'multer';
import { Readable } from 'stream';
import appConfig from '../../config';
import { S3_DAILY_PURGE_LIFECYCLE_TAG } from '../../constants';
import multerS3, { AUTO_CONTENT_TYPE } from '../../lib/multer-s3';
import {
  CreateUploadMwParams,
  DeleteContentParams,
  FileMetadata,
  SaveContentParams,
  StaticStorage,
  StorageACL,
} from './StaticStorage';

const logger = console;

interface AWSConfig {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export default class S3Storage implements StaticStorage {
  protected client: S3Client;
  protected bucket: string;

  constructor(
    // protected readonly bucket: string,
    // protected config?: Partial<S3StorageConfig>,
    protected readonly accessControl: StorageACL,
  ) {
    const privConfig: AWSConfig = {
      bucket: appConfig.env.AWS_S3_BUCKET_NAME,
      region: appConfig.env.AWS_S3_REGION,
      accessKeyId: appConfig.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: appConfig.env.AWS_SECRET_ACCESS_KEY,
    };

    const pubConfig: AWSConfig = {
      bucket: appConfig.env.AWS_S3_PUB_BUCKET_NAME,
      region: appConfig.env.AWS_S3_PUB_REGION,
      accessKeyId: appConfig.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: appConfig.env.AWS_SECRET_ACCESS_KEY,
    };

    const matchConfig: AWSConfig = accessControl === StorageACL.PublicRead ? pubConfig : privConfig;

    if (!matchConfig.region || !matchConfig.accessKeyId || !matchConfig.secretAccessKey) {
      const msg = 'AWS S3 Region, Access Key ID, or Secret Access Key is missing';

      logger.error(msg);
      // throw new Error(msg);
    }

    this.client = new S3Client({
      region: matchConfig.region,
      credentials: {
        accessKeyId: matchConfig.accessKeyId,
        secretAccessKey: matchConfig.secretAccessKey,
      },
    });

    this.bucket = matchConfig.bucket;
  }

  private async putObject(
    key: string,
    body: string | Uint8Array | Buffer | Readable,
    otherParams: Partial<PutObjectCommandInput> = {},
  ) {
    if (!key || typeof key !== 'string') throw new Error('The key must be a non-empty string.');
    if (body === undefined || body === null) throw new Error('Body cannot be null or undefined.');

    const params = {
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ...otherParams,
    };

    try {
      const command = new PutObjectCommand(params);
      await this.client.send(command);

      logger.info(`Object successfully uploaded: ${key}`);
    } catch (error) {
      logger.error(`Error putting object with key ${key}: `, error);
      throw error;
    }
  }

  private async deleteObject(
    key: string,
    otherParams: Partial<DeleteObjectCommandInput> = {},
  ): Promise<any> {
    if (!key || typeof key !== 'string') throw new Error('The key must be a non-empty string.');

    const params = {
      Bucket: this.bucket,
      Key: key,
      ...otherParams,
    };

    try {
      const command = new DeleteObjectCommand(params);
      await this.client.send(command);

      logger.info(`Object successfully deleted: ${key}`);
    } catch (error) {
      logger.error(`Error deleting object with key ${key}: `, error);
      throw error;
    }
  }

  public createUploadMw(params: CreateUploadMwParams): multer.Multer {
    const upload = multer({
      storage: multerS3({
        s3: this.client,
        bucket: this.bucket,
        acl: params.acl || undefined,
        key: async (req, file, cb) => {
          const keyStr = typeof params.key === 'function' ? params.key(req, file) : params.key;
          cb(null, keyStr);
        },
        metadata: (req, file, cb) => {
          const metadataContent =
            typeof params.metadata === 'function' ? params.metadata(req, file) : params.metadata;
          cb(null, metadataContent);
        },
        contentType: AUTO_CONTENT_TYPE,
        tagging: params.purge === 'DAILY' ? S3_DAILY_PURGE_LIFECYCLE_TAG : undefined,
      }),
      limits: params.limits,
      fileFilter: params.fileFilter,
    });

    return upload;
  }

  public async saveContent({
    key,
    body,
    contentType,
    purge,
    skipAclCheck,
  }: SaveContentParams): Promise<any> {
    let otherParams: Partial<PutObjectCommandInput> = {};

    if (!skipAclCheck) {
      const acl = this.accessControl === StorageACL.PublicRead ? 'public-read' : 'private';
      otherParams.ACL = acl;
    }

    // set content type if provided
    if (contentType) otherParams.ContentType = contentType;

    // set lifecycle if cleanup provided
    const purgeMap = {
      DAILY: S3_DAILY_PURGE_LIFECYCLE_TAG,
    };

    if (purgeMap[purge]) otherParams.Tagging = purgeMap[purge];

    await this.putObject(key, body, otherParams);

    return { success: true, url: this.getPublicUrl(key) };
  }

  public async deleteContent({ key }: DeleteContentParams): Promise<{ success: boolean }> {
    await this.deleteObject(key);
    return { success: true };
  }

  public getPublicUrl(key: string): string {
    return `https://${appConfig.env.AWS_S3_PUB_BUCKET_NAME}/${key}`;
  }

  async stat(key: string): Promise<FileMetadata> {
    const res = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));

    return {
      size: res.ContentLength ?? 0,
      contentType: res.ContentType,
      lastModified: res.LastModified,
      etag: res.ETag,
      metadata: res.Metadata,
    };
  }

  async getStream(key: string, options?: { range?: string }) {
    const res = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Range: options?.range,
      }),
    );
    return res.Body as NodeJS.ReadableStream;
  }
}
