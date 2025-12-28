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

type IProps = {
  agentId?: string;
  chatId?: string;
};

export const useFileUpload = (options: IProps): IFileUpload => {
  const { agentId, chatId } = options;

  const [attachments, setAttachments] = useState<IFileAttachment[]>([]);
  const [status, setStatus] = useState<Record<string, IUploadStatus>>({});
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const blobsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (errorMessage) {
      timer = setTimeout(() => setErrorMessage(''), 5000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [errorMessage]);

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
    },
    [attachments],
  );

  const addFiles = useCallback(
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

        const created: IFileAttachment[] = pending.map(({ file, id }) => {
          let blobUrl: string | null = null;
          if (file.type.startsWith('image/')) {
            try {
              blobUrl = URL.createObjectURL(file);
              blobsRef.current.add(blobUrl);
            } catch (err) {
              console.error('[FileUpload] Error creating blob URL:', err); // eslint-disable-line no-console
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

  const remove = useCallback(
    (index: number) => {
      const target = attachments[index];

      setAttachments((prev) => prev.filter((_, i) => i !== index));

      setStatus((prev) => {
        const next = { ...prev };
        delete next[target.name];
        return next;
      });
    },
    [attachments],
  );

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
    },
    [attachments],
  );

  const clearError = useCallback(() => {
    setErrorMessage('');
  }, [setErrorMessage]);

  return {
    attachments,
    status,
    uploading,
    errorMessage,
    addFiles,
    remove,
    clear,
    clearError,
  };
};
