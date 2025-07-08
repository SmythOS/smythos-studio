import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Spinner } from '@src/react/shared/components/ui/spinner';
import { useAuthCtx } from '@src/react/shared/contexts/auth.context';
import { ERROR_TYPES } from '@src/react/shared/enums';

const SinglePriceSubscriptionPage = () => {
  const params = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [isErrorResponse, setIsErrorResponse] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorType, setErrorType] = useState<string>('');

  const {
    userInfo: { user, subs },
  } = useAuthCtx();

  useEffect(() => {
    const { priceId } = params;
    if (priceId && user?.id) {
      if (!subs.plan.isCustomPlan) {
        subscribeToPaymentPlan(priceId);
      } else {
        setIsErrorResponse(true);
        setErrorType(ERROR_TYPES.ALREADY_SUBSCRIBED);
      }
    }
  }, [params, user]);

  const subscribeToPaymentPlan = async (priceId: string) => {
    try {
      setLoading(true);
      setErrorMessage('');
      setIsErrorResponse(false);
      const res = await fetch('/api/page/plans/subscriptions/checkout/generate-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
        }),
      });

      const { session } = await res.json();
      const { sessionUrl } = session;
      if (sessionUrl) {
        window.location.href = sessionUrl;
      } else {
        setIsErrorResponse(true);
        setErrorType(ERROR_TYPES.GENERIC);
      }
    } catch (error) {
      setIsErrorResponse(true);
      setErrorType(ERROR_TYPES.GENERIC);
      setErrorMessage(
        error?.error?.message || 'Something went wrong while processing your request.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-sans h-screen flex items-center justify-center">
      {loading && !isErrorResponse && (
        <div className="px-8 py-16 bg-white text-gray-900 w-full md:w-1/2 flex items-center justify-center rounded-lg font-sans font-medium">
          <h3 className="text-xl text-center">
            Your payment is being processed. Please wait...
            <span className="px-2">
              <Spinner />
            </span>
          </h3>
        </div>
      )}
      {isErrorResponse && (
        <div className="p-8 bg-white text-gray-900 flex items-center flex-col text-center justify-center rounded-lg font-sans">
          {errorType === ERROR_TYPES.ALREADY_SUBSCRIBED ? (
            <>
              <h3 className="text-xl">
                You are already subscribed to a custom plan. Please reach out to support if you need
                to change your plan.
              </h3>
              <button
                className="text-white mt-6 flex items-center bg-primary-100 hover:opacity-75 focus:ring-4 focus:outline-none disabled:opacity-40 rounded-md text-sm px-5 py-2.5 text-center justify-center"
                type="button"
                onClick={() => (window.location.href = '/my-plan')}
              >
                Plan Details
              </button>
            </>
          ) : (
            <>
              <h3 className="text-xl">
                {errorMessage || 'Something went wrong while processing your request.'}
              </h3>
              <p className="text-gray-700">
                Please try again later or contact support if the issue persists.
              </p>
              <button
                className="text-white mt-6 flex items-center bg-primary-100 hover:opacity-75 focus:ring-4 focus:outline-none disabled:opacity-40 rounded-md text-sm px-5 py-2.5 text-center justify-center"
                type="button"
                onClick={() => navigate('/')}
              >
                Back to Home
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SinglePriceSubscriptionPage;
