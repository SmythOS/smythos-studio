import { IUserBuildingType, IUserTeamData } from '@src/backend/types/user-data';
import { PageCard } from '@src/react/features/onboarding/components/PageCard';
import { ITeamPageData, TeamPageBody } from '@src/react/features/onboarding/components/TeamPageBody';
import { useAuthCtx } from '@src/react/shared/contexts/auth.context';
import { FRONTEND_USER_SETTINGS } from '@src/react/shared/enums';
import { HubSpot } from '@src/shared/services/hubspot';
import { useMutation } from '@tanstack/react-query';
import { MouseEvent, useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

type TeamBuildingWorkType = {
  email: string;
  targetText: string;
};

export const WelcomeTeamPage = () => {
  const { userInfo } = useAuthCtx();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const isChatParamPresent = searchParams.has('chat');
  const [teamBuildingData, setTeamBuildingData] = useState<IUserBuildingType | null>(null);
  const storeTeamType = useMutation({
    mutationKey: ['onboard/store-team-type'],
    mutationFn: async (data: IUserTeamData & { email: string }) => {
      const response = await fetch('/api/page/onboard/store-team-type', {
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
  const getTeamBuildingData = useMutation({
    mutationKey: ['onboard/get-building-data'],
    mutationFn: async () => {
      const response = await fetch('/api/page/onboard/get-building-data', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get data');
      }
      return response.json();
    },
  });

  useEffect(() => {
    async function getBuildingData() {
      const data = await getTeamBuildingData.mutateAsync();
      setTeamBuildingData(data);
    }
    getBuildingData();
  }, []);

  const handleContinueEvent = useCallback(
    async (event: MouseEvent<HTMLButtonElement>, data: ITeamPageData) => {
      event.preventDefault();

      if (!data?.team?.value?.trim()) {
        setError('Please select a team first.');
        return;
      }

      setError('');
      HubSpot.identifyUser(userInfo.user?.email, {
        firstname: data.firstname,
        lastname: data.lastname,
      });
      const response = await storeTeamType.mutateAsync({
        name: `${data.firstname} ${data.lastname}`,
        firstname: data.firstname,
        lastname: data.lastname,
        email: userInfo.user?.email,
        jobtype: data.team?.category,
        jobRoleLabel: data.team?.name,
        jobRoleValue: data.team?.value,
      });

      if (!response.success) {
        setError('Something went wrong while saving data. Please try again.');
        return;
      }

      const redirectUrl = sessionStorage.getItem(
        FRONTEND_USER_SETTINGS.REDIRECT_PATH_KEY_WELCOME_PAGE,
      );
      let chatAfterRedirect = null;

      if (redirectUrl && decodeURIComponent(redirectUrl)?.indexOf('chat=') > -1) {
        chatAfterRedirect = decodeURIComponent(redirectUrl)?.split?.('chat=')?.[1];
        sessionStorage.removeItem(FRONTEND_USER_SETTINGS.REDIRECT_PATH_KEY_WELCOME_PAGE);
      }

      if (isChatParamPresent || chatAfterRedirect) {
        // if (isChatParamPresent) {
        //   Analytics.track('weaver_signup', {
        //     source: searchParams.get('from'),
        //     page_url: '/welcome/jobtype',
        //   });
        // }

        const response = await storeTeamBuildingWork.mutateAsync({
          targetText: isChatParamPresent ? searchParams.get('chat') : chatAfterRedirect,
          email: userInfo.user?.email,
        });

        if (!response.success) {
          setError('Something went wrong while saving data. Please try again.');
          return;
        }

        // const teamSeats = getFeatPlanLimitByKey('teamMembers', userInfo.subs);
        const teamSeats = userInfo.subs?.plan?.properties?.limits?.['teamMembers'] ?? Infinity;
        if (teamSeats > 1 && userInfo.user?.userTeamRole?.isTeamInitiator) {
          navigate('/welcome/invite');
        } else {
          window.location.href = `/builder?chat=${
            isChatParamPresent ? searchParams.get('chat') : chatAfterRedirect
          }`;
        }
        return;
      } else {
        // Analytics.track('simple_signup', {
        //   page_url: '/welcome/jobtype',
        //   ...(searchParams.get('source') === 'marketingSite' && searchParams.get('from')
        //     ? {
        //         source: searchParams.get('from'),
        //       }
        //     : {}),
        // });
      }
      if (teamBuildingData?.targetText) {
        // const teamSeats = getFeatPlanLimitByKey('teamMembers', userInfo.subs);
        const teamSeats = userInfo.subs?.plan?.properties?.limits?.['teamMembers'] ?? Infinity;
        if (teamSeats > 1 && userInfo.user?.userTeamRole?.isTeamInitiator) {
          navigate('/welcome/invite');
        } else {
          const redirectPath = sessionStorage.getItem(
            FRONTEND_USER_SETTINGS.REDIRECT_PATH_KEY_WELCOME_PAGE,
          );
          sessionStorage.removeItem(FRONTEND_USER_SETTINGS.REDIRECT_PATH_KEY_WELCOME_PAGE);
          window.location.href = redirectPath || '/agents';
        }
      } else {
        navigate('/welcome/work');
      }
    },
    [storeTeamType, navigate, userInfo.user],
  );

  return (
    <div className="font-sans text-white w-full h-[100vh] flex gap-10 flex-col md:flex-row items-center justify-center">
      <PageCard
        size="lg"
        progress={30}
        hasSkip={false}
        hasClose={false}
        canGoBack={false}
        backEvent={() => {}}
        skipEvent={() => {}}
        closeEvent={() => {}}
        errorMessage={error}
        BodyComponent={TeamPageBody}
        continueEvent={handleContinueEvent}
        extraProps={{ hideProgress: teamBuildingData?.targetText ? true : false }}
      />
    </div>
  );
};
