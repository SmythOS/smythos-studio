
type Props = {
  error: {
    code?: string;
    message: string;
  };
};

const FullScreenError = ({ error }: Props) => {
  return (
    <div className="bg-gradient-to-b from-gray-900 to-emerald-800">
      <div className="w-9/12 m-auto py-16 min-h-screen flex items-center justify-center">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-8">
          <div className="border-t border-gray-200 text-center pt-8 px-16">
            {error.code && (
              <h1 className="text-9xl font-bold text-emerald-400">{error.code}</h1>
            )}
            <h1 className="text-4xl font-medium py-8">oops! An Error happened</h1>
            <p className="text-4xl pb-8 px-12 font-bold text-red-800">{error.message}</p>
            <a
              href="/"
              className="mt-4 inline-block rounded bg-smyth-emerald-400 hover:opacity-75 px-4 py-2 font-semibold text-white"
            >
              Go back to Home{' '}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullScreenError;
