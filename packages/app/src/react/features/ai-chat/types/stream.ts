import type { TFunctionCall, TMetaMessage } from './message';
import type { TUploadFile } from './file';

export type TStreamChunk = {
  conversationTurnId?: string;
  content?: string;
  debugOn?: boolean;
  title?: string;
  debug?: string;
  status_message?: string;
  callParams?: string;
  parameters?: Record<string, unknown>;
  function?: string;
  function_call?: TFunctionCall;
  hashId?: string;
  error?: string;
  isError?: boolean;
};

export type TStreamConfig = {
  agentId: string;
  chatId: string;
  domain?: string;
  port?: number;
  message: string;
  modelId?: string;
  attachments?: TUploadFile[];
  enableMetaMessages?: boolean;
  signal: AbortSignal;
  headers?: Record<string, string>;
};

export interface IStreamCallbacks {
  onContent: (content: string, turnId?: string) => void;
  onMetaMessages?: (metaMessages: TMetaMessage, turnId?: string) => void;
  onError: (error: TChatError) => void;
  onStart?: () => void;
  onComplete: () => void;
}

export type TErrorType = 'stream' | 'network' | 'abort' | 'system';

export type TChatError = {
  message: string;
  type: TErrorType;
  turnId?: string;
  originalError?: Error | unknown;
  isAborted?: boolean;
};

export type TAPIConfig = {
  domain?: string;
  port?: number;
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
  retry?: { attempts: number; delay: number };
};

