export const CHAT_ACCEPTED_FILE_TYPES = {
  mime: [
    'image/*',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ] as const,
  input:
    'image/*,.pdf,application/pdf,.txt,text/plain,.csv,text/csv,application/csv,.xls,application/vnd.ms-excel,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' as const,
} as const;

export const CHAT_ERROR_MESSAGE =
  'An error occurred. If the issue persists, please send message via our feedback channel. [discord.gg/smythos](https://discord.gg/smythos)';

export const DEFAULT_AVATAR_URL =
  'https://gravatar.com/avatar/ccd5b19e810febbfd3d4321e27b15f77?s=400&d=mp&r=x';
