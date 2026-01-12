/* eslint-disable no-unused-vars */
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { TAttachment, TChatMessage, TUploadStatus } from '.';

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
  clear: (preserveBlobUrls?: boolean) => void;
  clearError: () => void;
}
