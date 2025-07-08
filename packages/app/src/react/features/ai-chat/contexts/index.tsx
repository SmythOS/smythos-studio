import { FileWithMetadata } from '@react/shared/types/chat.types';
import { ChangeEvent, createContext, FC, PropsWithChildren, useContext } from 'react';

interface ChatContextType {
  files: FileWithMetadata[];
  uploadingFiles: Set<string>;
  isUploadInProgress: boolean;
  isMaxFilesUploaded: boolean;
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleFileDrop: (files: File[]) => Promise<void>;
  removeFile: (fileKey: number) => void;
  clearFiles: () => void;
  uploadError: { show: boolean; message: string };
  clearError: () => void;

  isGenerating: boolean;
  isQueryInputProcessing: boolean;
  isRetrying: boolean;
  chatHistoryMessages: any[];
  queryInputPlaceholder: string;
  isQueryInputDisabled: boolean;

  sendMessage: (query: string, files?: FileWithMetadata[]) => void;
  retryLastMessage: () => void;
  stopGenerating: () => void;
  clearChatSession: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

/**
 * Hook to use the chat context
 * @throws {Error} If used outside of ChatProvider
 */
export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChatContext must be used within a ChatProvider');
  return context;
};

type ChatProviderProps = PropsWithChildren<{ value: ChatContextType }>;

/**
 * Provider component that wraps your app and makes chat context available to any
 * child component that calls useChatContext().
 */
export const ChatProvider: FC<ChatProviderProps> = ({ children, value }) => (
  <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
);
