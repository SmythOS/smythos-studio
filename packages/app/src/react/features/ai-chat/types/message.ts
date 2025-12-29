export type TMessageType = 'user' | 'system' | 'debug' | 'error' | 'loading' | 'meta';

export type TThinkingType = 'tools' | 'general';

export type TFunctionCall = {
  name?: string;
  topic?: string;
  arguments?: Record<string, unknown>;
};

export type TMetaMessage = {
  hashId?: string;
  debugOn?: boolean;
  debug?: string;
  title?: string;
  statusMessage?: string;
  function?: string;
  callParams?: unknown;
  parameters?: unknown;
  functionCall?: TFunctionCall;
};

export type TAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  blobUrl?: string | null;
  file?: File;
};

export type TChatMessage = {
  id: number;
  type: TMessageType;
  content: string;
  metaMessages?: TMetaMessage;
  updatedAt?: number;
  attachments?: TAttachment[];
};

