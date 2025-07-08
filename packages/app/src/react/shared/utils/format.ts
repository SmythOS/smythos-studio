/**
 * Formats a number using the default locale's number formatting
 * @param num - The number to format
 * @returns Formatted number string
 */
export const formatNumber = (num: number | undefined | null): string => {
  return Intl.NumberFormat().format(num || 0);
};

/**
 * Formats a Unix timestamp to a date string with optional year
 * @param timestamp - Unix timestamp in seconds
 * @param includeYear - Whether to include the year in the output
 * @returns Formatted date string
 */
export const formatDate = (timestamp: number, includeYear: boolean = false): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    ...(includeYear && { year: 'numeric' }),
  });
};

/**
 * Converts a storage size to Gigabytes based on the unit
 * @param usage - The storage size value
 * @param unit - The unit of storage (GB, MB, KB)
 * @returns The size converted to GB
 */
export const convertToGB = (usage: number, unit: string): number => {
  if (!usage || !unit || usage === 0) return 0;

  switch (unit.toUpperCase()) {
    case 'GB':
      return usage; // Already in GB
    case 'MB':
      return usage / 1024; // Convert MB to GB
    case 'KB':
      return usage / (1024 * 1024); // Convert KB to GB
    default:
      return usage; // Default case, return as is
  }
};

/**
 * Checks if a subscription plan is a custom plan
 * @param plan - The subscription plan object
 * @returns boolean indicating if it's a custom plan
 */
export const isCustomPlan = (plan: { isCustomPlan?: boolean; stripeId?: string }): boolean => {
  return !!plan?.isCustomPlan && (!plan?.stripeId || plan?.stripeId === 'no_id');
};
