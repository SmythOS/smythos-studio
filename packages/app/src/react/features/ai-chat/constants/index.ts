import type { TMessageType } from '@react/features/ai-chat/types';

export const CHAT_ACCEPTED_FILE_TYPES = {
  mime: ['*/*'],
  input: '*/*',
} as const;

/** Maximum allowed file size in bytes (5MB) */
export const ALLOWED_FILE_SIZE = 5 * 1024 * 1024;

/** Maximum number of files that can be uploaded at once */
export const MAX_UPLOADS = 5;

export const DEFAULT_AVATAR_URL =
  'https://gravatar.com/avatar/ccd5b19e810febbfd3d4321e27b15f77?s=400&d=mp&r=x';

type TMessageKey = 'USER' | 'SYSTEM' | 'ERROR' | 'META' | 'LOADING' | 'INFO';
export const MESSAGE_TYPES: Record<TMessageKey, TMessageType> = {
  USER: 'user',
  SYSTEM: 'system',
  ERROR: 'error',
  META: 'meta',
  LOADING: 'loading',
  INFO: 'info',
};
