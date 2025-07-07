import Stripe from 'stripe';

export type StripeEventDataWithMetadata = Stripe.CustomerSubscriptionCreatedEvent.Data & {
  object: {
    id: string;
    // customer: string;
    metadata: {
      // metadata goes here
      email?: string;
      teamId?: string;
    };
  };
};

export type StripeSubsCreatedEvent = Stripe.CustomerSubscriptionCreatedEvent & {
  data: StripeEventDataWithMetadata;
};

export type StripeCheckoutSessionCompletedEvent = Stripe.CheckoutSessionCompletedEvent & {
  data: {
    object: {
      metadata: {
        email: string;
        teamId: string;
      };
    };
  };
};

export interface WebhookCommand {
  execute(event: Stripe.EventBase & { [key: string]: any }): Promise<{ success: boolean; [key: string]: any }>;
}

export type PlanNames = 'Early Adopters' | 'SmythOS Starter' | 'SmythOS PRO' | 'SmythOS Free';
