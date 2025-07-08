/**
 * SmythFile class
 * to manage files in Smyth
 */

type SmythFileObject = {
  mimetype: string;
  size: number;
  url: string;
};

class SmythFile {
  private mimetype: string = '';
  private size: number = 0;
  #data;

  constructor(data: Blob | SmythFileObject) {
    if (data instanceof Blob) {
      this.#data = data;
      this.mimetype = data?.type || '';
      this.size = data?.size || 0;
    } else if (typeof data === 'object') {
      this.#data = data;
      this.mimetype = data?.mimetype || '';
      this.size = data?.size || 0;
    } else {
      throw new Error('Invalid input!');
    }
  }

  public toBlobUrl(): string {
    try {
      if (!(typeof this.#data === 'object')) return this.#data;

      const base64data = this.#data.url.split(',')[1];

      const binaryString = atob(base64data);

      const len = binaryString.length;

      const bytes = new Uint8Array(len);

      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: this.mimetype });

      const blobUrl = URL.createObjectURL(blob);

      return blobUrl;
    } catch (error) {
      console.log('Error converting SmythFileObject to Blob: ', error);
      return '';
    }
  }

  public static isSmythFileObject(data: any): boolean {
    return (
      typeof data === 'object' &&
      data !== null &&
      data?.url &&
      'size' in data &&
      'mimetype' in data
    );
  }
}

function isUrl(str: string): boolean {
  // This regex checks for protocol, hostname, domain, port (optional), path (optional), and query string (optional)
  const regex = /^(https?:\/\/)([^\s.]+\.[^\s]{2,})(:[0-9]{1,5})?(\/[^\s]*)?(\?[^\s]*)?$/i;
  return regex.test(str);
}

export default SmythFile;
