export * from './smyth-middleware';
export * from './general.types';

export interface S3StorageConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}
export type Metadata = {
  teamid: string;
  agentid: string;
  userid?: string;
  acl?: string;
};
