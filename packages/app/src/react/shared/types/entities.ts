/**
 * Represents a team in the system.
 */
export interface ITeam {
  name: string;
  id: string;
  parentId: string | null;
  referredBy: string | null;
}

/**
 * Represents a team membership.
 */
export type IMembershipTeam = Pick<ITeam, 'id' | 'name' | 'parentId'>;

/**
 * Represents a shared team role.
 */
export interface ISharedTeamRole {
  canManageTeam: boolean;
  acl: object | null;
  name: string;
  id: number;
  team: ITeam;
}
/**
 * Represents a user role within a team.
 */
export interface IUserTeamRole {
  isTeamInitiator: boolean;
  userSpecificAcl: object | null;
  sharedTeamRole: ISharedTeamRole;
}

/**
 * Represents a user in the system.
 */
export interface User {
  id: number;
  email: string;
  createdAt: string;
  name: string | null;
  avatar: string | null;
  roles: IUserTeamRole[];
  userTeamRole: IUserTeamRole;
  team?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface UserOnBoarding {
  jobRoleLabel: string;
  jobRoleValue: string;
  jobtype: string;
  name: string;
  paidUserSince: string;
  churnedAt: string;
}
