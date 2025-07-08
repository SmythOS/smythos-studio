import crypto from 'crypto';
import config from '../config';

export const kebabToCapitalize = (input) => {
  if (!input || typeof input !== 'string') return input;

  return input
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const isURL = (str: string): boolean => {
  // This regex checks for protocol, hostname, domain, port (optional), path (optional), and query string (optional)
  const regex = /^(https?:\/\/)([^\s.]+\.[^\s]{2,})(:[0-9]{1,5})?(\/[^\s]*)?(\?[^\s]*)?$/i;
  return regex.test(str);
};

export const kebabCase = (str: string): string => {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
};

export const generateKey = (str: string, prefix: string = ''): string => {
  const hash = crypto.createHash('sha1');
  hash.update(str);
  return `${prefix ? prefix + '-' : ''}${hash.digest('hex')}`;
};

export const isValidObj = (obj: any): boolean => {
  return obj && typeof obj === 'object' && Object.keys(obj).length > 0;
};

export const getCursorFromLinkHeader = (linkHeader: string): Record<string, string> => {
  if (!linkHeader) return {};

  const cursors = {};
  const linkArray = linkHeader.split(',');

  linkArray.forEach((link) => {
    const parts = link.split(';');
    const url = parts[0].trim().slice(1, -1); // Removing angle brackets around the URL
    const rel = parts[1].trim().split('=')[1].slice(1, -1); // Removing quotes around the relation

    // Parse the URL to get the cursor
    const urlSearchParams = new URLSearchParams(url);

    cursors[rel] = urlSearchParams.get('cursor');
  });

  return cursors;
};

export const encodeBase64 = (str: string): string => {
  if (!str) return str;
  return Buffer.from(str).toString('base64');
};

export const decodeBase64 = (str: string): string => {
  if (!str) return str;
  return Buffer.from(str, 'base64').toString('utf-8');
};

export const isSmythStaff = (user) => {
  if (!user?.email) return false;

  const staffEmails = config.env.SMYTH_STAFF_EMAILS.split(',').map((email) => email.trim());

  //check if user.email includes any of the staff emails
  const isStaff = staffEmails.some((email) => email && user.email.includes(email));

  return isStaff;
};

export const isSmythAlpha = (user) => {
  if (!user?.email) return false;

  const alphaEmails = config.env.SMYTH_ALPHA_EMAILS.split(',').map((email) => email.trim());

  //check if user.email includes any of the alpha emails
  const isAlpha = alphaEmails.some((email) => email && user.email.includes(email));

  return isAlpha;
};

export const getUserTimezoneDate = (): string => {
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  // Format the current date and time according to the user's timezone
  return new Date().toLocaleString('en-US', { timeZone: userTimeZone });
};

export const isDevEnv = (): boolean => {
  return config.env.NODE_ENV === 'DEV';
};

export const isProdEnv = (): boolean => {
  return config.env.NODE_ENV === 'PROD';
};
