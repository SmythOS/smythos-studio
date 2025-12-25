import { ALLOWED_FILE_SIZE, MAX_UPLOADS } from '@react/features/ai-chat/constants';
import type {
  IFileAttachment,
  IFileUpload,
  IUploadStatus,
} from '@react/features/ai-chat/types/chat';
import {
  generateUniqueFileId,
  uploadFiles,
  validateSingleFile,
} from '@react/features/ai-chat/utils/file';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * File upload hook options
 */
interface IFileUploadOptions {
  agentId?: string;
  chatId?: string;
}

/**
 * Custom hook for managing file uploads with preview support
 *
 * @param options - Hook configuration with agentId and chatId
 * @returns File upload state and methods
 *
 * @example
 * ```typescript
 * const {
 *   attachments,
 *   uploading,
 *   process,
 *   remove,
 *   clear,
 * } = useFileUpload({ agentId: 'agent-123', chatId: 'chat-456' });
 *
 * // Process files from input
 * await process(fileList);
 *
 * // Remove single file
 * remove(0);
 *
 * // Clear all
 * clear();
 * ```
 */
export const useFileUpload = (options: IFileUploadOptions): IFileUpload => {
  const { agentId, chatId } = options;

  // State
  const [attachments, setAttachments] = useState<IFileAttachment[]>([]);
  const [status, setStatus] = useState<Record<string, IUploadStatus>>({});
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [toast, setToast] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Refs
  const blobsRef = useRef<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-hide error message after 5 seconds
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (errorMessage) {
      timer = setTimeout(() => setErrorMessage(''), 5000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [errorMessage]);

  // Handle upload error
  const onError = useCallback(
    (fileName: string, message: string) => {
      setErrorMessage(message);

      const target = attachments.find((a) => a.name === fileName);

      if (target?.blobUrl) {
        URL.revokeObjectURL(target.blobUrl);
        blobsRef.current.delete(target.blobUrl);
      }

      setAttachments(attachments.filter((a) => a.name !== fileName));

      setStatus((prev) => {
        const next = { ...prev };
        delete next[fileName];
        return next;
      });

      if (inputRef.current) inputRef.current.value = '';
    },
    [attachments],
  );

  // Process files for upload
  const processFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      const slots = MAX_UPLOADS - attachments.length;

      if (slots <= 0) {
        setErrorMessage(`Maximum ${MAX_UPLOADS} files allowed`);
        return;
      }

      const validated = files.map((file) => ({
        file,
        error: validateSingleFile(file),
        id: generateUniqueFileId(file),
      }));

      const valid = validated.filter((item) => !item.error);
      const invalid = validated.filter((item) => item.error);

      if (invalid.length > 0) {
        setErrorMessage(invalid[0].error || 'Failed to upload file');
      }

      if (valid.length > 0) {
        const pending = valid.slice(0, slots);

        // Create attachments with blob URLs for images
        const created: IFileAttachment[] = pending.map(({ file, id }) => {
          let blobUrl: string | null = null;
          if (file.type.startsWith('image/')) {
            try {
              blobUrl = URL.createObjectURL(file);
              blobsRef.current.add(blobUrl);
            } catch (err) {
              // eslint-disable-next-line no-console
              console.error('[FileUpload] Error creating blob URL:', err);
            }
          }
          return { id, file, blobUrl, name: file.name, type: file.type, size: file.size };
        });

        setAttachments((prev) => [...prev, ...created]);

        setStatus((prev) => {
          const next = { ...prev };
          pending.forEach(({ file }) => {
            next[file.name] = { status: 'uploading', progress: 0 };
          });
          return next;
        });

        setUploading(true);

        const uploads = created.map(async (attachment) => {
          try {
            const response = await uploadFiles({
              files: [attachment.file],
              agentId,
              chatId,
            });

            const uploaded = response.files?.[0];

            if (uploaded) {
              setAttachments((prev) =>
                prev.map((a) => (a.id === attachment.id ? { ...a, url: uploaded.url } : a)),
              );
              setStatus((prev) => ({
                ...prev,
                [attachment.name]: { status: 'completed', progress: 100 },
              }));
            }
          } catch {
            setStatus((prev) => ({
              ...prev,
              [attachment.name]: { status: 'error', progress: 0 },
            }));
            onError(
              attachment.name,
              attachment.size > ALLOWED_FILE_SIZE ? 'File size exceeds 5MB limit' : 'Upload failed',
            );
          }
        });

        await Promise.all(uploads);
        setUploading(false);
      }
    },
    [attachments.length, agentId, chatId, onError],
  );

  // Handle file input change
  const onSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []).slice(0, MAX_UPLOADS);
      await processFiles(files);
    },
    [processFiles],
  );

  // Remove attachment by index
  const remove = useCallback(
    (index: number) => {
      const target = attachments[index];

      setAttachments((prev) => prev.filter((_, i) => i !== index));

      setStatus((prev) => {
        const next = { ...prev };
        delete next[target.name];
        return next;
      });

      if (inputRef.current) inputRef.current.value = '';
    },
    [attachments],
  );

  // Clear all attachments
  const clear = useCallback(
    (preserveBlobUrls = false) => {
      if (preserveBlobUrls) {
        attachments.forEach((a) => {
          if (a.blobUrl) blobsRef.current.delete(a.blobUrl);
        });
      } else {
        attachments.forEach((a) => {
          if (a.blobUrl) {
            URL.revokeObjectURL(a.blobUrl);
            blobsRef.current.delete(a.blobUrl);
          }
        });
      }

      setAttachments([]);
      setStatus({});
      if (inputRef.current) inputRef.current.value = '';
    },
    [attachments],
  );

  // Cleanup unused blob URLs
  const cleanup = useCallback(() => {
    const active = new Set<string>();

    attachments.forEach((a) => {
      if (a.blobUrl) active.add(a.blobUrl);
    });

    const stale: string[] = [];
    blobsRef.current.forEach((url) => {
      if (!active.has(url)) {
        URL.revokeObjectURL(url);
        stale.push(url);
      }
    });

    stale.forEach((url) => blobsRef.current.delete(url));
  }, [attachments]);

  return {
    attachments,
    status,
    uploading,
    toast,
    showToast,
    errorMessage,
    inputRef,
    onSelect,
    process: processFiles,
    remove,
    clear,
    cleanup,
    setShowToast,
    setToast,
    setErrorMessage,
  };
};
