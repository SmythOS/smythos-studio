export function getFileCategory(mimetype: string): string {
  if (!mimetype) return 'unknown';

  // Categorize based on the start of the MIME type
  if (mimetype.startsWith('image/')) {
    return 'image';
  } else if (mimetype.startsWith('audio/')) {
    return 'audio';
  } else if (mimetype.startsWith('video/')) {
    return 'video';
  } else if (mimetype.startsWith('text/')) {
    return 'text';
  } else if (mimetype.startsWith('application/')) {
    // Might need more refined checking for applications
    return 'application';
  } else {
    return 'other';
  }
}

export const isURL = (str: string): boolean => {
  // This regex checks for protocol, hostname, domain, port (optional), path (optional), and query string (optional)
  const regex = /^(https?:\/\/)([^\s.]+\.[^\s]{2,})(:[0-9]{1,5})?(\/[^\s]*)?(\?[^\s]*)?$/i;
  return regex.test(str);
};

export const isSmythFileObject = (data: any): boolean => {
  return (
    typeof data === 'object' && data !== null && data?.url && 'size' in data && 'mimetype' in data
  );
};
function getFileExtension(url) {
  try {
    const urlObj = new URL(url); // Parse the URL
    const pathname = urlObj.pathname; // Get the path part of the URL
    const lastDotIndex = pathname.lastIndexOf('.'); // Find the last dot

    // If there's no dot or it's at the start of the pathname, return an empty string
    if (lastDotIndex === -1 || lastDotIndex === pathname.length - 1) {
      return '';
    }

    // Extract and return the extension (in lowercase)
    return pathname.slice(lastDotIndex).toLowerCase();
  } catch (error) {
    console.error('Invalid URL:', error);
    return ''; // Return empty string for invalid URLs
  }
}

export const getMimeTypeFromUrl = (resourceUrl: string): { mimetype: string; error?: string } => {
  const extensionToMime = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.tif': 'image/tiff',
    '.tiff': 'image/tiff',
    '.ico': 'image/vnd.microsoft.icon',
    '.avif': 'image/avif',
    '.heif': 'image/heif',
    '.heic': 'image/heic',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.xml': 'application/xml',
    '.zip': 'application/zip',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip',
  };

  const extension = getFileExtension(resourceUrl);
  if (extension) {
    return { mimetype: extensionToMime[extension as keyof typeof extensionToMime] };
  }

  return { mimetype: '' };
};

export default class EventEmitter {
  private events: { [key: string]: Function[] };

  constructor() {
    this.events = {};
  }

  addEventListener(event: string, listener: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  removeEventListener(event: string, listener: Function) {
    if (!this.events[event]) {
      return;
    }
    this.events[event] = this.events[event].filter((l) => l !== listener);
  }
  on(event: string, listener: Function) {
    this.addEventListener(event, listener);
  }
  off(event: string, listener: Function) {
    this.removeEventListener(event, listener);
  }

  emit(event: string, ...args: any[]) {
    if (!this.events[event]) {
      return;
    }
    this.events[event].forEach((listener) => listener.apply(this, args));
  }
}
