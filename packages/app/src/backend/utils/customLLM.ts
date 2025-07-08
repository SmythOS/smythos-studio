import { CUSTOM_LLM_ALLOWED_EMAIL_DOMAINS } from '../constants';

/**
 * Checks if the given email is allowed to access custom LLM features.
 * @param email The email address to check.
 * @returns True if the email is allowed, false otherwise.
 */
export function isCustomLLMAllowed(email: string): boolean {
  return CUSTOM_LLM_ALLOWED_EMAIL_DOMAINS.some(domain => email.endsWith(`@${domain}`));
}