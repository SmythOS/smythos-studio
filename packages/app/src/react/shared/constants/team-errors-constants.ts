// Team error keys that backend returns
export const TEAM_ERROR_KEYS = {
  TEAM_HAS_ACTIVE_SUBSCRIPTION: 'TEAM_HAS_ACTIVE_SUBSCRIPTION',
  TEAM_HAS_MEMBERS: 'TEAM_HAS_MEMBERS',
  TEAM_HAS_SUBTEAMS: 'TEAM_HAS_SUBTEAMS',
  USER_HAS_SUBTEAMS: 'USER_HAS_SUBTEAMS',
  TEAM_HAS_DATA: 'TEAM_HAS_DATA',
} as const;

// Display names for each error key
export const TEAM_ERROR_DISPLAY_NAMES = {
  [TEAM_ERROR_KEYS.TEAM_HAS_ACTIVE_SUBSCRIPTION]: 'Active subscription',
  [TEAM_ERROR_KEYS.TEAM_HAS_MEMBERS]: 'Team members present',
  [TEAM_ERROR_KEYS.TEAM_HAS_SUBTEAMS]: 'Spaces detected',
  [TEAM_ERROR_KEYS.USER_HAS_SUBTEAMS]: 'Spaces detected',
  [TEAM_ERROR_KEYS.TEAM_HAS_DATA]: 'Existing data',
} as const;

// Detailed error messages for each error type
export const TEAM_ERROR_MESSAGES = {
  [TEAM_ERROR_KEYS.TEAM_HAS_SUBTEAMS]: {
    invitationPage:
      'Please delete all spaces in your current team. See <a target="_blank" href="https://smythos.com/docs/agent-collaboration/spaces/#deleting-a-space">how to delete a space</a>',
    spaceSettings:
      'Please delete all spaces in your current team. See <a target="_blank" href="https://smythos.com/docs/agent-collaboration/spaces/#deleting-a-space">how to delete a space</a>',
  },
  [TEAM_ERROR_KEYS.USER_HAS_SUBTEAMS]: {
    invitationPage:
      'Please delete all spaces that you are owner of. See <a target="_blank" href="https://smythos.com/docs/agent-collaboration/spaces/#deleting-a-space">how to delete a space</a>',
    spaceSettings:
      'Please delete all spaces that you are owner of. See <a target="_blank" href="https://smythos.com/docs/agent-collaboration/spaces/#deleting-a-space">how to delete a space</a>',
  },
  [TEAM_ERROR_KEYS.TEAM_HAS_ACTIVE_SUBSCRIPTION]: {
    invitationPage:
      'Please cancel your current subscription from the <a target="_blank" href="https://app.smythos.com/my-plan">My Plan</a> page before switching teams.',
    spaceSettings:
      'Please cancel your current subscription from the <a target="_blank" href="https://app.smythos.com/my-plan">My Plan</a> page before switching teams.',
  },
  [TEAM_ERROR_KEYS.TEAM_HAS_MEMBERS]: {
    invitationPage:
      'Please remove all members from your team on the <a target="_blank" href="https://app.smythos.com/team-members">Team Members page</a>.',
    spaceSettings:
      'Please remove all members from your space on the <a target="_blank" href="https://app.smythos.com//teams/settings">Space Settings page</a>.',
  },
  [TEAM_ERROR_KEYS.TEAM_HAS_DATA]: {
    invitationPage:
      'You must delete all current team data before switching teams. Your account currently contains #value#.',
    spaceSettings:
      'You must delete all current team data before deleting spaces. Your account currently contains #value#.',
  },
} as const;

// Legacy error keys for backward compatibility
export const LEGACY_ERROR_KEYS = {
  'Spaces detected': TEAM_ERROR_KEYS.TEAM_HAS_SUBTEAMS,
  'Active subscription': TEAM_ERROR_KEYS.TEAM_HAS_ACTIVE_SUBSCRIPTION,
  'Team members present': TEAM_ERROR_KEYS.TEAM_HAS_MEMBERS,
  'Existing data': TEAM_ERROR_KEYS.TEAM_HAS_DATA,
} as const;

export type TeamErrorContext = 'invitationPage' | 'spaceSettings';

/**
 * Parses error message and returns structured error data for rendering
 * @param errorMessage - The error message from the API
 * @param context - The context where the error is being displayed
 * @returns Array of error objects with key and formatted message, or null if not a structured error
 */
export function parseTeamError(
  errorMessage: string,
  context: TeamErrorContext = 'invitationPage',
): Array<{ key: string; value: string }> | null {
  // Check if this is a key-value pair format error by splitting on double newlines
  const errorItems = errorMessage.split('\n\n');

  // If we have multiple error items, parse each one
  if (errorItems.length > 1) {
    const pairs: Array<{ key: string; value: string }> = [];
    let hasValidKey = false;

    errorItems.forEach((item) => {
      const trimmedItem = item.trim();
      if (trimmedItem) {
        let key = trimmedItem;
        let dynamicValue = '';

        // Check if this item has a colon (like "TEAM_HAS_DATA: 1 Namespace and 2 AI Agents")
        const colonIndex = trimmedItem.indexOf(':');
        if (colonIndex !== -1) {
          key = trimmedItem.substring(0, colonIndex).trim();
          dynamicValue = trimmedItem.substring(colonIndex + 1).trim();
        }

        // Check if key is one of the new error keys
        let errorKey = key as keyof typeof TEAM_ERROR_MESSAGES;
        let displayName = '';

        // If it's a new error key format
        if (TEAM_ERROR_MESSAGES[errorKey]) {
          displayName = TEAM_ERROR_DISPLAY_NAMES[errorKey];
          hasValidKey = true;
        }
        // If it's a legacy error key format, convert it
        else if (LEGACY_ERROR_KEYS[key as keyof typeof LEGACY_ERROR_KEYS]) {
          errorKey = LEGACY_ERROR_KEYS[key as keyof typeof LEGACY_ERROR_KEYS];
          displayName = key; // Use the legacy display name
          hasValidKey = true;
        }

        if (hasValidKey && TEAM_ERROR_MESSAGES[errorKey]) {
          let finalValue: string = TEAM_ERROR_MESSAGES[errorKey][context];

          // For "Existing data", replace #value# with the dynamic value
          if (errorKey === TEAM_ERROR_KEYS.TEAM_HAS_DATA && dynamicValue) {
            finalValue = finalValue.replace('#value#', dynamicValue);
          }

          pairs.push({ key: displayName, value: finalValue });
        }
      }
    });

    // Only return pairs if we found at least one valid key
    return hasValidKey && pairs.length > 0 ? pairs : null;
  }

  return null;
}
