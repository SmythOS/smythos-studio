import { useCallback, useEffect, useMemo, useState } from 'react';

import { ChatAPIClient } from '@react/features/ai-chat/clients/chat-api.client';
import { IMessageFile } from '@react/features/ai-chat/types/chat.types';
import {
  createFileMetadata,
  deleteFile,
  FILE_LIMITS,
  generateUniqueFileId,
  validateSingleFile,
} from '@react/features/ai-chat/utils/file';

interface IProps {
  agentId?: string;
  chatId?: string;
}

export const useAttachments = (props: IProps) => {
  const { agentId, chatId } = props || {};

  const [files, setFiles] = useState<IMessageFile[]>([]);
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState('');

  const isLoading = uploadingIds.size > 0;

  // Create ChatAPIClient instance for file uploads (memoized to avoid recreating)
  const chatClient = useMemo(() => new ChatAPIClient(), []);

  // Auto-clear upload error after 5 seconds when it becomes visible
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (errorMessage) {
      timeoutId = setTimeout(() => setErrorMessage(''), 5000);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [errorMessage]);

  const addFiles = useCallback(
    async (newFiles: File[]) => {
      if (files.length === 0) return;
      const remainingSlots = FILE_LIMITS.MAX_ATTACHED_FILES - files.length;

      if (remainingSlots <= 0) {
        setErrorMessage(`Maximum ${FILE_LIMITS.MAX_ATTACHED_FILES} files allowed`);
        return;
      }

      const validatedFiles = newFiles.map((file) => ({
        file,
        error: validateSingleFile(file),
        id: generateUniqueFileId(file),
      }));

      const validFiles = validatedFiles.filter((item) => !item.error);
      const invalidFiles = validatedFiles.filter((item) => item.error);

      // Always surface an error if any invalid files were included
      if (invalidFiles.length > 0) {
        setErrorMessage(invalidFiles[0].error || 'Failed to upload file');
      }

      if (validFiles.length > 0) {
        const filesToUpload = validFiles.slice(0, remainingSlots);

        if (validFiles.length > remainingSlots) {
          setErrorMessage(
            `You can only attach ${FILE_LIMITS.MAX_ATTACHED_FILES} files. Extra files were ignored.`,
          );
        }

        // Add files to uploadingIds set using unique IDs
        const newFileIds = new Set(filesToUpload.map((f) => f.id));
        setUploadingIds((prev) => new Set([...prev, ...newFileIds]));

        // Add files to state with metadata and unique IDs
        setFiles((prevFiles) => [
          ...prevFiles,
          ...filesToUpload.map(({ file, id }) => ({
            ...createFileMetadata(file),
            id, // Add unique ID to file metadata
          })),
        ]);

        // Upload files concurrently using ChatAPIClient
        const uploadPromises = filesToUpload.map(async ({ file, id }) => {
          try {
            const attachment = await chatClient.uploadFile(file, agentId, chatId);

            setFiles((prevFiles) =>
              prevFiles.map((f) =>
                f.id === id
                  ? {
                      ...f,
                      metadata: {
                        ...f.metadata,
                        // Do not set key for runtime uploads (avoid delete attempts)
                        publicUrl: attachment.url,
                        fileType: attachment.type,
                        isUploading: false,
                      },
                    }
                  : f,
              ),
            );
          } catch (error) {
            setFiles((prevFiles) => prevFiles.filter((f) => f.id !== id));
            setErrorMessage(error instanceof Error ? error.message : 'Failed to upload file');
          } finally {
            setUploadingIds((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          }
        });

        await Promise.all(uploadPromises);
      }
    },
    [files.length, agentId, chatId, chatClient],
  );

  const removeFile = useCallback(
    async (index: number) => {
      const fileToRemove = files[index];
      setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
      if (fileToRemove.metadata.key) await deleteFile(fileToRemove.metadata.key);
    },
    [files],
  );

  const clearError = useCallback(() => setErrorMessage(''), []);
  const clearFiles = useCallback(() => setFiles([]), []);
  const clearAll = useCallback(() => {
    setFiles([]);
    setErrorMessage('');
    setUploadingIds(new Set());
  }, []);

  return {
    data: files,
    isLoading,
    errorMessage,

    addFiles,
    removeFile,
    clearError,
    clearFiles,
    clearAll,
  };
};
