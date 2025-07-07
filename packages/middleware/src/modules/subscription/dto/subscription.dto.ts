import { SubscriptionProperties, PlanProperties } from '../../quota/interfaces';

export interface UpsertTeamSubsWithNewPlanDto {
  teamId: string;
  plan: {
    name: string;
    price: number;
    stripeProductId: string;
    stripePriceId: string;
    properties: PlanProperties;
  };
  stripeSubsId: string;
  sub?: {
    endAt?: Date;
    properties?: Partial<SubscriptionProperties>;
    billedAt?: Date;
  };
}

export interface EditTeamSubsDto {
  teamId: string;
  // plan?: {
  //   name?: string;
  //   price?: number;
  //   stripeProductId?: string;
  //   stripePriceId?: string;
  //   properties?: Partial<PlanProperties>;
  // };
  stripeSubsId?: string;
  properties?: Partial<SubscriptionProperties>;
  endAt?: Date;
}

export interface ConnectTeamToExistingPlanDto {
  teamId: string;
  targetPlanId: number;
  stripeSubsId: string;
  sub?: {
    endAt?: Date;
    properties?: Partial<SubscriptionProperties>;
    billedAt?: Date;
    object?: { [key: string]: any };
  };
}
