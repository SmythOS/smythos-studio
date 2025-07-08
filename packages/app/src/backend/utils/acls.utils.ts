import Joi from 'joi';
import { AclRule, CombinedAclRules, DefaultRole } from '../../shared/constants/acl.constant';
import config from '../config';
import { cloneDeep } from 'lodash-es';
import templateAcls from '../../shared/constants/acl.constant.json';
export { isDefaultRole } from './default.acls';
export { getDefaultRoleAcls } from './default.acls';

type Rules = {
  [key: string]: AclRule;
};

export const giveAllAclRulesRW = (acls: CombinedAclRules): CombinedAclRules => {
  const newAcls = cloneDeep(acls);
  Object.keys(newAcls).forEach((partition) => {
    Object.keys(newAcls[partition]).forEach((path) => {
      newAcls[partition][path].access = 'rw';
    });
  });
  return newAcls;
};

// for every acl in the database, that exists in the json, copy access from DB entry
export const applyMatchedAclRules = (
  dbAcls: CombinedAclRules | null,
  templateAcls: CombinedAclRules,
): CombinedAclRules => {
  // if no dbAcls, return templateAcls (it has empty access rules "")
  if (!dbAcls) {
    return templateAcls;
  }
  const newAcls = cloneDeep(templateAcls);
  Object.keys(newAcls).forEach((partition) => {
    Object.keys(newAcls[partition]).forEach((path) => {
      const matched = dbAcls?.[partition]?.[path];
      if (matched !== null && matched !== undefined) {
        if (templateAcls[partition]?.[path]?.internal !== true) {
          newAcls[partition][path].access = dbAcls[partition][path].access;
        }
        if (templateAcls[partition]?.[path]?.internal === true) {
          // if we later update the template to have internal rules, we should not overwrite them with db values
          newAcls[partition][path].internal = true;
        }
      }
    });
  });
  return newAcls;
};

export const checkAclsValidity = (acls: any): boolean => {
  if (acls === null || acls === undefined) return false;
  // should match the shape of CombinedAclRules { page: { [key: string]: { access: string; redirect?: string }, api: { [key: string]: { access: string; redirect?: string } } (just match the format, not the values or acl keys)
  const aclRuleSchema = Joi.object({
    access: Joi.string().required().allow(null).allow('').valid('r', 'rw', 'w'), // allow null and empty string (for no access)
    redirect: Joi.string().optional(),
    name: Joi.string().optional().allow(null).allow(''),
    internal: Joi.boolean().optional().allow(null).allow(''),
  });

  const combinedAclRulesSchema = Joi.object({
    page: Joi.object()
      .pattern(
        Joi.string(), // for [key: string]
        aclRuleSchema, // for the rule structure
      )
      .required(),
    api: Joi.object()
      .pattern(
        Joi.string(), // for [key: string]
        aclRuleSchema, // for the rule structure
      )
      .required(),
    default_role: Joi.string()
      .optional()
      .allow(...Object.values(DefaultRole)),
  });

  const { error } = combinedAclRulesSchema.validate(acls);

  if (error) {
    return false;
  }

  return true;
};

/**
 * Get page rule of ACL
 * @param {object} page all rules
 * @param {string} curPage path of current page
 * @returns
 */
export function getRule(rules: Rules, curPage: string, forceExactMatch: boolean = false): AclRule {
  let rule: AclRule = { access: '' };

  if (!rules || (typeof rules === 'object' && !Object.keys(rules).length) || !curPage) return rule;
  let endAtSlash = curPage.length > 1 && curPage[curPage.length - 1] === '/';
  curPage = curPage?.length > 1 ? curPage.replace(/\/$/, '') : curPage;

  // ATTEMPT 1: check if we can find the rule with full path (including query param, fragment etc.)
  // e.g '/builder/agent?mode=processing'
  rule = getObjValue(rules, curPage) || (endAtSlash && getObjValue(rules, curPage.slice(0, -1)));

  if (!rule && !forceExactMatch) {
    // ATTEMPT 2: get rule with the original path by removing any query params or fragment.
    // e.g from '/builder/agent?mode=processing' to /builder/agent

    const url = new URL(curPage, config.env.UI_SERVER);
    const path = url.pathname;
    endAtSlash = path.length > 1 && path[path.length - 1] === '/';

    rule = getObjValue(rules, path) || (endAtSlash && getObjValue(rules, path.slice(0, -1)));

    if (!rule) {
      // ATTEMPT 3: Iterate through path segments starting from the deepest. In each iteration remove the last segment and create a path by combining rest of the segment(s).
      // e.g '/builder/agent/new' => ['builder', 'agent', 'new'] => '/builder/agent' => '/builder'

      const pathSegments = path.split('/').filter((part) => part !== '');

      for (let i = pathSegments.length - 1; i >= 0; i--) {
        let newPath = pathSegments.slice(0, i).join('/');

        newPath = newPath ? '/' + newPath : '';

        rule = getObjValue(rules, newPath);

        if (rule) break;
      }
    }
  }

  return rule;
}

/**
 * Get object value
 * If the key does not match, get value by partial match (from start)
 * @param {object} obj
 * @param {string} key
 * @returns
 */
export function getObjValue(obj: { [key: string]: any }, key: string): any {
  if (!key) return null;

  let value = obj?.[key];

  if (!value) {
    try {
      // Escape special regex characters in the key
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regExp = new RegExp(`^${escapedKey}`);

      for (const key in obj) {
        if (regExp.test(key)) {
          value = obj[key];
          break;
        }
      }
    } catch (error) {
      console.error('Error creating regex from path:', error);
      // Fallback to simple prefix matching if regex fails
      for (const objKey in obj) {
        if (objKey.startsWith(key)) {
          value = obj[objKey];
          break;
        }
      }
    }
  }

  return Object.keys(value || {}).length ? value : null;
}

/**
 *
 * @description Check if the rule is internal (i.e. essential for the app to function)
 * @param acls
 * @param path
 * @returns
 * @example
 * isInternalRule(acls, '/builder/agent') // true
 */
export const isInternalRule = (
  acls: {
    [key: string]: AclRule;
  },
  path: string,
): boolean => {
  const rule = getRule(acls, path);
  return rule?.internal || false;
};
