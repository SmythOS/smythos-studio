export const PLAN_METADATA_PREFIX = 'Plan_';
export const PLAN_SUBS_METADATA_PREFIX = 'Subs_';

export const PRICING_FLOW_VERSIONS = {
  V4: 'v4 Jan 2025',
} as const;

export type PricingFlowVersion = (typeof PRICING_FLOW_VERSIONS)[keyof typeof PRICING_FLOW_VERSIONS];

export const SUBS_ITEMS_TAGS = {
  TASKS_USAGE: 'tasks usage',
  SEATS_USAGE: 'user seats',
  BASE_PRICE: 'base price',
} as const;

export type SubsItemTag = (typeof SUBS_ITEMS_TAGS)[keyof typeof SUBS_ITEMS_TAGS];

export const FREE_USERS_FREE_CREDITS = 5;
