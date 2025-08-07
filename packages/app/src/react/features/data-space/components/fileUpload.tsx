import { Spinner } from '@react/shared/components/ui/spinner';
import { FiUploadCloud } from 'react-icons/fi';
import { TbFile, TbTrash } from 'react-icons/tb';

export default function FileUpload({
  onChange,
  handleDelete,
  fileName,
  uploadLoading,
  disableUpload,
  deleteLoading,
  accept,
}: {
  onChange: (event: any) => void;
  handleDelete: () => void;
  fileName: string | null;
  uploadLoading: boolean;
  disableUpload: boolean;
  deleteLoading: boolean;
  accept: string;
}) {
  const handleDragOver = (event) => {
    event.preventDefault();
    event.currentTarget.classList.add('activeDrag');
  };

  const handleDragLeave = (event) => {
    event.currentTarget.classList.remove('activeDrag');
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.currentTarget.classList.remove('activeDrag');

    const files = event.dataTransfer.files;
    if (files.length) {
      const inputEl = document.getElementById('dropzone-file') as HTMLInputElement;
      inputEl.files = files;
      onChange && onChange({ target: inputEl });
    }
  };
  return (
    <div className="">
      <div className={fileName ? 'hidden' : 'flex items-center justify-center w-full'}>
        <label
          htmlFor="dropzone-file"
          className={` ${
            uploadLoading || disableUpload
              ? 'opacity-50 bg-gray-50 flex flex-col items-center justify-center w-full  rounded-lg'
              : 'bg-gray-50 hover:bg-gray-100 flex flex-col items-center justify-center w-full  rounded-lg cursor-pointer'
          } `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4">
            <FiUploadCloud size={28} />
            {uploadLoading ? (
              <Spinner classes="w-5 h-5" />
            ) : (
              <>
                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                  Drag and drop your file here or
                  <span className="font-semibold"> Click to upload.</span>
                </p>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  XML, DOCX or PDF (MAX. 800x400px)
                </p>
              </>
            )}
          </div>
          <input
            id="dropzone-file"
            accept={accept}
            data-multiple="false"
            type="file"
            className="hidden"
            onChange={onChange}
            data-role="file"
            data-mode="drop"
            disabled={uploadLoading || disableUpload}
          />
        </label>
      </div>
      <div className={fileName ? '' : 'hidden'}>
        <div className="flex justify-between bg-gray-50 text-black rounded-lg p-2 gap-2">
          <div className="flex items-center gap-2 overflow-hidden text-ellipsis">
            <TbFile size={22} className="min-w-max" />
            <span className="pl-2 overflow-hidden text-ellipsis max-w-[200px] sm:max-w-full">
              {fileName}{' '}
            </span>
          </div>

          <button
            disabled={deleteLoading}
            className=" deleteUpload rounded-full flex items-center"
            type="button"
          >
            {deleteLoading ? (
              <div id="loader" className="circular-loader mr-1"></div>
            ) : (
              <TbTrash size={22} onClick={handleDelete} className="cursor-pointer" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
