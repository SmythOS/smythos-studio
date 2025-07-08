import { useFileAttachment } from '@react/shared/hooks/useFileAttachment';
import classNames from 'classnames';
import { ClipboardEventHandler, InputHTMLAttributes, useEffect, useState } from 'react';
import { FiPaperclip } from 'react-icons/fi';

const FileOrUrlInput = ({
  accept,
  onValueChange,
  value,
  ...props
}: {
  accept?: string;
  onValueChange: (value: string) => void;
  value?: any;
} & InputHTMLAttributes<HTMLInputElement>) => {
  // const [value, setValue] = useState('');
  const [previewImage, setPreviewImage] = useState({ url: '', isLoaded: false, isError: false });

  const { attachmentFile, fileInputRef, isDragging, handlers, clearAttachment } = useFileAttachment(
    {
      onFileSelect: async (file) => {
        try {
          //   setIsFileUploading(true);

          const reader = new FileReader();
          const filePromise = new Promise((resolve) => {
            reader.onloadend = () => {
              const base64String = reader.result as string;

              onValueChange(base64String);

              resolve(true);
            };
          });

          reader.readAsDataURL(file);
          await filePromise;
        } catch (error) {
          console.error('Error processing file:', error);
        } finally {
          //   setIsFileUploading(false);
        }
      },
      acceptedTypes: [accept],
    },
  );

  const isImageUrl = (url: string) => {
    const pattern =
      /^(https?:\/\/[^\s/$.?#].[^\s]*\.(?:jpg|jpeg|png|gif|bmp|webp|svg|tiff|tif|ico|heic|heif|avif)(?:\?[^\s]*)?|data:image\/[a-zA-Z]+;base64,[^\s]+)$/;
    return pattern.test(url);
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      const canBePreviewed = isImageUrl(value);
      setPreviewImage({ url: canBePreviewed ? value : '', isLoaded: false, isError: false });
    }, 500); // Wait 500ms after user stops typing

    // Cleanup timeout
    return () => {
      clearTimeout(handler);
    };
  }, [value]);

  return (
    /*
    block w-full border disabled:cursor-not-allowed disabled:opacity-50 bg-gray-50 border-gray-300 text-gray-900 focus:border-cyan-500 focus:ring-cyan-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-cyan-500 dark:focus:ring-cyan-500 p-2.5 text-sm rounded-lg
    */
    <div
      className={classNames(
        'rounded-lg p-[9.5px] flex gap-2 transition-all duration-300 text-gray-900 border border-solid border-gray-300 border-b-gray-500 focus-within:border-b-2 focus-within:border-b-blue-500',
        { 'border-2 border-dashed border-[#288a68]': isDragging },
        `${attachmentFile ? 'items-end' : 'items-center'}`,
      )}
      onDragEnter={handlers.handleDragEnter}
      onDragOver={handlers.handleDragOver}
      onDragLeave={handlers.handleDragLeave}
      onDrop={handlers.handleDrop}
    >
      <div className="flex flex-col items-start gap-4 w-full">
        {attachmentFile && (
          <div className="relative group w-max">
            {accept === 'image/*' ? (
              <img
                src={URL.createObjectURL(attachmentFile)}
                alt="attachment preview"
                className="w-16 h-16 rounded-lg relative group border border-solid border-gray-200 object-cover"
              />
            ) : accept === 'audio/*' ? (
              // <audio src={URL.createObjectURL(attachmentFile)} controls />
              // just a box for now with center text "Audio"
              <div className="p-1 rounded-lg relative group border border-solid border-gray-200 flex items-center justify-center">
                <span className="text-gray-500">{attachmentFile.name}</span>
              </div>
            ) : accept === 'video/*' ? (
              // <video src={URL.createObjectURL(attachmentFile)} controls />
              // just a box for now with center text "Video"
              <div className="p-1 rounded-lg relative group border border-solid border-gray-200 flex items-center justify-center">
                <span className="text-gray-500">{attachmentFile.name}</span>
              </div>
            ) : accept === '/*' ? (
              // just a box for now with center text "Binary"
              <div className="p-2 rounded-lg relative group border border-solid border-gray-200 flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 transition-colors">
                <i className="fas fa-file text-gray-500" aria-hidden="true"></i>
                <span className="text-gray-600 font-medium text-sm truncate max-w-[150px]">
                  {attachmentFile.name}
                </span>
                <span className="text-xs text-gray-400 ml-1">
                  ({Math.round(attachmentFile.size / 1024)} KB)
                </span>
              </div>
            ) : null}
            <button
              type="button"
              onClick={(e) => {
                clearAttachment();
                onValueChange('');
              }}
              className="shadow-sm opacity-0 group-hover:opacity-100 transition-opacity absolute -right-1 -top-1 border border-solid border-gray-200 rounded-full w-4 h-4 bg-gray-100 flex items-center justify-center group-hover:bg-white"
            >
              <span className="sr-only">Remove attachment</span>
              <i className="fas fa-times text-xs" />
            </button>
          </div>
        )}
        {/* Image URL preview */}
        {!attachmentFile && previewImage.url && (
          <img
            src={previewImage.url}
            alt="attachment preview"
            onLoad={() => setPreviewImage({ ...previewImage, isLoaded: true })}
            onError={() => setPreviewImage({ ...previewImage, isError: true })}
            className={classNames(
              'w-16 h-16 rounded-lg relative group border border-solid border-gray-200 object-cover',
              {
                'opacity-100': previewImage.isLoaded,
                'opacity-50 animate-pulse bg-gray-200': !previewImage.isLoaded,
                hidden: previewImage.isError,
              },
            )}
          />
        )}
        {!attachmentFile && (
          <input
            // placeholder=
            className="flex-1 outline-none w-full bg-transparent text-gray-900 text-sm font-normal placeholder:text-sm placeholder:font-normal focus:outline-none focus:ring-0"
            value={value}
            onChange={(e) => {
              console.log('e.currentTarget.value', e.currentTarget.value);
              // setValue(e.currentTarget.value);
              onValueChange(e.currentTarget.value);
            }}
            onPaste={handlers.handlePaste as unknown as ClipboardEventHandler<HTMLInputElement>}
            name={props?.name}
            id={props?.id}
            onBlur={props?.onBlur}
            onFocus={props?.onFocus}
          />
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={accept}
        onChange={handlers.handleFileChange}
      />

      {(() => {
        const builtButtons = (
          <div className={classNames('flex items-center gap-2')}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <FiPaperclip fontSize={18} />
            </button>
          </div>
        );
        return builtButtons;
      })()}
    </div>
  );
};

export default FileOrUrlInput;
