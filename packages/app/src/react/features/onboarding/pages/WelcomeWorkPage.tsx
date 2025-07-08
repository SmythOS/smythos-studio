import { PostHog } from '@src/builder-ui/services/posthog';
import { BuildingQuestion } from '@src/react/features/onboarding/components/BuildingQuestion';
import { PageCard } from '@src/react/features/onboarding/components/PageCard';
import { PAID_PLANS } from '@src/react/features/onboarding/constants';
import { useAuthCtx } from '@src/react/shared/contexts/auth.context';
import { FRONTEND_USER_SETTINGS, PRICING_PLANS_V4 } from '@src/react/shared/enums';
import { FEATURE_FLAGS } from '@src/shared/constants/featureflags';
import { useMutation } from '@tanstack/react-query';
import { MouseEvent, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type TeamBuildingWorkType = {
  email: string;
  targetText: string;
};

export const WelcomeWorkPage = () => {
  const {
    userInfo: { subs },
  } = useAuthCtx();
  const navigate = useNavigate();
  const { userInfo } = useAuthCtx();
  const [error, setError] = useState('');

  const handleBackEvent = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      navigate('/welcome/jobtype');
    },
    [navigate],
  );

  const storeTeamBuildingWork = useMutation({
    mutationKey: ['onboard/store-building-data'],
    mutationFn: async (data: TeamBuildingWorkType) => {
      const response = await fetch('/api/page/onboard/store-building-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to store data');
      }
      return response.json();
    },
  });

  const goForward = useCallback(() => {
    const planNameLower = subs?.plan?.name?.toLowerCase() || '';

    const isEnterprisePlan: boolean = PAID_PLANS.includes(planNameLower);
    const isBuilderPlan = planNameLower.indexOf(PRICING_PLANS_V4.BUILDER.toLowerCase()) !== -1;

    if (isEnterprisePlan) {
      navigate('/welcome/book-intro-call');
    } else if (
      isBuilderPlan &&
      PostHog.getFeatureFlag(FEATURE_FLAGS.ONBOARDING_CALLS_FOR_BUILDER_PLAN) == 'variant_1'
    ) {
      navigate('/welcome/book-intro-call');
    } else {
      // const teamSeats = getFeatPlanLimitByKey('teamMembers', userInfo.subs);
      const teamSeats = userInfo.subs?.plan?.properties?.limits?.['teamMembers'] ?? Infinity;
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
        if (redirectPath === '/' || redirectPath?.startsWith('/agents') || !redirectPath) {
          if (whatAreYouBuildingEncoded) {
            location.href = `/builder?chat=${whatAreYouBuildingEncoded}&from=onboarding`;
          } else {
            window.location.href = '/agents';
          }
        } else {
          window.location.href = redirectPath || whatAreYouBuildingEncoded || '/agents';
        }
      }
    }
  }, [navigate]);

  const handleContinueEvent = useCallback(
    async (event: MouseEvent<HTMLButtonElement>, data) => {
      event.preventDefault();
      if (data?.value?.trim()) {
        setError('');
        const dataForStore = data?.value?.trim().slice(0, 255);
        const response = await storeTeamBuildingWork.mutateAsync({
          targetText: dataForStore,
          email: userInfo.user?.email,
        });

        if (!response.success) {
          setError('We could not store the data. Please try again.');
          return;
        }
        sessionStorage.setItem(FRONTEND_USER_SETTINGS.WHAT_ARE_YOU_BUILDING, data?.value?.trim());
        goForward();
      } else {
        setError('Please write something');
      }
    },
    [userInfo.user, storeTeamBuildingWork, goForward],
  );

  return (
    <div className="font-sans text-white w-full h-[100vh] flex gap-10 flex-col md:flex-row items-center justify-center">
      <PageCard
        isBuilding
        progress={80}
        hasSkip={false}
        errorMessage={error}
        closeEvent={() => {}}
        skipEvent={() => {}}
        backEvent={handleBackEvent}
        BodyComponent={BuildingQuestion}
        continueEvent={handleContinueEvent}
        pageCardClasses="w-full"
      />
    </div>
  );
};
