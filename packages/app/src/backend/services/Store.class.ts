import path from 'path';

import config from '../config';
import SmythFS from './SmythFS.class';

class Store extends SmythFS {
  private storeDir = path.join(config.env.LOCAL_STORAGE_PATH, 'store');
  private fileDir;

  constructor(private directory: string) {
    super();
    this.fileDir = path.join(this.storeDir, this.directory);

    // Create cache directory if not exists
    this.ensureDirectory(this.fileDir);
  }

  public async get(key: string): Promise<any> {
    const filePath = path.join(this.fileDir, `${key.replace(/\//g, '_')}.json`);
    const content = await this.readJsonFile(filePath);

    return content?.data;
  }

  public async set(key: string, value: Record<string, any>): Promise<void> {
    const filePath = path.join(this.fileDir, `${key.replace(/\//g, '_')}.json`);
    const content = { data: value };

    await this.writeJsonFile(filePath, content);
  }

  public async delete(key: string): Promise<void> {
    const filePath = path.join(this.fileDir, `${key.replace(/\//g, '_')}.json`);

    await super.deleteFile(filePath);
  }
}

export default Store;
