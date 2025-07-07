import { TeamRole } from '@prisma/client';

// These roles are added on top of the Super Admin role.
export const DEFAULT_ROLES: Record<string, Partial<TeamRole>> = {
  View: {
    name: 'View',
    canManageTeam: false,
    acl: {
      default_role: 'view',
    },
  },
  Edit: {
    name: 'Edit',
    canManageTeam: false,
    acl: {
      default_role: 'edit',
    },
  },
  Admin: {
    name: 'Admin',
    canManageTeam: true,
    acl: {
      default_role: 'admin',
    },
  },
};

export const DEFAULT_ROLE_POSTFIX = '(built-in role)';
