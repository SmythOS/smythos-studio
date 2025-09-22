import fs from 'fs';
import { promisify } from 'util';

import { CacheData } from '../types';

const exists = promisify(fs.exists);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);

class SmythFS {
  /**
   * Create directory if not exists
   */
  public async ensureDirectory(dir) {
    if (!dir) {
      console.log('[SmythFS] Directory path is required');
    }

    const hasFile = await this.hasFile(dir);

    try {
      if (!hasFile) {
        await mkdir(dir, { recursive: true });
      }
    } catch (error) {
      console.log('[SmythFS] Error ensuring directory: \nError: ', error?.message);
    }
  }

  public async hasFile(path: string): Promise<boolean> {
    try {
      return exists(path);
    } catch {
      return false;
    }
  }

  public async read(path: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
    if (!path) {
      throw new Error('File path is required');
    }

    try {
      if (await this.hasFile(path)) {
        return readFile(path, encoding);
      }
    } catch (error) {
      throw error;
    }
  }

  public async writeFile(
    path: string,
    content: string | NodeJS.ArrayBufferView,
    encoding: BufferEncoding = 'utf-8',
  ): Promise<void> {
    if (!path) {
      throw new Error('File path is required');
    }

    try {
      await writeFile(path, content, encoding);
    } catch (error) {
      throw error;
    }
  }

  public async deleteFile(path: string): Promise<void> {
    if (!path) {
      throw new Error('File path is required');
    }

    try {
      if (await this.hasFile(path)) {
        await unlink(path);
      }
    } catch (error) {
      throw error;
    }
  }

  public async readJsonFile(path: string): Promise<CacheData | null> {
    try {
      const content = await this.read(path);
      return content ? JSON.parse(content) : null;
    } catch (error) {
      console.log('Error reading cache file \nPath:', path, '\nError:', error?.message);
      return null;
    }
  }

  public async writeJsonFile(path: string, content: CacheData): Promise<void> {
    try {
      await this.writeFile(path, JSON.stringify(content));
    } catch (error) {
      console.log('Error writing cache file \nPath:', path, '\nError:', error?.message);
    }
  }

  public async moveFile(oldPath: string, newPath: string): Promise<void> {
    try {
      await fs.promises.rename(oldPath, newPath);
    } catch (error) {
      console.log(
        'Error moving file \nOld Path:',
        oldPath,
        '\nNew Path:',
        newPath,
        '\nError:',
        error,
      );

      throw error;
    }
  }

  public async readDirectory(path: string): Promise<string[]> {
    try {
      return fs.promises.readdir(path);
    } catch (error) {
      throw error;
    }
  }
}

export default SmythFS;
