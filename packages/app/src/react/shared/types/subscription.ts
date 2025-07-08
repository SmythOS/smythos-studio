export interface TeamSubs {
  id: string;
  stripeId: string;
  status: string;
  startDate: string;
  endDate: string;
  object: StripeObject;
  plan: {
    id: number;
    name: string;
    price: number;
    stripeId: string;
    priceId: string;
    properties: PlanProperties;
    paid: boolean;
    isCustomPlan: boolean;
    isDefaultPlan: boolean;
  };
  properties: SubscriptionProperties;
  resetDate: Date;
}

export interface SubscriptionProperties {
  tasks: number;
  bonusTasks?: number;
  customModelsEnabled?: boolean;
  tiers?: {
    flat_amount: number;
    flat_amount_decimal: string;
    unit_amount: number;
    unit_amount_decimal: string;
    up_to: number | null | any;
  }[];
  price?: number;
}

export interface PlanProperties {
  limits?: {
    prodAiAgents?: number | null | any;
    devAiAgents?: number | null | any;
    teamMembers?: number | null | any;
    spaces?: number | null | any;
    dataPoolUsageGB?: number | null | any;
  };

  flags?: {
    embodimentsEnabled?: boolean;
    agentAuthSidebarEnabled?: boolean;
    domainRegistrationEnabled?: boolean;
    modelCostMultiplier?: number;
    whitelabel?: boolean;
  };
}

export type PlanNames = 'Early Adopters' | 'SmythOS Starter' | 'SmythOS PRO' | 'SmythOS Free';

interface StripeObject {
  id: string;
  cancel_at: number;
  cancel_at_period_end: boolean;
  canceled_at: number;
  cancellation_details: {
    comment: null | any;
    feedback: string;
    reason: string;
  };
  ended_at: number;
  metadata: {
    email: string;
    teamId: string;
  };
  next_pending_invoice_item_invoice: null | any;
  pending_invoice_item_interval: null | any;
  pending_setup_intent: null | any;
  pending_update: null | any;
  current_period_end: number;
  current_period_start: number;
  plan: {
    id: string;
    object: string;
    active: boolean;
    aggregate_usage: null | any;
    amount: null | any;
    amount_decimal: null | any;
    billing_scheme: string;
    created: number;
    currency: string;
    interval: string;
    interval_count: number;
    livemode: boolean;
    metadata: {
      Subs_tasks: string;
    };
    nickname: string;
    product: string;
    tiers_mode: string;
    transform_usage: null | any;
    trial_period_days: null | any;
    usage_type: string;
  };
  schedule: null | any;
  start_date: number;
  status: string;
}

export interface TeamSubsV2 {
  id: string;
  name: string;
  parentId: string;
  subscription: {
    id: string;
    status: string;
    plan: {
      id: number;
      name: string;
      price: number;
      stripeId: string;
      properties: {
        limits: {
          prodAiAgents: number;
          devAiAgents: number;
          spaces: number;
          teamMembers: number;
          dataPoolUsageGB: number;
        };
        flags: {
          embodimentsEnabled: boolean;
          agentAuthSidebarEnabled: boolean;
          domainRegistrationEnabled: boolean;
          distributionsEnabled: boolean;
          hasBuiltinModels: boolean;
          modelCostMultiplier: number;
        };
      };
      isDefaultPlan: boolean;
      friendlyName: string;
    };
    properties: {
      freeCredits: number;
      seatsIncluded: number;
      price: number;
    };
    endDate: string | null;
    startDate: string;
    updatedAt: string;
  };
  owner: {
    id: number;
    name: string | null;
    email: string;
    createdAt: string;
    avatar: string | null;
  };
  userId: number;
}
