import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { useGetUserSettings, useStoreUserSettings } from '@react/shared/hooks/useUserSettings';
import { ITeam } from '@react/shared/types/entities';
import { userSettingKeys } from '@src/shared/userSettingKeys';
import { useEffect, useState } from 'react';
import { TeamSwitchList } from './TeamSwitchList';


export function TeamSwitch() {
  const { userInfo, userTeams, hasReadOnlyPageAccess } = useAuthCtx();
  const [canManageCurrentTeam, setCanManageCurrentTeam] = useState(false);
  const [teamSwitching, setTeamSwitching] = useState(false);
  const { data: userSettings, isLoading: isUserSettingsLoading } = useGetUserSettings(
    userSettingKeys.USER_TEAM,
  );
  const storeUserSettings = useStoreUserSettings(userSettingKeys.USER_TEAM);

  const isReadOnlyAccess = hasReadOnlyPageAccess('/page');
  useEffect(() => {
    const teamRole = userInfo?.user?.roles?.filter(
      (role: any) => role.sharedTeamRole?.team?.id === userSettings?.userSelectedTeam,
    )?.[0];
    setCanManageCurrentTeam(
      !isReadOnlyAccess && (teamRole?.sharedTeamRole?.canManageTeam || false),
    );
  }, [userInfo, isReadOnlyAccess]);
  // Remove console.log for production code
  // console.log('SPACE', isUserSettingsLoading, userTeams, userSettings, userInfo);

  /**
   * Handles team change and reloads the page
   * @param {Team} team - The selected team
   */
  const handleTeamChange = async (team: ITeam): Promise<void> => {
    try {
      setTeamSwitching(true);
      await storeUserSettings.mutateAsync(team.id);
      window.location.href = '/';
    } catch (error) {
      setTeamSwitching(false);
      console.error('Failed to change team:', error);
      // TODO: Implement proper error handling
    }
  };

  const isLoading = isUserSettingsLoading || storeUserSettings.isLoading || teamSwitching;

  return (
    <div>
      {userTeams && userTeams.length > 0 && (
        <TeamSwitchList
          teamList={userTeams}
          selectedTeam={userSettings?.userSelectedTeam}
          onTeamChange={handleTeamChange}
          canManageCurrentTeam={canManageCurrentTeam}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
