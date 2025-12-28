/**
 * Badge configuration for model tags (enterprise, smythos, personal, limited)
 */
const BADGE_TAGS: Record<string, boolean> = {
  enterprise: true,
  smythos: true,
  personal: true,
  limited: true,
};

/**
 * Extracts display badge from model tags
 * @param tags - Array of model tags
 * @returns Badge string for display
 */
export const getBadgeFromTags = (tags: string[]): string => {
  return tags.filter((tag) => BADGE_TAGS[tag?.toLowerCase()]).join(' ');
};
