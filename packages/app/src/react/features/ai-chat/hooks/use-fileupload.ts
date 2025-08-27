/* eslint-disable no-unused-vars */
import { ChangeEvent, useCallback, useEffect, useState } from 'react';

import {
  createFileMetadata,
  deleteFile,
  FILE_LIMITS,
  uploadFile,
  validateSingleFile,
} from '@react/features/ai-chat/utils/file';
import { FileWithMetadata } from '@react/shared/types/chat.types';

interface FileUploadError {
  show: boolean;
  message: string;
}

interface UseFileUploadReturn {
  files: FileWithMetadata[];
  uploadingFiles: Set<string>;
  uploadError: FileUploadError;
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleFileDrop: (droppedFiles: File[]) => Promise<void>;
  removeFile: (index: number) => Promise<void>;
  clearError: () => void;
  isUploadInProgress: boolean;
  clearFiles: () => void;
}

// Helper function to generate a unique ID for each file
const generateUniqueFileId = (file: File): string => {
  return `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const useFileUpload = (): UseFileUploadReturn => {
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [uploadError, setUploadError] = useState<FileUploadError>({ show: false, message: '' });

  const isUploadInProgress = uploadingFiles.size > 0;

  // Auto-clear upload error after 5 seconds when it becomes visible
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (uploadError.show) {
      timeoutId = setTimeout(() => {
        setUploadError({ show: false, message: '' });
      }, 5000);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [uploadError.show]);

  const clearError = useCallback(() => setUploadError({ show: false, message: '' }), []);
  const clearFiles = useCallback(() => setFiles([]), []);

  const processFiles = useCallback(
    async (newFiles: File[]) => {
      const remainingSlots = FILE_LIMITS.MAX_ATTACHED_FILES - files.length;

      if (remainingSlots <= 0) {
        setUploadError({
          show: true,
          message: `Maximum ${FILE_LIMITS.MAX_ATTACHED_FILES} files allowed`,
        });
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
        setUploadError({
          show: true,
          message: invalidFiles[0].error || 'Failed to upload file',
        });
      }

      if (validFiles.length > 0) {
        const filesToUpload = validFiles.slice(0, remainingSlots);

        if (validFiles.length > remainingSlots) {
          setUploadError({
            show: true,
            message: `You can only attach ${FILE_LIMITS.MAX_ATTACHED_FILES} files. Extra files were ignored.`,
          });
        }

        // Add files to uploadingFiles set using unique IDs
        const newFileIds = new Set(filesToUpload.map((f) => f.id));
        setUploadingFiles((prev) => new Set([...prev, ...newFileIds]));

        // Add files to state with metadata and unique IDs
        setFiles((prevFiles) => [
          ...prevFiles,
          ...filesToUpload.map(({ file, id }) => ({
            ...createFileMetadata(file),
            id, // Add unique ID to file metadata
          })),
        ]);

        // Upload files concurrently
        const uploadPromises = filesToUpload.map(async ({ file, id }) => {
          try {
            const result = await uploadFile(file);

            if (result.success) {
              setFiles((prevFiles) =>
                prevFiles.map((f) =>
                  f.id === id
                    ? {
                        ...f,
                        metadata: {
                          ...f.metadata,
                          key: result.data.file.key,
                          publicUrl: result.data.file.url,
                          fileType: result.data.file.type,
                          isUploading: false,
                        },
                      }
                    : f,
                ),
              );
            } else {
              throw new Error(result.error);
            }
          } catch {
            setFiles((prevFiles) => prevFiles.filter((f) => f.id !== id));
            setUploadError({ show: true, message: 'Failed to upload file' });
          } finally {
            setUploadingFiles((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          }
        });

        await Promise.all(uploadPromises);
      }
    },
    [files.length],
  );

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.length) return;
      await processFiles(Array.from(e.target.files));
    },
    [processFiles],
  );

  const handleFileDrop = useCallback(
    async (droppedFiles: File[]) => {
      if (droppedFiles.length > 0) await processFiles(droppedFiles);
    },
    [processFiles],
  );

  const removeFile = useCallback(
    async (index: number) => {
      const fileToRemove = files[index];
      setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
      if (fileToRemove.metadata.key) await deleteFile(fileToRemove.metadata.key);
    },
    [files],
  );

  return {
    files,
    uploadingFiles,
    uploadError,
    handleFileChange,
    handleFileDrop,
    removeFile,
    clearError,
    isUploadInProgress,
    clearFiles,
  };
};
