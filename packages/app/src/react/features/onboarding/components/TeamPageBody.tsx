import { TeamTag } from '@src/react/features/onboarding/components/TeamTag';
import { UserTeamCard } from '@src/react/features/onboarding/components/UserCard';
import {
  ISingleTeam,
  UserOnboardingTeams,
} from '@src/react/features/onboarding/data/onboarding-mappings';
import { Input as CustomInput } from '@src/react/shared/components/ui/input';
import { Spinner } from '@src/react/shared/components/ui/spinner';
import { useAuthCtx } from '@src/react/shared/contexts/auth.context';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

export interface ITeamPageData {
  firstname: string;
  lastname: string;
  team: ISingleTeam | null;
}

export const TeamPageBody = ({ setData, setIsContinueDisabled }) => {
  const { userInfo } = useAuthCtx();
  const [currentTeam, setCurrentTeam] = useState<ISingleTeam | null>(null);
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');

  const queryData = useQuery({
    queryKey: ['onboard/get-data'],
    queryFn: async () => {
      const response = await fetch('/api/page/onboard/get-data');
      return response.json();
    },
    refetchOnMount: true,
    refetchInterval: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  /**
   * Set the name and team from the query data
   * when the query data changes
   * @param queryData
   */
  useEffect(() => {
    const _currentTeam = UserOnboardingTeams.find(
      (team) => team.value === queryData.data?.jobRoleValue,
    );
    setCurrentTeam(_currentTeam || null);

    // Restore first name and last name from server data
    setFirstname(queryData.data?.firstname || '');
    setLastname(queryData.data?.lastname || '');
  }, [queryData.data]);

  const handleTeamSelection = useCallback((team: ISingleTeam) => {
    setCurrentTeam((prevTeam) => (prevTeam?.value === team.value ? null : team));
  }, []);

  useEffect(() => {
    setData((oldVal: ITeamPageData) => ({
      ...oldVal,
      firstname: firstname,
      lastname: lastname,
      team: currentTeam,
    }));
    setIsContinueDisabled(!currentTeam?.value || !firstname.trim() || !lastname.trim());
  }, [currentTeam, firstname, lastname]);

  const renderHeading = (classes: string) => {
    return (
      <div className={classes}>
        <h1 className="text-xl">Let's Personalize Your Experience</h1>
        <p className="text-sm">
          Tell us a bit about yourself so we can tailor SmythOS to your needs.
        </p>
      </div>
    );
  };
  return (
    <div className="w-full bg-white flex justify-center items-stretch rounded-md flex-col-reverse md:flex-row relative">
      {queryData.isFetching && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10 w-full h-full">
          <Spinner />
        </div>
      )}
      {renderHeading('order-3 md:hidden space-y-2')}
      <div className="w-full md:w-1/2 order-1 md:order-1 pr-2 pl-4">
        {renderHeading('hidden md:block space-y-2')}
        <div className="mt-4 flex gap-4">
          <CustomInput
            fullWidth
            value={firstname}
            label="First Name"
            placeholder="John"
            onChange={(e) => {
              setFirstname(e.target.value);
            }}
          />
          <CustomInput
            fullWidth
            value={lastname}
            label="Last Name"
            placeholder="Smyth"
            onChange={(e) => {
              setLastname(e.target.value);
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {UserOnboardingTeams.map((team) => (
            <TeamTag
              key={team.name}
              team={team}
              selectedTeam={currentTeam}
              onTeamSelect={handleTeamSelection}
            />
          ))}
        </div>
      </div>
      <div className="w-full md:w-1/2 order-2 md:order-2">
        <div className="rounded-md bg-white md:bg-gray-50 h-full flex flex-col justify-center p-0 md:p-4 my-4">
          <UserTeamCard
            username={`${firstname} ${lastname}`.trim()}
            selectedTeam={currentTeam}
            email={userInfo.user.email}
            avatar={userInfo.user.avatar}
          />
        </div>
      </div>
    </div>
  );
};
