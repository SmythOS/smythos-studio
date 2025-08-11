import { profileDropdownItems } from '@react/shared/constants/navigation';
import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { useGetUserSettings } from '@react/shared/hooks/useUserSettings';
import { IMembershipTeam } from '@react/shared/types/entities';
import { PAGE_TITLE_MAP } from '@shared/constants/general';
import { userSettingKeys } from '@shared/userSettingKeys';
import { PluginComponents } from '@src/react/shared/plugins/PluginComponents';
import { PluginTarget } from '@src/react/shared/plugins/Plugins';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserAvatar } from './UserAvatar';

export const TopbarPrimary = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { userInfo, userTeams, getPageAccess } = useAuthCtx();
  const [profilePages, setProfilePages] = useState(
    profileDropdownItems.filter((p) => {
      return (
        p.url !== '/teams/settings' && p.url !== '/teams/members' && getPageAccess(p.url)?.read
      );
    }),
  );
  const { data: userSettings } = useGetUserSettings(userSettingKeys.USER_TEAM);
  const currTeam = useMemo(() => {
    return userSettings
      ? userTeams?.find?.((team: IMembershipTeam) => team.id === userSettings.userSelectedTeam)
      : null;
  }, [userSettings, userTeams]);

  const location = useLocation();
  const navigate = useNavigate();

  // Function to get title based on current path
  const getPageTitle = () => {
    if (isLoading) return '';

    // Find the matching path prefix
    const matchingPath = Object.keys(PAGE_TITLE_MAP).find((path) =>
      location.pathname.startsWith(path),
    );

    if (!matchingPath) return '';

    // Special case for agents path - customize with team name
    if (matchingPath === '/agents') {
      return `${currTeam?.name ? `${currTeam?.name}'s` : 'Your'} ${PAGE_TITLE_MAP[matchingPath]}`;
    }

    if (matchingPath === '/teams/roles') {
      return (
        <div className="flex items-center gap-2 justify-center">
          <button onClick={() => navigate('/teams/members')} className="cursor-pointer">
            <ArrowLeft className="h-5 w-5" />
          </button>
          Team Roles
        </div>
      );
    }

    return PAGE_TITLE_MAP[matchingPath];
  };

  useEffect(() => {
    if (userTeams?.length && userSettings?.userSelectedTeam) {
      const currTeam = userTeams?.filter?.((t) => t.id === userSettings?.userSelectedTeam)?.[0];
      if (!currTeam?.parentId) {
        setProfilePages(
          profileDropdownItems.filter(
            (p) => p.url !== '/teams/settings' && getPageAccess(p.url)?.read,
          ),
        );
      } else {
        setProfilePages(
          profileDropdownItems.filter((p) => {
            return (
              p.url !== '/teams/members' &&
              p.url !== '/teams/settings' &&
              p.url !== '/teams/roles' &&
              getPageAccess(p.url)?.read
            );
            // }
          }),
        );
      }
    }
  }, [userSettings, userTeams]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (userInfo?.user) setIsLoading(false);
  }, [userInfo?.user]);

  return (
    <nav
      id="primary-topbar"
      className="flex items-center justify-between mx-auto pl-16 pr-8 md:pl-8 flex-col md:flex-row h-[6rem] md:h-[5.5rem] w-full"
    >
      <div className="max-w-[240px] sm:max-w-[463px] font-inter text-xl leading-[48px] text-[#242424] truncate ">
        {getPageTitle()}
      </div>

      <div className="flex items-center gap-4 pb-1 md:pb-0">
        {/* <TeamSwitch /> */}
        <PluginComponents targetId={PluginTarget.TopMenuItem} />
        <UserAvatar user={userInfo?.user} profilePages={profilePages} />
      </div>
    </nav>
  );
};
