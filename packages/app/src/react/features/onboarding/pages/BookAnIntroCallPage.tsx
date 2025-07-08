import { BookAnIntroCall } from '@src/react/features/onboarding/components/BookAnIntroCall';
import { PageCard } from '@src/react/features/onboarding/components/PageCard';
import { useGetBookAnIntroCall } from '@src/react/features/onboarding/hooks/useGetUserOnboardingSettings';
import { useMutateBookAnIntroCall } from '@src/react/features/onboarding/hooks/useMutateOnboardingData';
import { useAuthCtx } from '@src/react/shared/contexts/auth.context';
import { FRONTEND_USER_SETTINGS } from '@src/react/shared/enums';
import { sanitizeRedirectPath } from '@src/shared/utils';
import { MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

type IntroCallSettings = {
  email: string;
  isBooked: boolean;
  planName: string;
};

export const BookAnIntroCallPage = ({ hasBack = false }: { hasBack?: boolean }) => {
  const user = useAuthCtx();
  const navigate = useNavigate();
  const { userInfo, loading } = user;
  const [error, setError] = useState('');
  const hasStoredInitialState = useRef(false);

  // Single mutation with conditional redirect based on initialization context
  const { mutate: mutateBookAnIntroCall } = useMutateBookAnIntroCall({
    onError: () => {
      setError('We could not store the data. Please try again.');
    },
    onSuccess: () => {
      // Remove automatic redirect - goForward should only happen on user action
      // The initialization call should not trigger navigation
    },
  });

  const { data: currentSettings, refetch } = useGetBookAnIntroCall({
    options: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnFocus: false,
      refetchOnReconnect: false,
    },
  });

  const [searchParams] = useSearchParams();
  // Get the redirect path without any additional parameters
  const redirectPath = searchParams.get('redirectFromIntroCall') || '';

  // Collect all other query parameters to be added to the redirect URL
  const otherParams = Array.from(searchParams.entries())
    .filter(([key]) => key !== 'redirectFromIntroCall')
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});

  // Build the final redirect URL with all parameters
  let urlRedirect = redirectPath;
  if (Object.keys(otherParams).length > 0) {
    const queryString = new URLSearchParams(otherParams).toString();
    urlRedirect = `${redirectPath}${redirectPath.includes('?') ? '&' : '?'}${queryString}`;
  }

  const handleBackEvent = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      navigate('/welcome/work');
    },
    [navigate],
  );

  useEffect(() => {
    if (urlRedirect) {
      sessionStorage.setItem(
        FRONTEND_USER_SETTINGS.REDIRECT_PATH_KEY_WELCOME_PAGE,
        sanitizeRedirectPath(urlRedirect),
      );
      // Only set to hide the back button if we don't want to allow navigation back
      // from the target destination
      const shouldHideBackButton =
        urlRedirect.includes('/builder') || urlRedirect.includes('/agents');
      if (shouldHideBackButton) {
        sessionStorage.setItem(FRONTEND_USER_SETTINGS.HIDE_BACK_BUTTON_WELCOME_PAGE, 'true');
      } else {
        // Remove the item if it exists and we don't need to hide the back button
        sessionStorage.removeItem(FRONTEND_USER_SETTINGS.HIDE_BACK_BUTTON_WELCOME_PAGE);
      }
    }
  }, [urlRedirect]);

  useEffect(() => {
    const storeInitialState = async () => {
      if (hasStoredInitialState.current) return;

      try {
        const newSettings = {
          isBooked: false,
          email: userInfo.user?.email ?? '',
          planName: userInfo.teamSubs?.subscription?.plan?.name ?? '',
        };

        // Handle different scenarios for storing initial state
        if (!currentSettings) {
          // No existing settings - store initial state
          await mutateBookAnIntroCall(newSettings);
          hasStoredInitialState.current = true;
        } else if (currentSettings?.planName !== newSettings?.planName) {
          // Settings exist but plan name changed - update
          await mutateBookAnIntroCall(newSettings);
          hasStoredInitialState.current = true;
        } else {
          // Settings exist and plan name matches - no need to store
          hasStoredInitialState.current = true;
        }
      } catch (err) {
        console.error('Failed to store initial intro call state:', err);
        // Even if there's an error, mark as stored to prevent infinite retries
        hasStoredInitialState.current = true;
      }
    };

    if (!loading && userInfo.user?.email) {
      storeInitialState();
    }
  }, [
    loading,
    userInfo.user?.email,
    userInfo.teamSubs?.subscription?.plan?.name,
    currentSettings,
    mutateBookAnIntroCall,
  ]);

  const goForward = useCallback(() => {
    // const teamSeats = getFeatPlanLimitByKey('teamMembers', userInfo?.teamSubs?.subscription);
    const teamSeats =
      userInfo?.teamSubs?.subscription?.plan?.properties?.limits?.['teamMembers'] ?? Infinity;
    if (teamSeats > 1 && userInfo.user?.userTeamRole?.isTeamInitiator) {
      navigate('/welcome/invite');
    } else {
      const redirectPath = sessionStorage.getItem(
        FRONTEND_USER_SETTINGS.REDIRECT_PATH_KEY_WELCOME_PAGE,
      );
      const whatAreYouBuilding = sessionStorage.getItem(
        FRONTEND_USER_SETTINGS.WHAT_ARE_YOU_BUILDING,
      );
      sessionStorage.removeItem(FRONTEND_USER_SETTINGS.REDIRECT_PATH_KEY_WELCOME_PAGE);
      sessionStorage.removeItem(FRONTEND_USER_SETTINGS.WHAT_ARE_YOU_BUILDING);
      let whatAreYouBuildingEncoded = whatAreYouBuilding?.trim?.()
        ? encodeURIComponent(whatAreYouBuilding)
        : '';
      // get redirect path from url
      const urlParams = new URLSearchParams(window.location.search);
      const redirectFromIntroCall = urlParams.get('redirectFromIntroCall');
      let urlRedirect = redirectFromIntroCall || '';
      if (redirectPath === '/' || redirectPath?.startsWith('/agents') || !redirectPath) {
        if (whatAreYouBuildingEncoded) {
          location.href = `/builder?chat=${whatAreYouBuildingEncoded}&from=onboarding`;
        } else {
          window.location.href = urlRedirect || '/agents';
        }
      } else {
        window.location.href =
          redirectPath || whatAreYouBuildingEncoded || urlRedirect || '/agents';
      }
    }
  }, [navigate, userInfo]);

  const handleContinueEvent = useCallback(
    async (event: MouseEvent<HTMLButtonElement>, isBooked: boolean) => {
      event.preventDefault();
      await mutateBookAnIntroCall({
        isBooked,
        email: userInfo.user?.email,
        planName: userInfo.teamSubs?.subscription?.plan?.name,
      });
      await refetch(); // Force a fresh API call after mutation
      isBooked && window.open('https://smythos.com/smythos-onboarding-call/', '_blank');
      // Explicitly call goForward after successful mutation for user actions
      goForward();
    },
    [userInfo.user, mutateBookAnIntroCall, refetch, goForward],
  );

  return (
    <div className="font-sans text-white w-full h-[100vh] flex gap-10 flex-col md:flex-row items-center justify-center">
      <PageCard
        progress={85}
        hasSkip={true}
        canGoBack={hasBack}
        errorMessage={error}
        closeEvent={() => {}}
        skipEvent={(event) => {
          handleContinueEvent(event, false);
        }}
        backEvent={handleBackEvent}
        BodyComponent={BookAnIntroCall}
        continueEvent={async (event) => {
          await handleContinueEvent(event, true);
        }}
        pageCardClasses="w-full"
        continueText="Schedule Call"
        skipText="Skip for now"
        actionButtonHalfWidth={true}
      />
    </div>
  );
};
