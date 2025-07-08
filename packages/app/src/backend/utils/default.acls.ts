import { cloneDeep } from 'lodash-es';
import { DefaultRole } from '../../shared/constants/acl.constant';
import { CombinedAclRules } from '../../shared/constants/acl.constant';
import templateAcls from '../../shared/constants/acl.constant.json';

export const isDefaultRole = (acl: CombinedAclRules | null): boolean => {
  return acl?.default_role !== undefined && Object.values(DefaultRole).includes(acl?.default_role);
};

/**
 * Possible Values for /page route (used AI to generate these values)
 * /page/teams
 * /page/user
 * /page/vectors
 * /page/logs
 * /page/builder
 * /page/chat
 * /page/plans
 * /page/agent-settings
 * /page/onboard
 */

/**
 * @description Get the default ACL rules for a given role.
 * @param {string} role - The role name.
 * @returns {CombinedAclRules} - The ACL rules for the specified role.
 * @throws {Error} - Throws an error if the role is not recognized.
 */

export const getDefaultRoleAcls = (
  role: (typeof DefaultRole)[keyof typeof DefaultRole],
): CombinedAclRules => {
  const acls = cloneDeep(templateAcls);

  const roleConfigs: Record<DefaultRole, Array<{ path: string; access: 'r' | 'rw' }>> = {
    [DefaultRole.View]: [
      { path: '/agents', access: 'r' },
      { path: '/agent-settings', access: 'r' },
      { path: '/builder', access: 'r' },
      { path: '/templates', access: 'r' },
      { path: '/teams', access: 'r' },
      { path: '/teams/roles', access: 'r' },
      { path: '/teams/members', access: 'r' },
    ],
    [DefaultRole.Edit]: [
      { path: '/agents', access: 'rw' },
      { path: '/agent-settings', access: 'rw' },
      { path: '/builder', access: 'rw' },
      { path: '/templates', access: 'rw' },
      { path: '/domains', access: 'rw' },
      { path: '/data', access: 'rw' },
      { path: '/vault', access: 'r' },
      { path: '/teams', access: 'r' },
      { path: '/teams/roles', access: 'r' },
      { path: '/teams/members', access: 'r' },
    ],
    [DefaultRole.Admin]: [
      { path: '/agents', access: 'rw' },
      { path: '/agent-settings', access: 'rw' },
      { path: '/builder', access: 'rw' },
      { path: '/templates', access: 'rw' },
      { path: '/domains', access: 'rw' },
      { path: '/data', access: 'rw' },
      { path: '/vault', access: 'rw' },
      { path: '/analytics', access: 'rw' },
      { path: '/my-plan', access: 'r' },
      { path: '/teams', access: 'rw' },
      { path: '/teams/roles', access: 'r' },
      { path: '/teams/members', access: 'rw' },
      { path: '/subteams', access: 'rw' },
    ],
  };

  const config = roleConfigs[role];
  if (!config) {
    throw new Error(`Role ${role} is not recognized.`);
  }

  // Apply specific access permissions to each path
  config.forEach(({ path, access }) => {
    if (acls?.page?.[path]) {
      acls.page[path].access = access;
    }
  });

  return acls;
};
