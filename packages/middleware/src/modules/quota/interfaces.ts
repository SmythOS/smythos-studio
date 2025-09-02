export interface PlanProperties {
  limits?: PlanPropLimits;
  flags?: PlanPropFlags;
  app_version?: string;

  [key: string]: any;
}

export interface PlanPropLimits {
  prodAiAgents?: number | null;
  devAiAgents?: number | null;
  teamMembers?: number | null;
  spaces?: number | null;
  dataPoolUsageGB?: number | null;
}

export interface PlanPropFlags {
  embodimentsEnabled?: boolean;
  agentAuthSidebarEnabled?: boolean;
  domainRegistrationEnabled?: boolean;
  distributionsEnabled?: boolean;
  hasBuiltintModels?: boolean;
  modelCostMultiplier?: number;
}
export interface SubscriptionProperties {
  tasks?: number | null;
  bonusTasks?: number | null;
  tiers?: any;
  price?: number;
  minimumChargedSeats?: number;
  freeCredits?: number;
  customModelsEnabled?: boolean;
  seatsIncluded?: number;
}
