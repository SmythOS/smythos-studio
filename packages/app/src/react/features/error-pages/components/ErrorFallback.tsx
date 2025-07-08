import { HiOutlineRefresh } from 'react-icons/hi';

export default function ErrorFallback({
    errorMessage,
    retry,
  }: {
    errorMessage?: string;
    retry: () => void;
  }) {
    const msg = errorMessage || 'Sorry, there was a glitch in the matrix.';
    return (
      <div className="bg-grey p-2 rounded-md">
        <div className="flex flex-col space-y-4">
          <p className="text-center text-base glitch" data-text={msg}>
            {msg}
          </p>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={retry}
              className="flex gap-2 items-center rounded bg-white px-2 py-1"
            >
              <HiOutlineRefresh size={16} />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }