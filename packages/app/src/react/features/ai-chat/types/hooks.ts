import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { TAttachment, TChatMessage } from './message';
import type { TFileAttachment, TUploadStatus } from './file';

export interface IFocusable {
  focus: () => void;
}

export type TChatStateConfig = {
  agentId: string;
  chatId: string;
  modelId?: string;
  enableMetaMessages?: boolean;
  inputRef?: RefObject<IFocusable | null>;
};

export interface IChatState {
  messages: TChatMessage[];
  setMessages: Dispatch<SetStateAction<TChatMessage[]>>;
  isStreaming: boolean;
  setIsStreaming: Dispatch<SetStateAction<boolean>>;
  sendMessage: (
    message: string,
    currentAttachments?: TAttachment[],
    shouldSetUserMessage?: boolean,
  ) => Promise<void>;
  stopStreaming: () => void;
  retryLastMessage: () => void;
}

export interface IFileUpload {
  attachments: TFileAttachment[];
  status: Record<string, TUploadStatus>;
  uploading: boolean;
  errorMessage: string;
  addFiles: (files: File[]) => Promise<void>;
  remove: (index: number) => void;
  clear: (preserveBlobUrls?: boolean) => void;
  clearError: () => void;
}

