/* eslint-disable no-unused-vars */
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { TAttachment, TChatMessage, TUploadStatus } from '.';

/**
 * Chat configuration parameters returned from SRE server
 * Response from GET /v1/emb/chat/params
 */
export type TChatParams = {
  name?: string;
  domain?: string;
  port?: number;
  chatbotEnabled: boolean;
  authRequired?: boolean;
  auth?: {
    method?: string;
    redirectUri?: string;
    authorizationUrl?: string;
    clientID?: string;
    redirectInternalEndpoint?: string;
  };
  headers?: Record<string, string>;
};

export type TFocusable = { focus: () => void };

export type TChatStateConfig = {
  agentId: string;
  chatId: string;
  modelId?: string;
  enableMetaMessages?: boolean;
  inputRef?: RefObject<TFocusable | null>;
};

export interface IChatState {
  messages: TChatMessage[];
  setMessages: Dispatch<SetStateAction<TChatMessage[]>>;
  isStreaming: boolean;
  sendMessage: (
    message: string,
    currentAttachments?: TAttachment[],
    shouldSetUserMessage?: boolean,
  ) => Promise<void>;
  stopStreaming: () => void;
  retryLastMessage: () => void;
}

export interface IFileUpload {
  attachments: TAttachment[];
  status: Record<string, TUploadStatus>;
  uploading: boolean;
  errorMessage: string;
  addFiles: (files: File[]) => Promise<void>;
  remove: (index: number) => void;
  removeByIds: (ids: Set<string>) => void;
  clear: (preserveBlobUrls?: boolean) => void;
  clearError: () => void;
}
