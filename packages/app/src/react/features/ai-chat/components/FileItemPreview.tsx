import { cn } from '@src/react/shared/utils/general';
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

const FILE_ICONS: Record<string, ReactElement> = {
  pdf: <FaRegFilePdf className="text-white text-xl" />,
  doc: <FaRegFileWord className="text-white text-xl" />,
  docx: <FaRegFileWord className="text-white text-xl" />,
  xls: <FaRegFileExcel className="text-white text-xl" />,
  xlsx: <FaRegFileExcel className="text-white text-xl" />,
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
};

const DEFAULT_ICON = <FaRegFileLines className="text-white text-xl" />;

interface IRemoveButtonProps {
  onRemove: () => void;
}

const RemoveButton: FC<IRemoveButtonProps> = memo(({ onRemove }) => (
  <button
    onClick={onRemove}
    className="absolute -top-2 -right-2 size-6 flex justify-center items-center bg-white rounded-full text-[#6B7280] border border-[#E5E7EB] opacity-0 transition-opacity duration-200 z-10 cursor-pointer hover:text-[#374151] pt-0.5"
    aria-label="Remove file"
  >
    <FaXmark />
  </button>
));

RemoveButton.displayName = 'RemoveButton';

export interface IFileItemPreviewProps {
  fileObj?: File;
  url?: string;
  blobUrl?: string | null;
  mimeType?: string;
  fileName?: string;
  onRemove?: () => void;
  isUploading?: boolean;
  isReadOnly?: boolean;
  inChatBubble?: boolean;
}

const getFileExtension = (fileName?: string, url?: string, blobUrl?: string | null): string => {
  if (fileName) {
    return fileName.split('.').pop()?.toLowerCase() || '';
  }

  const urlToCheck = url || blobUrl;
  if (urlToCheck) {
    const urlPath = urlToCheck.split('/').pop() || urlToCheck.split('\\').pop() || '';
    const cleanPath = urlPath.split('?')[0];
    return cleanPath.split('.').pop()?.toLowerCase() || '';
  }

  return '';
};

const isImageType = (mimeType?: string): boolean => {
  return mimeType?.startsWith('image/') || false;
};

const getPreviewUrl = (
  fileObj?: File,
  url?: string,
  blobUrl?: string | null,
  inChatBubble?: boolean,
): string | null => {
  if (inChatBubble) {
    return blobUrl || url || null;
  }

  if (fileObj) {
    return URL.createObjectURL(fileObj);
  }

  return blobUrl || url || null;
};

export const FileItemPreview: FC<IFileItemPreviewProps> = memo(
  ({
    fileObj,
    url,
    blobUrl,
    mimeType,
    fileName,
    onRemove,
    isUploading = false,
    isReadOnly = false,
    inChatBubble = false,
  }) => {
    const [preview, setPreview] = useState<string | null>(() => {
      if (inChatBubble) return blobUrl || url || null;
      return null;
    });

    const fileExtension = useMemo(
      () => getFileExtension(fileName || fileObj?.name, url, blobUrl),
      [fileName, fileObj?.name, url, blobUrl],
    );

    const fileIcon = useMemo(() => FILE_ICONS[fileExtension] || DEFAULT_ICON, [fileExtension]);

    const isImage = useMemo(() => {
      const type = mimeType || fileObj?.type;
      return isImageType(type);
    }, [mimeType, fileObj?.type]);

    useEffect(() => {
      if (!isImage) {
        setPreview(null);
        return;
      }

      const previewUrl = getPreviewUrl(fileObj, url, blobUrl, inChatBubble);
      setPreview(previewUrl);

      return () => {
        if (previewUrl && !inChatBubble && fileObj) {
          URL.revokeObjectURL(previewUrl);
        }
      };
    }, [isImage, fileObj, url, blobUrl, inChatBubble]);

    const displayName = fileName || fileObj?.name || 'Unknown file';

    const handleImageError = () => {
      if (inChatBubble) {
        if (fileObj && isImageType(fileObj.type)) {
          try {
            const newBlobUrl = URL.createObjectURL(fileObj);
            setPreview(newBlobUrl);
            return;
          } catch {
            // Fall through to URL check
          }
        }

        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
          setPreview(url);
        } else setPreview(null);
      } else {
        if (url && preview !== url) setPreview(url);
      }
    };

    if (isImage) {
      return (
        <div
          className={cn(
            'relative inline-block size-16 min-w-16 min-h-16 group',
            inChatBubble ? 'mt-0' : 'mt-4',
          )}
        >
          {preview ? (
            <img
              src={preview}
              alt={displayName}
              className="w-full h-full object-cover rounded-lg"
              onError={handleImageError}
            />
          ) : (
            <div className="w-full h-full bg-gray-200 rounded-lg flex flex-col items-center justify-center">
              <span className="text-xs text-gray-500">Preview unavailable</span>
              {inChatBubble && url && (
                <span className="text-[10px] text-gray-400 mt-1">{url.substring(0, 20)}...</span>
              )}
            </div>
          )}
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
              <div className="animate-spin rounded-full p-2 border-2 border-white border-t-transparent" />
            </div>
          )}
          {!isReadOnly && !inChatBubble && onRemove && (
            <div className="group-hover:[&>button]:opacity-100">
              <RemoveButton onRemove={onRemove} />
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={cn('relative inline-block group', inChatBubble ? 'mt-0' : 'mt-4')}>
        {!isReadOnly && !inChatBubble && onRemove && (
          <div className="group-hover:[&>button]:opacity-100">
            <RemoveButton onRemove={onRemove} />
          </div>
        )}
        <div className="flex items-center gap-4 text-sm bg-white rounded-lg border border-[#E5E7EB] px-2 py-1 overflow-hidden w-40 min-w-32 max-h-[52px]">
          <div className="flex items-center justify-center bg-[#45C9A9] rounded-lg p-2 shrink-0">
            {isUploading ? (
              <div className="animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              fileIcon
            )}
          </div>
          <div className="min-w-0 space-y-0.5">
            <h6 className="whitespace-nowrap overflow-hidden text-ellipsis font-semibold">
              {displayName}
            </h6>
            <p className="text-[#9CA3AF]">{fileExtension.toUpperCase() || 'FILE'}</p>
          </div>
        </div>
      </div>
    );
  },
);

FileItemPreview.displayName = 'FileItemPreview';
