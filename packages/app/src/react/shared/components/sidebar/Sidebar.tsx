// src/components/sidebar/Sidebar.tsx
import { useGetTeamSettings } from '@react/features/teams/hooks/useTeamSettings';
import { FEATURE_FLAGS } from '@shared/constants/featureflags';
import { teamSettingKeys } from '@shared/teamSettingKeys';
import { userSettingKeys } from '@shared/userSettingKeys';
import ErrorFallback from '@src/react/features/error-pages/components/ErrorFallback';
import { ErrorBoundarySuspense } from '@src/react/features/error-pages/higher-order-components/ErrorBoundary';
import {
  bottomLinks,
  sidebarMenuItems,
  sidebarMenuItemsWithTeams,
} from '@src/react/shared/constants/navigation';
import { useAuthCtx } from '@src/react/shared/contexts/auth.context';
import { useScreenSize } from '@src/react/shared/hooks/useScreenSize';
import { useGetUserSettings } from '@src/react/shared/hooks/useUserSettings';
import classNames from 'classnames';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useFeatureVisibility } from '../featureFlags';
import { CollapseIcon } from '../svgs';
import { BottomMenuItem } from './BottomMenuItem';
import { SidebarMenuItem } from './SidebarMenuItem';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState('');
  const collapseButtonRef = useRef<HTMLDivElement>(null);
  const [collapseTooltipStyle, setCollapseTooltipStyle] = useState({});
  const [borderTooltipStyle, setBorderTooltipStyle] = useState({
    top: '50%',
    left: '100%',
    transform: 'translate(8px, -50%)',
  });

  const { isCollapsed, toggleSidebar } = useScreenSize();
  const { isStaffUser, userTeams, getPageAccess } = useAuthCtx();
  const isTeamsUIEnabled = useFeatureVisibility(FEATURE_FLAGS.TEAMS_UI);
  const { data: userSettings, isLoading: isUserSettingsLoading } = useGetUserSettings(
    userSettingKeys.USER_TEAM,
  );
  const access = {};
  access['/vault'] = getPageAccess('/vault')?.read;
  access['/agents'] = getPageAccess('/agents')?.read;
  access['/templates'] = getPageAccess('/templates')?.read;
  access['/domains'] = getPageAccess('/domains')?.read;
  access['/data/'] = getPageAccess('/data')?.read;
  access['/analytics'] = getPageAccess('/analytics')?.read;
  access['/teams/settings'] = isTeamsUIEnabled && getPageAccess('/teams/members')?.read;

  const currentTeam = userTeams?.find((team) => team.id === userSettings?.userSelectedTeam);
  const { data: companyLogo } = useGetTeamSettings(teamSettingKeys.COMPANY_LOGO);
  const showCustomLogo =
    currentTeam?.parentId && companyLogo?.url && getPageAccess('/teams/members')?.read;

  // const isTeamsUIEnabled = false;
  // featureFlagPayload === FEATURE_FLAG_PAYLOAD_RELEASE_TYPE.PUBLIC || isStaffUser;
  let menuItems = sidebarMenuItemsWithTeams.filter((item) => access[item.url]);
  // let menuItems = isTeamsUIEnabled ? sidebarMenuItemsWithTeams : sidebarMenuItems;
  if (isTeamsUIEnabled && currentTeam) {
    if (!currentTeam.parentId) {
      // Create a new array based on sidebarMenuItems priority
      menuItems = sidebarMenuItems.reduce(
        (acc, item) => {
          // Skip '/teams/settings'
          if (item.url === '/teams/settings') {
            return acc;
          }

          // Include all other items
          if (menuItems.some((menuItem) => menuItem.url === item.url)) {
            acc.push(item);
          }

          return acc;
        },
        [] as typeof sidebarMenuItems,
      );
    }
  }

  useEffect(() => {
    const currentPage = menuItems.find((page) => page.url === location.pathname);
    setActivePage(currentPage?.name || '');
  }, [location, menuItems]);

  const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (location.pathname !== '/agents') {
      navigate('/agents');
      return;
    }
    toggleSidebar();
  };

  const updateCollapseTooltipPosition = () => {
    if (collapseButtonRef.current) {
      const rect = collapseButtonRef.current.getBoundingClientRect();
      setCollapseTooltipStyle({
        top: `${rect.top + rect.height / 2}px`,
        left: 'calc(4rem + 5px)', // Added this line to match other tooltips
        transform: 'translateY(-50%)',
      });
    }
  };

  const handleBorderMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    setBorderTooltipStyle({
      top: `${e.clientY}px`,
      left: '15px',
      transform: 'translate(0, -50%)',
    });
  };

  return (
    <div className="relative">
      <div
        data-qa="navigation-sidebar"
        className={classNames(
          'z-50 left-0 min-w-[4rem] max-h-screen flex flex-col transition-all duration-300 sticky top-0 h-[100dvh] md:h-screen max-md:absolute',
          isCollapsed ? 'w-16' : 'w-64',
        )}
      >
        <img src="/img/smythos-text.svg" alt="SmythOS" className="w-0 h-0 pointer-events-none" />
        <div
          className={classNames('flex items-center h-16 p-5', {
            'items-center': !showCustomLogo,
          })}
        >
          <Link to="/agents" onClick={handleLogoClick}>
            <div
              id="sidebar-logo-container"
              className={classNames('flex', {
                'w-6': isCollapsed,
                'w-28': !isCollapsed && !showCustomLogo,
                'items-center': !showCustomLogo,
              })}
            >
              {showCustomLogo ? (
                <>
                  <img
                    src={companyLogo.url}
                    className={classNames('h-6 object-contain', {
                      'w-6': isCollapsed,
                      'w-28': !isCollapsed && !showCustomLogo,
                    })}
                    alt="Company Logo"
                  />
                </>
              ) : (
                <>
                  <img
                    src="/img/smythos-logo.png"
                    className={classNames('h-6', {
                      'w-6': isCollapsed,
                      'w-28': !isCollapsed,
                    })}
                    alt="SmythOS"
                  />
                  <img
                    src="/img/smythos-text.svg"
                    alt="SmythOS"
                    className={classNames(
                      'ml-3 h-6 w-auto transition-all duration-300',
                      isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto',
                    )}
                  />
                </>
              )}
            </div>
          </Link>
        </div>
        <nav className="flex-grow relative overflow-y-auto">
          <div
            className={classNames('h-full', {
              'overflow-x-hidden': !isCollapsed,
              'flex flex-col items-center pt-0': isCollapsed,
            })}
          >
            {menuItems.map((page: any) => (
              <SidebarMenuItem
                key={page.url}
                path={page.url}
                icon={page.icon}
                title={page.name}
                hardReload={page.hardReload}
                isCollapsed={isCollapsed}
                isActive={activePage === page.name}
              />
            ))}
            {/* <PluginComponents targetId={PluginTarget.TopMenuItem} /> */}
          </div>
        </nav>
        <div className="mt-auto border-t border-gray-100 overflow-hidden">
          {bottomLinks.map((link) => (
            <BottomMenuItem
              key={link.path}
              path={link.path}
              icon={link.icon}
              title={link.title}
              isCollapsed={isCollapsed}
              isExternal={link.isExternal}
            />
          ))}
        </div>
        <div
          className="bottom-menu-item"
          ref={collapseButtonRef}
          onMouseEnter={updateCollapseTooltipPosition}
        >
          <button
            onClick={toggleSidebar}
            className={classNames(
              'flex items-center h-10 px-[21px] text-gray-600 justify-start w-full',
            )}
          >
            <CollapseIcon
              className={classNames('w-5 h-5 transition-all duration-300')}
              style={{ transform: isCollapsed ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
            />
          </button>
          {isCollapsed && (
            <div className="sidebar-tooltip" style={collapseTooltipStyle}>
              {isCollapsed ? 'Expand' : 'Collapse'}
            </div>
          )}
        </div>
      </div>

      <div
        className={classNames(
          'absolute top-0 -right-1 w-1 h-full cursor-pointer transition-colors duration-200 z-[11] hover:bg-gray-200 group',
        )}
        onClick={toggleSidebar}
        onMouseMove={handleBorderMouseMove}
      >
        <div
          className={classNames(
            'absolute bg-black text-white py-2 px-3 whitespace-nowrap pointer-events-none z-[52] rounded-lg text-sm text-center opacity-0 transition-opacity duration-300 group-hover:opacity-100',
          )}
          style={borderTooltipStyle}
        >
          <span className="font-bold">{isCollapsed ? 'Expand' : 'Collapse'}</span>
          <span className="text-gray-300"> Click</span>
        </div>
      </div>
    </div>
  );
};

export function SidebarWithErrorBoundary() {
  return (
    <ErrorBoundarySuspense
      errorFallback={(resetError) => (
        <div className="p-8 flex items-center justify-center">
          <ErrorFallback retry={resetError} />
        </div>
      )}
      loadingFallback={<div className="p-8 flex items-center justify-center"></div>}
    >
      <Sidebar />
    </ErrorBoundarySuspense>
  );
}
