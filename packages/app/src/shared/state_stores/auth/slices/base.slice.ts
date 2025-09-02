import {
  getProperTeamSubs,
  getTeamMembers,
  getTeamRoles,
  getTeamSubs,
  getUserTeamMembers,
} from '@react/features/teams/clients/team-api';
import { PostHog } from '@src/builder-ui/services/posthog';
import { getUserInfo } from '@src/react/features/account/clients';
import { getUserOnboardingInfo } from '@src/react/features/onboarding/clients';
import { getUserSettings } from '@src/react/shared/hooks/useUserSettings';
import { IMembershipTeam } from '@src/react/shared/types/entities';
import { StateCreator } from 'zustand';
import { FEATURE_FLAGS } from '../../../constants/featureflags';
import { userSettingKeys } from '../../../userSettingKeys';
import { ACLUtils } from '../acl.utils';
import { AuthStore } from '../store';
import { AuthInfo, AuthSlice } from '../types';

const fetchTeamData = async (teamId: string): Promise<any> => {
  try {
    const [rolesResult, membersResult] = await Promise.allSettled([
      getTeamRoles(teamId),
      getTeamMembers(teamId),
    ]);

    const roles = rolesResult.status === 'fulfilled' ? rolesResult.value?.roles || [] : [];
    const members = membersResult.status === 'fulfilled' ? membersResult.value?.members || [] : [];

    return {
      roles,
      members,
    };
  } catch (error) {
    console.error(`Error fetching team data for team ${teamId}:`, error);
    return { roles: [], members: [] };
  }
};

