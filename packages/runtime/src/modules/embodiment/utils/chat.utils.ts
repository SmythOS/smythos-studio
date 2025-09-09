import crypto from 'crypto';

import { ChatConversationsEnv } from '@embodiment/types/chat.types';
import { getCurrentFormattedDate, toDateFromFormattedDateStr } from './date-time.utils';

export const CHAT_PREFIXES: Record<ChatConversationsEnv, string> = {
  test: 'chat-test-',
  prod: 'chat-',
};

export const buildConversationId = (uid?: string, isTestConv = false) => {
  const prefix = isTestConv ? CHAT_PREFIXES.test : CHAT_PREFIXES.prod;
  const convId = uid ?? `${prefix}${getCurrentFormattedDate()}-${crypto.randomBytes(8).toString('hex')}`;
  return `${prefix}${getCurrentFormattedDate()}-${convId}`;
};
export const parseDateFromConvId = (convId: string) => {
  const match = convId.match(/\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}/);

  if (!match) return null;
  return toDateFromFormattedDateStr(match[0]);
};

export const parseDateRange = (dateRange: string) => {
  const [start, end] = dateRange.split(',');
  return { start: parseInt(start), end: parseInt(end) };
};
export const isValidDateRange = (dateRange: string) => {
  if (!dateRange) return false;
  const { start, end } = parseDateRange(dateRange);
  return !isNaN(start) && !isNaN(end) && start < end;
};
