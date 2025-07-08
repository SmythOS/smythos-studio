import { getDefaultRoleAcls } from '../../../backend/utils/default.acls';
import { AuthInfo } from './types';

export class ACLUtils {
  constructor(
    private userInfo: AuthInfo | null,
    private pageAcl: any,
    private apiAcl: any,
  ) {}

  hasReadOnlyPageAccess(route: string, useParentTeamRoles: boolean = false): boolean {
    const baseRoute = route.split('/:')?.[0];
    const userEmail = this.userInfo?.user?.email;
    if (useParentTeamRoles && this.userInfo?.parentTeamMembers?.length) {
      const parentRole = this.userInfo?.parentTeamMembers?.find((m) => m.email === userEmail)
        ?.userTeamRole?.sharedTeamRole;
      return (
        (parentRole?.acl?.[baseRoute]?.access === 'r' || !parentRole?.acl?.[baseRoute]?.access) &&
        parentRole?.name !== 'Super Admin' &&
        !parentRole?.isOwnerRole
      );
    }
    return this.pageAcl?.[baseRoute]?.access === 'r' || this.apiAcl?.[baseRoute]?.access === '';
  }

  getPageAccess(
    route: string,
    useParentTeamRoles: boolean = false,
  ): { read: boolean; write: boolean } {
    const baseRoute = route.split('/:')?.[0];
    if (useParentTeamRoles && this.userInfo?.parentTeamRoles?.length) {
      const userEmail = this.userInfo?.user?.email;
      const parentRole = this.userInfo?.parentTeamRoles?.find(
        (r) =>
          this.userInfo?.parentTeamMembers?.find((m) => m.email === userEmail)?.userTeamRole
            ?.sharedTeamRole?.id === r.id,
      );
      const hasFullAccess = parentRole?.isOwnerRole || parentRole?.name == 'Super Admin';
      return {
        read:
          hasFullAccess ||
          parentRole?.acl?.[baseRoute]?.access === 'r' ||
          parentRole?.acl?.[baseRoute]?.access === 'rw',
        write:
          hasFullAccess ||
          parentRole?.acl?.[baseRoute]?.access === 'rw' ||
          parentRole?.acl?.[baseRoute]?.access === 'rw',
      };
    }
    const userEmail = this.userInfo?.user?.email;
    const userTeamRole = this.userInfo?.teamMembers?.filter(
      (member) => userEmail == member.email,
    )?.[0]?.userTeamRole;
    const hasFullAccess = userTeamRole?.sharedTeamRole?.isOwnerRole;
    return {
      read:
        hasFullAccess ||
        this.pageAcl?.[baseRoute]?.access === 'r' ||
        this.pageAcl?.[baseRoute]?.access === 'rw' ||
        this.apiAcl?.[baseRoute]?.access === '' ||
        this.userInfo?.user?.userTeamRole?.isTeamInitiator,
      write:
        hasFullAccess ||
        this.pageAcl?.[baseRoute]?.access === 'rw' ||
        this.userInfo?.user?.userTeamRole?.isTeamInitiator,
    };
  }

  isProtectedRoute(route: string): boolean {
    const baseRoute = route.split('/:')?.[0];
    if (baseRoute === '/onboard') return false; // quick fix for onboard page

    const routeACL = this.pageAcl?.[baseRoute];
    if (routeACL?.access === '' && routeACL?.internal) return false; // quick fix for chat page
    return routeACL?.access === '';
  }

  getPageAccessParentTeam(route: string): { read: boolean; write: boolean } {
    if (!this.userInfo?.parentTeamRoles || !this.userInfo?.parentTeamMembers)
      return { read: false, write: false };
    const baseRoute = route.split('/:')?.[0];
    const userEmail = this.userInfo?.user?.email;
    const parentRole = this.userInfo?.parentTeamRoles?.find(
      (r) =>
        r.id ===
        this.userInfo?.parentTeamMembers?.find((m) => m.email === userEmail)?.userTeamRole
          ?.sharedTeamRole?.id,
    );

    const hasFullAccess = parentRole?.isOwnerRole;
    if (parentRole?.acl?.default_role) {
      const defaultAcls = getDefaultRoleAcls(parentRole?.acl?.default_role);
      parentRole.acl = {
        ...parentRole?.acl,
        ...defaultAcls,
      };
    }
    return {
      read:
        hasFullAccess ||
        parentRole?.acl?.[baseRoute]?.access === 'r' ||
        parentRole?.acl?.[baseRoute]?.access === 'rw',
      write:
        hasFullAccess ||
        parentRole?.acl?.[baseRoute]?.access === 'rw' ||
        parentRole?.acl?.[baseRoute]?.access === 'rw',
    };
  }

  hasReadOnlyAPIAccess = (route: string): boolean => {
    const baseRoute = route.split('/:')?.[0];
    return this.apiAcl?.[baseRoute]?.access === 'r';
  };
}
