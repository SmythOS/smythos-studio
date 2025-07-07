import { PlanProperties } from '../../quota/interfaces';

export interface CreatePlanDto {
  plan: {
    name: string;
    price: number;
    stripeProductId: string;
    stripePriceId: string;
    properties: PlanProperties;
    isCustomPlan?: boolean;
    paid?: boolean;
  };
}

export interface EditPlanDto {
  id: number;
  plan: {
    name?: string;
    price?: number;
    stripeProductId?: string;
    stripePriceId?: string;
    properties?: Partial<PlanProperties>;
    paid?: boolean;
  };
}
