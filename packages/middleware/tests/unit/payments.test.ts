import { PaymentLogger } from '../../src/modules/subscription/services/payment-webhook.service/helpers/payment-logger';
import { CheckoutSessionCompleted } from '../../src/modules/subscription/services/payment-webhook.service/commands/CheckoutSessionCompleted';
import { StripeWebhookUtils } from '../../src/modules/subscription/services/payment-webhook.service/helpers/webhook-utils';
import { describe, test } from 'vitest';
import { checkoutSessionCompletedEventData } from '../data/stripe.data';

const logger = new PaymentLogger();
const webhookUtils = new StripeWebhookUtils(logger);

describe('Payments System', () => {
  describe('Webhook Commands', () => {
    describe('checkout.session.completed', async () => {
      const cmd = new CheckoutSessionCompleted(logger, webhookUtils);

      test('should return a success message', async () => {
        const result = await cmd.execute(checkoutSessionCompletedEventData);
      });
    });
  });
});
