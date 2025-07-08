import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

// Define error mappings
const ERROR_MAPPINGS: Record<string, { title: string; message: string }> = {
  '400': {
    title: 'Bad Request',
    message: 'The server cannot process the request due to a client error.',
  },
  '401': {
    title: 'Unauthorized',
    message: 'Authentication is required and has failed or has not been provided.',
  },
  '403': {
    title: 'Forbidden',
    message: 'You do not have permission to access this resource.',
  },
  '404': {
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist or has been moved.',
  },
  '500': {
    title: 'Internal Server Error',
    message: 'Something went wrong on our end. Please try again later.',
  },
  '502': {
    title: 'Bad Gateway',
    message: 'The server received an invalid response from an upstream server.',
  },
  '503': {
    title: 'Service Unavailable',
    message: 'The server is currently unable to handle the request due to temporary overloading or maintenance.',
  },
  '504': {
    title: 'Gateway Timeout',
    message: 'The server did not receive a timely response from an upstream server.',
  },
};

// Fallback error (404)
const FALLBACK_ERROR = {
  code: '500',
  title: 'Internal Server Error',
  message: 'Something went wrong on our end. Please try again later.',
};

export default function ErrorPage({ code: enforcedCode }: { code?: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { code } = useParams();


  const handleGoBack = () => {
    if (window.history.length > 2) {
      window.history.back();
    } else {
      window.location.href = '/'; // Or homepage or some fallback
    }
  };


  // Get error details from mappings or use fallback
  const errorDetails = ERROR_MAPPINGS[enforcedCode || code] || {
    title: FALLBACK_ERROR.title,
    message: FALLBACK_ERROR.message,
  };

  // if message was provided in query params, use it
  if (searchParams.get('message')) {
    errorDetails.message = searchParams.get('message');
  }

  // Animation effect on mount
  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="bg-gradient-to-b from-gray-900 via-gray-800 to-emerald-800 min-h-screen">
      <div className="w-11/12 md:w-9/12 mx-auto py-16 min-h-screen flex items-center justify-center">
        <div
          className={`bg-white/95 backdrop-blur-sm shadow-2xl overflow-hidden rounded-2xl p-8 max-w-2xl w-full transition-all duration-700 ease-in-out ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-8'}`}
        >
          <div className="text-center pt-4 px-4 md:px-8">
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center justify-center">
                <AlertTriangle className="text-amber-500 w-24 h-24 opacity-10" />
              </div>
              <h1 className="text-8xl md:text-9xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-400 text-transparent bg-clip-text relative z-10">
                {code}
              </h1>
            </div>

            <h2 className="text-2xl md:text-4xl font-medium py-4 text-gray-800">{errorDetails.title}</h2>

            <p
              className={`${errorDetails.message.length > 40 ? 'text-lg md:text-xl whitespace-pre-line' : 'text-2xl md:text-3xl'} pb-8 px-4 md:px-12 font-medium text-red-700`}
            >
              {errorDetails.message}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
              {/* hard navigate to home */}
              <a
                onClick={() => window.location.href = '/'}
                className="group flex items-center gap-2 rounded-full bg-emerald-500 cursor-pointer select-none hover:bg-emerald-600 px-6 py-3 font-semibold text-white transition-all duration-300 shadow-lg hover:shadow-emerald-200/50"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                Return to Home
              </a>

              <button
                onClick={handleGoBack}
                className="flex items-center gap-2 rounded-full bg-gray-100 hover:bg-gray-200 px-6 py-3 font-semibold text-gray-700 transition-all duration-300"
              >
                Go Back
              </button>
            </div>

            <div className="mt-12 text-sm text-gray-500">If you believe this is an error, please contact support.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
