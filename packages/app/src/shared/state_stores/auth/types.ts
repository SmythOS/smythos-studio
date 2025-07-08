import { TeamSubs, TeamSubsV2 } from '../../../react/shared/types/subscription';
import { IMembershipTeam, User, UserOnBoarding } from '../../../react/shared/types/entities';
import { apiResultsTypes } from '../../../react/shared/types';
import { Slice } from '../index';

export interface AuthState {
  // User Info
  userInfo: {
    subs: TeamSubs;
    teamSubs: TeamSubsV2;
    user: User | null;
    userOnBoarding: UserOnBoarding | null;
  } | null;

  // Loading and Error States
  loading: boolean;
  error: Error | null;

  // Team Related States
  userTeams: IMembershipTeam[] | null;
  currentUserTeam: IMembershipTeam | null;
  currentUserTeamRoles: apiResultsTypes.TeamRole[] | null;
  currentUserTeamMembers: apiResultsTypes.TeamMemberWithRole[] | null;
  parentTeamRoles: apiResultsTypes.TeamRole[] | null;
  parentTeamMembers: apiResultsTypes.TeamMemberWithRole[] | null;

  // User Type Flags
  isStaffUser: boolean;
  isStarterUser: boolean;
  isProUser: boolean;
  isPremiumUser: boolean;
  isEnterpriseUser: boolean;
  isCustomUser: boolean;

  // Actions
  init: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  isProtectedRoute: (route: string) => boolean;
  hasReadOnlyPageAccess: (route: string, useParentTeamRoles?: boolean) => boolean;
  getPageAccess: (route: string, useParentTeamRoles?: boolean) => { read: boolean; write: boolean };
  getPageAccessParentTeam: (route: string) => { read: boolean; write: boolean };
  hasReadOnlyAPIAccess: (route: string) => boolean;
  updateUserTeam: (teamId: string, teamData: Partial<IMembershipTeam>) => void;
}

export interface AuthSlice extends AuthState, Slice {}

export type AuthInfo = {
  subs: TeamSubs;
  user: User | null;
  userOnBoarding: UserOnBoarding | null;
  teamMembers: apiResultsTypes.TeamMemberWithRole[] | null;
  teamSubs: TeamSubsV2 | null;
  userTeams: IMembershipTeam[] | null;
  currentUserTeam: IMembershipTeam | null;
  currentUserTeamRoles: apiResultsTypes.TeamRole[] | null;
  currentUserTeamMembers: apiResultsTypes.TeamMemberWithRole[] | null;
  parentTeamRoles: apiResultsTypes.TeamRole[] | null;
  parentTeamMembers: apiResultsTypes.TeamMemberWithRole[] | null;
};
