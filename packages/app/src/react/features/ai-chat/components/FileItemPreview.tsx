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
import type { IAttachment } from '../types/chat';

/** Map of file extensions to their corresponding icons */
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

/** Default icon for unknown file types */
const DEFAULT_ICON = <FaRegFileLines className="text-white text-xl" />;

interface IRemoveButtonProps {
  onRemove: () => void;
}

/**
 * Remove button component for file preview
 * Shows on hover with a close icon
 */
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

/**
 * Props for FileItemPreview component
 * Uses IAttachment for file data, onRemove presence determines if removable
 */
export interface IFileItemPreviewProps {
  /** Attachment data containing file info */
  attachment: IAttachment;
  /** If provided, shows remove button. If not, component is readonly */
  onRemove?: () => void;
  /** Shows upload spinner overlay when true */
  isUploading?: boolean;
}

/**
 * Extracts file extension from filename or URL
 * @param fileName - The name of the file
 * @param url - Optional URL to extract extension from
 * @param blobUrl - Optional blob URL to extract extension from
 * @returns Lowercase file extension or empty string
 */
const getFileExtension = (fileName: string, url?: string, blobUrl?: string | null): string => {
  // Try to get extension from filename first
  if (fileName) {
    const ext = fileName.split('.').pop();
    if (ext) {
      return ext.toLowerCase();
    }
  }

  // Fallback to URL if filename doesn't have extension
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

/**
 * Checks if the given MIME type is an image type
 * @param mimeType - The MIME type to check
 * @returns True if the type is an image
 */
const isImageType = (mimeType: string): boolean => {
  return mimeType.startsWith('image/');
};

/**
 * Gets the preview URL for an attachment
 * Prioritizes blob URL, then creates object URL from file, then falls back to url
 * @param attachment - The attachment to get preview URL for
 * @returns Preview URL or null if not available
 */
const getPreviewUrl = (attachment: IAttachment): string | null => {
  // Prefer blobUrl if available
  if (attachment.blobUrl) {
    return attachment.blobUrl;
  }

  // Create object URL from File if available
  if (attachment.file) {
    return URL.createObjectURL(attachment.file);
  }

  // Fallback to url
  return attachment.url || null;
};

/**
 * FileItemPreview component displays a preview of an attached file
 * - Shows image thumbnail for image files
 * - Shows file icon and name for other file types
 * - Optional remove button controlled by onRemove prop presence
 * - Optional upload spinner overlay
 */
export const FileItemPreview: FC<IFileItemPreviewProps> = memo(
  ({ attachment, onRemove, isUploading = false }) => {
    const { name, type, file, url, blobUrl } = attachment;

    // State for image preview URL
    const [preview, setPreview] = useState<string | null>(() => {
      // Initialize with blobUrl or url for immediate display
      return blobUrl || url || null;
    });

    // Extract file extension from name or URLs
    const fileExtension = useMemo(() => getFileExtension(name, url, blobUrl), [name, url, blobUrl]);

    // Get appropriate icon based on file extension
    const fileIcon = useMemo(() => FILE_ICONS[fileExtension] || DEFAULT_ICON, [fileExtension]);

    // Check if file is an image based on MIME type
    const isImage = useMemo(() => isImageType(type), [type]);

    // Effect to handle preview URL creation and cleanup
    useEffect(() => {
      // Skip if not an image
      if (!isImage) {
        setPreview(null);
        return;
      }

      const previewUrl = getPreviewUrl(attachment);
      setPreview(previewUrl);

      // Cleanup: revoke object URL if we created one from file
      return () => {
        if (previewUrl && file && !blobUrl && !url) {
          URL.revokeObjectURL(previewUrl);
        }
      };
    }, [isImage, attachment, file, blobUrl, url]);

    /**
     * Handles image load error by trying alternative sources
     */
    const handleImageError = () => {
      // Try creating blob URL from file if available
      if (file && isImageType(file.type)) {
        try {
          const newBlobUrl = URL.createObjectURL(file);
          setPreview(newBlobUrl);
          return;
        } catch {
          // Fall through to URL check
        }
      }

      // Try using the URL if it's a valid http(s) URL
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        if (preview !== url) setPreview(url);
      } else setPreview(null);
    };

    // Render image preview for image files
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

    // Render file icon preview for non-image files

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
