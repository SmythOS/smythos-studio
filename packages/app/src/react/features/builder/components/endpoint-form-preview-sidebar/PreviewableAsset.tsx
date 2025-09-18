import { getFileCategory, getMimeTypeFromUrl } from '@src/react/features/builder/utils';
import { Spinner } from '@src/react/shared/components/ui/spinner';
import classNames from 'classnames';
import { TextInput } from 'flowbite-react';
import { useEffect, useState } from 'react';
import { FaRegCopy } from 'react-icons/fa';
import { FaCheck } from 'react-icons/fa6';

const PreviewableAsset = ({ asset }: { asset: string }) => {
  const [stateProps, setStateProps] = useState<{
    isContentLoaded: boolean;
    fileType: string;
  }>({
    isContentLoaded: false,
    fileType: '',
  });
  const [isCopied, setIsCopied] = useState(false);

  const removeLoader = () => {
    setStateProps({
      ...stateProps,
      isContentLoaded: true,
    });
  };

  useEffect(() => {
    async function getFileType(asset: string) {
      //convert escaped newlines to real newlines
      try {
        const mimeType = getMimeTypeFromUrl(asset.trim());
        if (!mimeType.mimetype) {
          return;
        }
        let fileType = getFileCategory(mimeType.mimetype) || '';
        setStateProps((prev) => ({
          ...prev,
          fileType,
        }));
      } catch (error) {
        console.error(error);
      }
    }

    getFileType(asset);
  }, [asset]);

  let previewContent;
  switch (stateProps.fileType) {
    case 'image':
      previewContent = (
        <div>
          <img
            src={asset}
            className="max-w-full m-auto rounded-lg"
            onError={removeLoader}
            onLoad={removeLoader}
          />
        </div>
      );
      break;
    case 'audio':
      previewContent = (
        <audio
          controls
          crossOrigin="anonymous"
          src={asset}
          className="max-w-full m-auto"
          onError={removeLoader}
          onCanPlay={removeLoader}
        />
      );
      break;
    case 'video':
      previewContent = (
        <video
          controls
          className="max-w-full m-auto"
          onError={removeLoader}
          onCanPlay={removeLoader}
        >
          <source src={asset} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      );
      break;
    case 'pdf':
      previewContent = (
        <embed
          src={asset + '#toolbar=0'}
          type="application/pdf"
          className="w-full h-[80vh]"
          onError={removeLoader}
          onLoad={removeLoader}
        />
      );
      break;
    default:
      previewContent = (
        <div className="text-center">
          <a
            href={asset}
            target="_blank"
            download
            className="btn btn-primary fallback-file-download-link font-medium text-blue-600 dark:text-blue-500 hover:underline"
          >
            Download File
          </a>
        </div>
      );
      break;
  }

  return (
    <div className="mt-5 relative">
      {!stateProps.isContentLoaded && (
        <div className="flex justify-center items-center h-8 mt-1">
          <Spinner size="sm" />
        </div>
      )}

      <div
        className={classNames('mt-4 transition-opacity duration-300', {
          'opacity-0': !stateProps.isContentLoaded,
        })}
      >
        {previewContent}
      </div>
      <div className="mt-5 relative">
        <TextInput
          name="rawContent"
          type="text"
          defaultValue={asset}
          readOnly
          className="text-gray-800"
        />
        <div className={classNames('absolute right-2 flex gap-2 top-1/2 -translate-y-1/2')}>
          <span
            onClick={() => {
              navigator.clipboard.writeText(asset);
              setIsCopied(true);
            }}
            onMouseLeave={() => {
              setIsCopied(false);
            }}
            className="cursor-pointer rounded-lg p-2 h-full flex items-center text-sm border border-solid border-gray-200 bg-gray-50 text-gray-900"
          >
            {isCopied ? <FaCheck /> : <FaRegCopy />}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PreviewableAsset;
