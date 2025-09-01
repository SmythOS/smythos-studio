import multer from 'multer';

export enum StorageACL {
  PublicRead = 'public-read',
  Private = 'private',
}

export interface CreateUploadMwParams {
  limits?: multer.Options['limits'];
  purge?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  fileFilter?: multer.Options['fileFilter'];
  key: string | ((req: any, file: Express.Multer.File) => string);
  metadata?: any | ((req: any, file: Express.Multer.File) => any);
  acl?: StorageACL;
}

export interface SaveContentParams {
  key: string;
  body: any;
  contentType?: string;
  purge?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  skipAclCheck?: boolean;
}

export interface DeleteContentParams {
  key: string;
}

export interface FileMetadata {
  size: number;
  contentType?: string;
  lastModified?: Date;
  etag?: string;
  metadata?: any;
}

export interface StaticStorage {
  createUploadMw(params: CreateUploadMwParams): multer.Multer; // make this return type not bound to multer

  saveContent(params: SaveContentParams): Promise<{ success: boolean; url: string }>;

  deleteContent(params: DeleteContentParams): Promise<{ success: boolean }>;

  getPublicUrl(key: string): string;

  stat(fileKey: string): Promise<FileMetadata>;
  getStream(fileKey: string, options?: { range?: string }): Promise<NodeJS.ReadableStream>;
}