export const baseSlice: StateCreator<AuthStore, [], [], AuthSlice> = (set, get) => {
  // Initialize an ACL utils instance with null values (will be updated later)
  let aclUtils = new ACLUtils(null, {}, {});

  return {
    // State initialization
    userInfo: null,
    loading: true,
    error: null,
    userTeams: null,
    currentUserTeam: null,
    currentUserTeamRoles: null,
    currentUserTeamMembers: null,
    parentTeamRoles: null,
    parentTeamMembers: null,

    // User type flags
    isStaffUser: false,
    isStarterUser: false,
    isProUser: false,
    isPremiumUser: false,
    isEnterpriseUser: false,
    isCustomUser: false,

    // Refresh user data
    refreshUserData: async () => {
      try {
        set({ loading: true, error: null });

        const [user, subs, userOnBoarding, teamMembers] = await Promise.all([
          getUserInfo(),
          getTeamSubs(),
          getUserOnboardingInfo(),
          getUserTeamMembers(null),
        ]);

        const state = get();
        const newUserInfo = {
          ...state.userInfo,
          user,
          subs,
          userOnBoarding,
        };

        set({
          userInfo: newUserInfo,
          loading: false,
        });

        // Update the aclUtils instance
        const pageAcl = user?.userTeamRole?.sharedTeamRole?.acl?.['page'];
        const apiAcl = user?.userTeamRole?.sharedTeamRole?.acl?.['api'];

        const authInfo = {
          subs,
          user,
          userOnBoarding,
          teamMembers,
          teamSubs: state.userInfo?.teamSubs || null,
          userTeams: state.userTeams,
          currentUserTeam: state.currentUserTeam,
          currentUserTeamRoles: state.currentUserTeamRoles,
          currentUserTeamMembers: state.currentUserTeamMembers,
          parentTeamRoles: state.parentTeamRoles,
          parentTeamMembers: state.parentTeamMembers,
        };

        aclUtils = new ACLUtils(authInfo, pageAcl, apiAcl);
      } catch (err) {
        set({ error: err as Error, loading: false });
      }
    },
    // ACL utility methods
    isProtectedRoute: (route: string): boolean => {
      return aclUtils.isProtectedRoute(route);
    },
    hasReadOnlyPageAccess: (route: string, useParentTeamRoles: boolean = false): boolean => {
      return aclUtils.hasReadOnlyPageAccess(route, useParentTeamRoles);
    },
    getPageAccess: (route: string, useParentTeamRoles: boolean = false) => {
      return aclUtils.getPageAccess(route, useParentTeamRoles);
    },
    getPageAccessParentTeam: (route: string) => {
      return aclUtils.getPageAccessParentTeam(route);
    },
    hasReadOnlyAPIAccess: (route: string): boolean => {
      return aclUtils.hasReadOnlyAPIAccess(route);
    },

    // Initialize the store
    init: async () => {
      try {
        set({ loading: true, error: null });

        // Fetch all user data
        const [user, subs, userOnBoarding, teamSubs] = await Promise.all([
          getUserInfo(),
          getTeamSubs(),
          getUserOnboardingInfo(),
          getProperTeamSubs(),
        ]);

        // Get user team settings
        const userSettings = await getUserSettings(userSettingKeys.USER_TEAM);

        // Process team data
        const userTeams = user?.roles.map((role) => ({
          ...role.sharedTeamRole.team,
          isRootTeam: role.sharedTeamRole.team.parentId === null,
        })) as IMembershipTeam[];

        const thisTeam =
          userTeams.find((team) => team.id === userSettings?.userSelectedTeam) || null;

        // Fetch team roles and members
        const [thisTeamData, thisTeamParentData] = await Promise.all([
          thisTeam?.id ? fetchTeamData(thisTeam.id) : Promise.resolve({ roles: [], members: [] }),
          thisTeam?.parentId
            ? fetchTeamData(thisTeam.parentId)
            : Promise.resolve({ roles: [], members: [] }),
        ]);

        // Set auth state
        const newState = {
          userInfo: {
            subs,
            user,
            userOnBoarding,
            teamSubs,
          },
          userTeams,
          currentUserTeam: thisTeam,
          currentUserTeamRoles: thisTeamData.roles,
          currentUserTeamMembers: thisTeamData.members,
          parentTeamRoles: thisTeamParentData.roles,
          parentTeamMembers: thisTeamParentData.members,
          isStarterUser: subs.plan.name === 'SmythOS Starter',
          isProUser: subs.plan.name === 'SmythOS PRO',
          isPremiumUser: subs.plan.name === 'Premium',
          isEnterpriseUser: subs.plan.name.includes('Enterprise'),
          isCustomUser:
            subs.plan.paid && subs.plan.isCustomPlan && (subs.plan.stripeId ?? 'no_id') === 'no_id',
          loading: false,
        };

        set(newState);

        // Update the aclUtils instance with new data
        const pageAcl = user?.userTeamRole?.sharedTeamRole?.acl?.['page'];
        const apiAcl = user?.userTeamRole?.sharedTeamRole?.acl?.['api'];

        const authInfo: AuthInfo = {
          subs,
          user,
          userOnBoarding,
          teamMembers: thisTeamData.members,
          teamSubs,
          userTeams,
          currentUserTeam: thisTeam,
          currentUserTeamRoles: thisTeamData.roles,
          currentUserTeamMembers: thisTeamData.members,
          parentTeamRoles: thisTeamParentData.roles,
          parentTeamMembers: thisTeamParentData.members,
        };

        aclUtils = new ACLUtils(authInfo, pageAcl, apiAcl);

        // get feature flag for staff domains
        const staffDomains = PostHog.getFeatureFlag(
          FEATURE_FLAGS.DONT_DELETE_IMPORTANT_SMYTH_STAFF_DOMAINS,
        );
        const isStaffUser =
          Array.isArray(staffDomains) && staffDomains.includes(user.email.split('@')[1]);

        set({ isStaffUser });
      } catch (err) {
        set({ error: err as Error, loading: false });
      }
    },

    updateUserTeam: (teamId: string, teamData: Partial<IMembershipTeam>) => {
      set((state) => {
        if (!state.userTeams) {
          return {}; // No teams to update
        }

        const updatedUserTeams = state.userTeams.map((team) =>
          team.id === teamId ? { ...team, ...teamData } : team,
        );

        // Also update currentUserTeam if it matches the updated team
        const updatedCurrentUserTeam =
          state.currentUserTeam?.id === teamId
            ? { ...state.currentUserTeam, ...teamData }
            : state.currentUserTeam;

        return {
          userTeams: updatedUserTeams,
          currentUserTeam: updatedCurrentUserTeam,
        };
      });
    },
  };
};
