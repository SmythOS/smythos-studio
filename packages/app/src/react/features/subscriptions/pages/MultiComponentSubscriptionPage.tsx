import { FC, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Spinner } from '@src/react/shared/components/ui/spinner';
import { useAuthCtx } from '@src/react/shared/contexts/auth.context';
import { ERROR_TYPES } from '@src/react/shared/enums';

// Module-level variable to persist subscription attempt state
let hasAttemptedSubscription = false;
/*
  Moin:
  This is a workaround to persist the subscription attempt state between re-mounts.
  For some reason, the page/component is being remounted twice when loaded. Initial investigation didn't show any obvious reasons why this is happening.
  I suspect other pages may also be affected. I'll look into this more but I'm currently short on time so have to push this out.
*/

const MultiComponentSubscriptionPage: FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [isErrorResponse, setIsErrorResponse] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorType, setErrorType] = useState<string>('');

  const {
    userInfo: { user, subs },
  } = useAuthCtx();

  useEffect(() => {
    console.log('user', user);
    console.log('subs', subs);
    if (user?.id && !hasAttemptedSubscription) {
      if (!subs.plan.isCustomPlan) {
        const userSeats = searchParams.get('user seats');
        const tasksUsage = searchParams.get('tasks usage');
        const basePrice = searchParams.get('base price');
        console.log('userSeats', userSeats, 'tasksUsage', tasksUsage, 'basePrice', basePrice);
        if (userSeats && tasksUsage) {
          hasAttemptedSubscription = true;
          subscribeToPaymentPlan(userSeats, tasksUsage, basePrice);
        } else {
          setIsErrorResponse(true);
          setErrorType(ERROR_TYPES.GENERIC);
          setErrorMessage('Missing required price information.');
        }
      } else {
        setIsErrorResponse(true);
        setErrorType(ERROR_TYPES.ALREADY_SUBSCRIBED);
      }
    }
  }, [user, searchParams]);

  const subscribeToPaymentPlan = async (
    userSeats: string,
    tasksUsage: string,
    basePrice?: string,
  ) => {
    const priceIds = [
      { priceId: userSeats, for: 'user seats' },
      { priceId: tasksUsage, for: 'tasks usage' },
    ];
    if (basePrice) {
      priceIds.push({ priceId: basePrice, for: 'base price' });
    }
    try {
      setLoading(true);
      setErrorMessage('');
      setIsErrorResponse(false);
      const res = await fetch('/api/page/plans/subscriptions/v2/checkout/generate-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceIds,
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
      hasAttemptedSubscription = false;
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

export default MultiComponentSubscriptionPage;
