import { memo, useEffect, useMemo, useState, type FC, type ReactElement } from 'react';
import {
  FaRegFileAudio,
  FaRegFileCode,
  FaRegFileExcel,
  FaRegFileLines,
  FaRegFilePdf,
  FaRegFileVideo,
  FaRegFileWord,
  FaXmark,
} from 'react-icons/fa6';
import type { TAttachment } from '../../types';

const FILE_ICONS: Record<string, ReactElement> = {
  pdf: <FaRegFilePdf className="text-white text-xl" />,
  doc: <FaRegFileWord className="text-white text-xl" />,
  docx: <FaRegFileWord className="text-white text-xl" />,
  xls: <FaRegFileExcel className="text-white text-xl" />,
  xlsx: <FaRegFileExcel className="text-white text-xl" />,
  csv: <FaRegFileExcel className="text-white text-xl" />,
  mp3: <FaRegFileAudio className="text-white text-xl" />,
  wav: <FaRegFileAudio className="text-white text-xl" />,
  ogg: <FaRegFileAudio className="text-white text-xl" />,
  mp4: <FaRegFileVideo className="text-white text-xl" />,
  avi: <FaRegFileVideo className="text-white text-xl" />,
  mov: <FaRegFileVideo className="text-white text-xl" />,
  js: <FaRegFileCode className="text-white text-xl" />,
  ts: <FaRegFileCode className="text-white text-xl" />,
  py: <FaRegFileCode className="text-white text-xl" />,
  java: <FaRegFileCode className="text-white text-xl" />,
  cpp: <FaRegFileCode className="text-white text-xl" />,
  txt: <FaRegFileLines className="text-white text-xl" />,
};

const DEFAULT_ICON = <FaRegFileLines className="text-white text-xl" />;

interface IRemoveButtonProps {
  onRemove: () => void;
}

const RemoveButton: FC<IRemoveButtonProps> = memo(({ onRemove }) => (
  <button
    onClick={onRemove}
    className="size-6 flex justify-center items-center bg-white rounded-full text-[#6B7280] border border-[#E5E7EB] opacity-0 transition-opacity duration-200 z-10 cursor-pointer hover:text-[#374151] pt-0.5"
    aria-label="Remove file"
  >
    <FaXmark />
  </button>
));

RemoveButton.displayName = 'RemoveButton';

export interface IFileItemPreviewProps {
  attachment: TAttachment;
  onRemove?: () => void;
  isUploading?: boolean;
}

const getFileExtension = (fileName: string, url?: string, blobUrl?: string | null): string => {
  if (fileName) {
    const ext = fileName.split('.').pop();
    if (ext) {
      return ext.toLowerCase();
    }
  }

  const urlToCheck = url || blobUrl;
  if (urlToCheck) {
    const urlPath = urlToCheck.split('/').pop() || urlToCheck.split('\\').pop() || '';
    const cleanPath = urlPath.split('?')[0];
    const ext = cleanPath.split('.').pop();
    if (ext) {
      return ext.toLowerCase();
    }
  }

  return '';
};

const isImageType = (mimeType: string): boolean => {
  return mimeType.startsWith('image/');
};

const getPreviewUrl = (attachment: TAttachment): string | null => {
  if (attachment.blobUrl) {
    return attachment.blobUrl;
  }

  if (attachment.file) {
    return URL.createObjectURL(attachment.file);
  }

  return attachment.url || null;
};

export const FileItemPreview: FC<IFileItemPreviewProps> = memo(
  ({ attachment, onRemove, isUploading = false }) => {
    const { name, type, file, url, blobUrl } = attachment;

    const [preview, setPreview] = useState<string | null>(() => {
      return blobUrl || url || null;
    });

    const fileExtension = useMemo(() => getFileExtension(name, url, blobUrl), [name, url, blobUrl]);
    const fileIcon = useMemo(() => FILE_ICONS[fileExtension] || DEFAULT_ICON, [fileExtension]);
    const isImage = useMemo(() => isImageType(type), [type]);

    useEffect(() => {
      if (!isImage) {
        setPreview(null);
        return;
      }

      const previewUrl = getPreviewUrl(attachment);
      setPreview(previewUrl);

      return () => {
        if (previewUrl && file && !blobUrl && !url) {
          URL.revokeObjectURL(previewUrl);
        }
      };
    }, [isImage, attachment, file, blobUrl, url]);

    const handleImageError = () => {
      if (file && isImageType(file.type)) {
        try {
          const newBlobUrl = URL.createObjectURL(file);
          setPreview(newBlobUrl);
          return;
        } catch {
          // Fall through to URL check
        }
      }

      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        if (preview !== url) setPreview(url);
      } else setPreview(null);
    };

    if (isImage) {
      return (
        <div className="relative inline-block size-16 min-w-16 min-h-16 group mt-4">
          {preview ? (
            <img
              src={preview}
              alt={name}
              className="w-full h-full object-cover rounded-lg"
              onError={handleImageError}
            />
          ) : (
            <div className="w-full h-full bg-gray-200 rounded-lg flex flex-col items-center justify-center">
              <span className="text-xs text-gray-500">Preview unavailable</span>
            </div>
          )}
          {isUploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-solid border-2 border-white border-t-transparent" />
            </div>
          )}
          {onRemove && (
            <div className="absolute -top-2 -right-2 group-hover:[&>button]:opacity-100">
              <RemoveButton onRemove={onRemove} />
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="relative inline-block group mt-4">
        {onRemove && (
          <div className="absolute -top-2 -right-2 z-10 group-hover:[&>button]:opacity-100">
            <RemoveButton onRemove={onRemove} />
          </div>
        )}
        <div className="flex items-center gap-4 text-sm bg-white rounded-lg border border-[#E5E7EB] px-2 py-1 overflow-hidden w-40 min-w-32 max-h-[52px]">
          <div className="flex items-center justify-center bg-primary-100 rounded-lg p-2 flex-shrink-0">
            {isUploading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-solid border-2 border-white border-t-transparent" />
            ) : (
              fileIcon
            )}
          </div>
          <div className="min-w-0 space-y-0.5">
            <h6 className="whitespace-nowrap overflow-hidden text-ellipsis font-semibold">
              {name}
            </h6>
            <p className="text-[#9CA3AF]">{fileExtension.toUpperCase() || 'FILE'}</p>
          </div>
        </div>
      </div>
    );
  },
);

FileItemPreview.displayName = 'FileItemPreview';
