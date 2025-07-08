class Cache {
  private provider: string;

  constructor(provider = 'localStorage') {
    if (provider === 'localStorage') {
      if (!window.localStorage) {
        throw new Error('Local Storage is not supported');
      }

      this.provider = 'localStorage';
    }
  }

  public get(key: string): any {
    const item = window[this.provider].getItem(key);
    try {
      return JSON.parse(item);
    } catch (error) {
      return item;
    }
  }

  public set(key: string, value: any): void {
    window[this.provider].setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  }

  public delete(key: string): void {
    window[this.provider].removeItem(key);
  }
}

export const lsCache = new Cache('localStorage');

export default Cache;
