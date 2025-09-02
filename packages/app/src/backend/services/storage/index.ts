// storage/index.ts
import appConfig from '../../config';
import LocalStorage from './LocalStorage.class';
import S3Storage from './S3Storage.class';
import { StaticStorage, StorageACL } from './StaticStorage';

export class StorageFactory {
  static createStorage(accessControl: StorageACL): StaticStorage {
    const adapter = StorageFactory.determineAdapter();

    switch (adapter) {
      case 's3':
        return new S3Storage(accessControl);
      case 'local':
        return new LocalStorage(accessControl);
      default:
        return new LocalStorage(accessControl); // fallback to local storage
    }
  }

  static determineAdapter(): 's3' | 'local' {
    console.info('Determining storage adapter...');
    const s3RequiredConfig = [
      appConfig.env.AWS_S3_BUCKET_NAME,
      appConfig.env.AWS_S3_REGION,
      appConfig.env.AWS_ACCESS_KEY_ID,
      appConfig.env.AWS_SECRET_ACCESS_KEY,
    ];

    const s3ReadyToInit = s3RequiredConfig.every((config) => Boolean(config));

    const adaptorName = s3ReadyToInit ? 's3' : 'local';

    console.info(`Using ${adaptorName.toUpperCase()} storage adapter`);

    return adaptorName;
  }
}

export const assetStorage = StorageFactory.createStorage(StorageACL.PublicRead);
export const privateStorage = StorageFactory.createStorage(StorageACL.Private);
