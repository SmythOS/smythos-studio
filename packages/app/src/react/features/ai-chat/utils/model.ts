const BADGE_TAGS: Record<string, boolean> = {
  enterprise: true,
  smythos: true,
  personal: true,
  limited: true,
};

export const getBadgeFromTags = (tags: string[]): string => {
  return tags.filter((tag) => BADGE_TAGS[tag?.toLowerCase()]).join(' ');
};
