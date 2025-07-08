import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  GetObjectCommandInput,
  GetObjectCommandOutput,
  PutObjectCommandInput,
  DeleteObjectCommandInput,
} from '@aws-sdk/client-s3';
import type { Readable } from 'stream';

import appConfig from '../../config';
import type { S3StorageConfig } from '../../types';

const logger = console;

interface Metadata {
  [key: string]: string;
}

/**
 * The S3Storage class provides a simplified interface for interacting with AWS S3 Storage.
 * It encapsulates the AWS S3 Client, providing methods for common operations on a specified S3 bucket.
 *
 * @class S3Storage
 *
 * @param {S3StorageConfig} config - Configuration for AWS S3, including access keys and region.
 * This configuration is used to instantiate the AWS S3 Client.
 *
 * @param {string} bucket - The name of the AWS S3 Bucket to be used for storage operations.
 * All operations performed using an instance of this class will target this bucket.
 *
 * This class is designed to abstract the underlying AWS SDK calls, providing a simpler and more intuitive way to interact with AWS S3.
 */

export default class S3Storage {
  protected client: S3Client;

  constructor(
    protected readonly bucket: string,
    protected config?: Partial<S3StorageConfig>,
  ) {
    const region = config?.region || appConfig.env.AWS_S3_REGION;
    const accessKeyId = config?.accessKeyId || appConfig.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = config?.secretAccessKey || appConfig.env.AWS_SECRET_ACCESS_KEY;

    if (!region || !accessKeyId || !secretAccessKey) {
      const msg = 'AWS S3 Region, Access Key ID, or Secret Access Key is missing';

      logger.error(msg);
      throw new Error(msg);
    }

    this.client = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
    this.bucket = bucket;
  }

  private async bucketExists(): Promise<boolean> {
    try {
      const command = new HeadBucketCommand({ Bucket: this.bucket });

      await this.client.send(command);

      return true;
    } catch (error: any) {
      if (
        error.name === 'NotFound' ||
        error.name === 'NoSuchBucket' ||
        error.$metadata.httpStatusCode === 404
      ) {
        return false; // The bucket does not exist
      }

      logger.error(`Error checking if bucket (${this.bucket}) exists: `, error);
      throw error;
    }
  }

  private async createBucket(): Promise<any> {
    try {
      const command = new CreateBucketCommand({ Bucket: this.bucket });
      const response = await this.client.send(command);

      return response;
    } catch (error) {
      logger.error(`Error creating bucket (${this.bucket}): `, error);
      throw error;
    }
  }

  public async ensureBucketExists() {
    try {
      const exists = await this.bucketExists();

      if (!exists) {
        await this.createBucket();
      }
    } catch (error) {
      throw error;
    }
  }

  public async getObject(
    key: string,
    otherParams: Partial<GetObjectCommandInput> = {},
  ): Promise<GetObjectCommandOutput> {
    if (!key || typeof key !== 'string') throw new Error('The key must be a non-empty string.');

    const params = {
      Bucket: this.bucket,
      Key: key,
      ...otherParams,
    };

    try {
      const command = new GetObjectCommand(params);
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      logger.error(`Error getting object with key ${key}: `, error);
      throw error;
    }
  }

  public async putObject(
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

  public async deleteObject(
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

  public async getMetadata(
    key: string,
    otherParams: Partial<GetObjectCommandInput> = {},
  ): Promise<Metadata | undefined> {
    if (!key || typeof key !== 'string') throw new Error('The key must be a non-empty string.');

    const params = {
      Bucket: this.bucket,
      Key: key,
      ...otherParams,
    };

    try {
      // Fetch only Metadata with HeadObjectCommand
      const command = new HeadObjectCommand(params);
      const response = await this.client.send(command);

      return response?.Metadata;
    } catch (error: any) {
      logger.error(`Error getting metadata with key ${key}: `, error);
      throw error;
    }
  }
}
