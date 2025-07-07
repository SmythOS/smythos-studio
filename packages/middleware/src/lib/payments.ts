import Stripe from 'stripe';
import { config } from '../../config/config';

const stripe = new Stripe(config.variables.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export { stripe };
