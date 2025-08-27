/* eslint-disable max-len */
import { FileWithMetadata } from '@react/shared/types/chat.types';
import classNames from 'classnames';
import { FC, useEffect, useMemo, useState } from 'react';
import {
  FaRegFileAudio,
  FaRegFileCode,
  FaRegFileExcel,
  FaRegFileLines,
  FaRegFilePdf,
  FaRegFileVideo,
  FaRegFileWord,
} from 'react-icons/fa6';
import { CloseIcon } from './icons';

interface FileItemPreviewProps {
  file: FileWithMetadata;
  onRemove?: () => void;
  isUploading?: boolean;
  fileKey?: string;
  isReadOnly?: boolean;
  /** Indicates if the preview is being rendered inside a chat bubble */
  inChatBubble?: boolean;
}

const commonProps = { className: 'text-white', fontSize: 20 };
const DEFAULT_ICON = <FaRegFileLines {...commonProps} />;
const FILE_ICONS = {
  pdf: <FaRegFilePdf {...commonProps} />,
  doc: <FaRegFileWord {...commonProps} />,
  docx: <FaRegFileWord {...commonProps} />,
  xls: <FaRegFileExcel {...commonProps} />,
  xlsx: <FaRegFileExcel {...commonProps} />,
  csv: <FaRegFileExcel {...commonProps} />,
  mp3: <FaRegFileAudio {...commonProps} />,
  wav: <FaRegFileAudio {...commonProps} />,
  ogg: <FaRegFileAudio {...commonProps} />,
  mp4: <FaRegFileVideo {...commonProps} />,
  avi: <FaRegFileVideo {...commonProps} />,
  mov: <FaRegFileVideo {...commonProps} />,
  js: <FaRegFileCode {...commonProps} />,
  ts: <FaRegFileCode {...commonProps} />,
  py: <FaRegFileCode {...commonProps} />,
  java: <FaRegFileCode {...commonProps} />,
  cpp: <FaRegFileCode {...commonProps} />,
  txt: <FaRegFileLines {...commonProps} />,
};

const RemoveButton: FC<{ onRemove: () => void }> = ({ onRemove }) => (
  <button
    onClick={onRemove}
    className="absolute -top-2 -right-2 bg-white rounded-full p-1 text-gray-500 hover:text-gray-700 border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity z-10"
  >
    <CloseIcon />
  </button>
);

export const FileItemPreview: FC<FileItemPreviewProps> = ({
  file,
  onRemove,
  isUploading,
  isReadOnly = false,
  inChatBubble = false,
}) => {
  const previewFile = file.file ?? file?.metadata?.publicUrl;
  const [preview, setPreview] = useState<string | null>(null);

  const fileExtension = useMemo(
    () => file.file?.name?.split('.').pop()?.toLowerCase(),
    [file.file?.name],
  );

  const fileIcon = useMemo(() => FILE_ICONS[fileExtension] || DEFAULT_ICON, [fileExtension]);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  useEffect(() => {
    if (previewFile instanceof File && previewFile.type.startsWith('image/')) {
      const objectUrl = URL.createObjectURL(previewFile);
      setPreview(objectUrl);
    }
  }, [file]); // eslint-disable-line react-hooks/exhaustive-deps

  const isImage = useMemo(
    () => file.file?.type?.startsWith('image/') || file.metadata?.fileType?.startsWith('image/'),
    [file.file?.type, file.metadata?.fileType],
  );

  if (isImage) {
    return (
      <div className="relative group w-16 h-16 min-w-[4rem] min-h-[4rem]">
        {!!preview && (
          <img
            src={preview}
            alt={file.file?.name}
            className="w-full h-full object-cover rounded-lg"
          />
        )}
        {isUploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-solid border-2 border-white border-t-transparent"></div>
          </div>
        )}
        {!isReadOnly && !inChatBubble && <RemoveButton onRemove={onRemove} />}
      </div>
    );
  }

  return (
    <div className="relative group">
      {!isReadOnly && !inChatBubble && <RemoveButton onRemove={onRemove} />}
      <div
        className={classNames(
          'flex items-center gap-4 text-sm bg-white rounded-lg border border-gray-200 border-solid p-2 overflow-hidden w-56 min-w-[10rem] h-16',
        )}
      >
        <div className="flex items-center justify-center bg-primary-100 rounded-lg p-2 flex-shrink-0">
          {isUploading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
          ) : (
            fileIcon
          )}
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <span className="truncate font-semibold">{file.file?.name}</span>
          <span className="text-gray-400">{file.file?.name.split('.').pop()?.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
};
