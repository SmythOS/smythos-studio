import templateAcls from './constants/acl.constant.json';
import { AGENTS_WITH_NEXT_STEPS_SHOWN } from './constants/general';

export const generateKeyTemplateVar = (keyName: string): string => `{{KEY(${keyName})}}`;

export const hasAnyAccess = (currentAcls: object) => {
  const aclsArray = Object.keys(currentAcls)
    .filter((aclKey) => !currentAcls[aclKey].internal && !templateAcls.page[aclKey]?.internal)
    .map((aclKey) => ({
      access: currentAcls[aclKey]?.access,
      name: templateAcls?.page[aclKey]?.name,
      internal: templateAcls?.page[aclKey]?.internal,
    }));

  return aclsArray.some((acl) => acl.access !== '');
};


export const getInitials = (name: string, email: string) => {
  return name ? name.charAt(0).toUpperCase() : email.charAt(0).toUpperCase();
};

export const extractInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .toUpperCase();
};

/**
 * Validates and sanitizes a redirect path to prevent open redirect vulnerabilities
 * @param path - The path to validate
 * @returns A safe path string or '/' if invalid
 * @example
 * // Returns '/dashboard'
 * sanitizeRedirectPath('/dashboard')
 *
 * // Returns '/search?q=test'
 * sanitizeRedirectPath('/search?q=test')
 *
 * // Returns '/' (invalid - contains protocol)
 * sanitizeRedirectPath('https://evil.com/hack')
 *
 * // Returns '/' (invalid - protocol-relative URL)
 * sanitizeRedirectPath('//evil.com/hack')
 *
 * // Returns '/' (invalid URL)
 * sanitizeRedirectPath('not-a-url')
 */
export const sanitizeRedirectPath = (path: string): string => {
  try {
    if (path.includes('://') || path.startsWith('//')) {
      return '/';
    }

    const urlObject = new URL(path, 'https://smythos.com'); // here smythos.com doesn't matter, we just need the pathname and search params
    return `${urlObject.pathname}${urlObject.search}`;
  } catch {
    return '/';
  }
};

export const getShownAgentIds = () => {
  const data = localStorage.getItem(AGENTS_WITH_NEXT_STEPS_SHOWN);
  return data ? JSON.parse(data) : [];
};

export const recordNextStepsShown = (agentId: string): void => {
  const seenAgents = getShownAgentIds();
  const uniqueAgents = [...new Set([...seenAgents, agentId])];
  localStorage.setItem(AGENTS_WITH_NEXT_STEPS_SHOWN, JSON.stringify(uniqueAgents));
};

export const shouldShowNextSteps = (agentId: string) => {
  const seenAgents = getShownAgentIds();
  return !seenAgents.includes(agentId);
};

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isProdEnv() {
  // this comes from rollup-fe.config.mjs
  return process.env.NODE_ENV === 'production';
}
