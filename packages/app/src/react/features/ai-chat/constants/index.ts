import { TMessageType } from '@react/features/ai-chat/types/chat.types';

export const CHAT_ACCEPTED_FILE_TYPES = {
  mime: ['*/*'] as const,
  input: '*/*' as const,
} as const;

/** Supported file types for upload - accepts all types */
export const SUPPORTED_FILE_TYPES = ['*/*'] as const;

/** Maximum allowed file size in bytes (5MB) */
export const ALLOWED_FILE_SIZE = 5 * 1024 * 1024;

/** Maximum number of files that can be uploaded at once */
export const MAX_UPLOADS = 5;

export const CHAT_ERROR_MESSAGE =
  'An error occurred. If the issue persists, please send message via our feedback channel. [discord.gg/smythos](https://discord.gg/smythos)';

export const USER_STOPPED_MESSAGE = 'Generation interrupted by user';

export const DEFAULT_AVATAR_URL =
  'https://gravatar.com/avatar/ccd5b19e810febbfd3d4321e27b15f77?s=400&d=mp&r=x';

// Message types
type TMessageKey = 'USER' | 'SYSTEM' | 'ERROR' | 'DEBUG' | 'META' | 'LOADING';
export const MESSAGE_TYPES: Record<TMessageKey, TMessageType> = {
  USER: 'user',
  SYSTEM: 'system',
  ERROR: 'error',
  DEBUG: 'debug',
  META: 'meta',
  LOADING: 'loading',
};
