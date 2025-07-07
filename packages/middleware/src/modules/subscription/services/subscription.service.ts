/* eslint-disable no-nested-ternary */
import { Transactional } from '../../../../types/service.type';
import httpStatus from 'http-status';
import { prisma } from '../../../../prisma/prisma-client';
import { ConnectTeamToExistingPlanDto, UpsertTeamSubsWithNewPlanDto, EditTeamSubsDto } from '../dto/subscription.dto';
import ApiError from '../../../utils/apiError';
import { PrismaTransaction } from '../../../../types';
import { buildDefaultSubscriptionProps } from '../../quota/utils';
// import { LOGGER } from '../../../../config/logging';
import * as quotaUtils from '../../quota/utils';
import { stripe } from '../../../lib/payments';
import { teamService } from '../../team/services';
import { config } from '../../../../config/config';
import { stringifyErr } from '../../../utils/general';
import Stripe from 'stripe';
import { startOfMonth, format, addMonths } from 'date-fns';
import errKeys from '../../../utils/errorKeys';
import { SubscriptionProperties } from '../../quota/interfaces';
import axios from 'axios';
import { createLogger } from '../../../../config/logging-v2';
import { PRICING_FLOW_VERSIONS, SUBS_ITEMS_TAGS, SubsItemTag } from '../constants';

const LOGGER = createLogger('subscription.service.ts');

export const getTeamSubs = async (teamId: string, options?: { tx?: PrismaTransaction }, includeObject?: boolean) => {
  const _p = options?.tx || prisma;

  const team = await _p.team.findFirst({
    where: {
      id: teamId,
    },

    select: {
      subscriptionId: true,
      id: true,
    },
  });

  if (!team) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Team not found');
  }

  if (!team.subscriptionId) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Team does not have a subscription');
  }

  // RESET date will be the first day of the next month
  const resetTasksDate = startOfMonth(addMonths(new Date(), 1));

  const subs = await _p.subscription.findFirst({
    where: {
      id: team.subscriptionId,
    },

    select: {
      id: true,
      stripeId: true,
      status: true,
      properties: true,
      endDate: true,
      startDate: true,
      plan: {
        select: {
          id: true,
          name: true,
          price: true,
          stripeId: true,
          priceId: true,
          properties: true,
          paid: true,
          isCustomPlan: true,
          isDefaultPlan: true,
          friendlyName: true,
        },
      },
      ...(includeObject ? { object: true } : {}),
    },
  });

  if (subs.plan?.friendlyName) {
    subs.plan.name = subs.plan.friendlyName; // for backward compatibility
  }

  // const subs = _p.$queryRaw`
  //   SELECT
  //     "Subscription"."id",
  //     "Subscription"."stripeId",
  //     "Subscription"."status",
  //     "Plan"."id" as "plan.id",
  //     "Plan"."name" as "plan.name",
  //     "Plan"."price" as "plan.price",
  //     "Plan"."stripeId" as "plan.stripeId",
  //     "Plan"."priceId" as "plan.priceId",
  //     "Plan"."properties" as "plan.properties"
  //   FROM "Subscription"
  //   INNER JOIN "Plan" ON "Subscription"."planId" = "Plan"."id"
  //   WHERE "Subscription"."id" = ${team.subscriptionId}
  //   FOR UPDATE
  // `;

  return {
    ...subs,
    object: subs?.object as unknown as Stripe.Subscription | undefined | null,
    resetDate: resetTasksDate,
  };
};

export const updateSubscription = async (
  props: {
    planId?: number;
    teamId: string;
    sub: { id?: string; properties?: any; endAt?: Date; object?: { [key: string]: any }; startDate?: Date };
  },
  options?: {
    addLog?: (msg: string) => void;
  },
) => {
  const subs = await prisma.$transaction(
    async tx => {
      const team = await tx.team.findFirst({
        where: {
          id: props.teamId,
        },

        select: {
          subscription: {
            select: {
              id: true,
            },
          },
          id: true,
        },
      });

      if (!team) {
        options?.addLog?.('Team not found');
        throw new ApiError(httpStatus.NOT_FOUND, 'Team not found');
      }

      if (!team.subscription?.id) {
        options?.addLog?.('Team does not have a subscription');
        throw new ApiError(httpStatus.BAD_REQUEST, 'Team does not have a subscription');
      }

      return tx.subscription.update({
        where: {
          id: team.subscription.id,
        },

        data: {
          endDate: props.sub?.endAt,
          properties: (props.sub?.properties || buildDefaultSubscriptionProps()) as any,
          stripeId: props.sub?.id,
          startDate: props.sub?.startDate,
          object: props.sub?.object,

          ...(props.planId
            ? {
                plan: {
                  connect: {
                    id: props.planId,
                  },
                },
              }
            : {}),
        },

        select: {
          id: true,
          stripeId: true,
          status: true,
          startDate: true,
          plan: {
            select: {
              id: true,
              name: true,
              price: true,
              stripeId: true,
              priceId: true,
              properties: true,
            },
          },
        },
      });
    },
    {
      timeout: 60_000,
    },
  );

  return subs;
};

export const retrieveDefaultPlan = async ({ ctx }: Transactional) => {
  const _tx = ctx?.tx || prisma;

  let freePlan = await _tx.plan.findFirst({
    where: {
      isDefaultPlan: true,
    },
    select: {
      id: true,
    },
  });

  if (!freePlan) {
    LOGGER.info(`FREE PLAN DOESN'T EXIST. CREATING...`);
    freePlan = await _tx.plan.create({
      data: {
        name: 'Free',
        price: 0,
        paid: false,
        isDefaultPlan: true,
        stripeId: 'no-id',
        priceId: 'no-id',
        properties: quotaUtils.buildDefaultPlanProps(),
      },
      select: {
        id: true,
      },
    });
  }

  return freePlan;
};

export const generateCheckoutSession = async (props: {
  userId: number;
  teamId: string;
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
  tid?: string;
}) => {
  const successUrl = `${config.variables.FRONTEND_BASE_URL}${props.successUrl || '/agents'}`;
  const cancelUrl = `${config.variables.FRONTEND_BASE_URL}${props.cancelUrl || '/plans'}`;

  const session = await prisma
    .$transaction(
      async tx => {
        const team = await tx.team.findUniqueOrThrow({
          where: {
            id: props.teamId,
          },

          select: {
            subscriptionId: true,
            id: true,
            externalCustomerId: true,
          },
        });

        const teamOwner = await teamService.getTeamOwner({ teamId: team.id, ctx: { tx } });

        if (!teamOwner) {
          throw new ApiError(httpStatus.NOT_FOUND, 'Team owner not found', undefined, false);
        }

        // team owner is the only one who can subscribe to a plan
        if (teamOwner.id !== props.userId) {
          throw new ApiError(httpStatus.FORBIDDEN, 'Unauthorized action', errKeys.TEAM_OWNER_ONLY_ACTION);
        }

        const stripePrice = await stripe.prices.retrieve(props.priceId);
        if (!stripePrice) {
          throw new ApiError(httpStatus.NOT_FOUND, 'Price not found');
        }

        const identificationMetadata = {
          teamId: props.teamId,
          ...(teamOwner?.email ? { email: teamOwner.email } : {}),
        };

        if (!team.externalCustomerId) {
          const customer = await stripe.customers.create({
            email: teamOwner.email,
            name: teamOwner.name || undefined,
          });

          await tx.team.update({
            where: {
              id: props.teamId,
            },

            data: {
              externalCustomerId: customer.id,
            },
          });

          team.externalCustomerId = customer.id; //* update the team object in memory
        }

        // check if the team already has a subscription
        const customerSubs = await stripe.subscriptions.list({
          customer: team.externalCustomerId,
          limit: 1,
        });

        if (customerSubs.data.length > 0) {
          const subs = customerSubs.data[0];
          if (subs.status === 'incomplete') {
            // delete the subscription so the user can subscribe again
            await stripe.subscriptions.cancel(subs.id).catch(err => {
              LOGGER.error(`Error while cancelling incomplete subscription ${stringifyErr(err)}`);
              throw new ApiError(
                httpStatus.BAD_REQUEST,
                `It looks like you already have an incomplete subscription. If you currently have an active checkout session open, please close it and try again. If not, please wait a few moments and try again shortly.`,
              );
            });
            LOGGER.info(`Incomplete subscription implicitly cancelled for team ${props.teamId} so the user can subscribe again. subs id: ${subs.id}`);
          } else {
            // any other status will treated as active
            throw new ApiError(httpStatus.BAD_REQUEST, 'Team already has a subscription');
          }
        }

        const _session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price: props.priceId,
              quantity: 1,
            },
          ],

          subscription_data: {
            metadata: identificationMetadata,
          },
          customer: team?.externalCustomerId || undefined,
          metadata: identificationMetadata,
          mode: 'subscription',
          allow_promotion_codes: true,
          success_url: successUrl,
          cancel_url: cancelUrl,
          ...(props.tid ? { client_reference_id: props.tid } : {}), // affiliate id (if any)
        });

        return _session;
      },
      { timeout: 60_000 },
    )
    .catch(async err => {
      LOGGER.error(`Error while generating checkout session ${stringifyErr(err)}`);
      throw err;
    });

  return {
    sessionId: session.id,
    sessionUrl: session.url,
  };
};

export const generateCheckoutSessionV2 = async (props: {
  userId: number;
  teamId: string;
  priceIds: { priceId: string; for: SubsItemTag }[];
  successUrl?: string;
  cancelUrl?: string;
}) => {
  let pricingFlowVersion = null; // used to store plan name from the price metadata so create lineItems according to the plan type
  const successUrl = `${config.variables.FRONTEND_BASE_URL}${props.successUrl || '/agents'}`;
  const cancelUrl = `${config.variables.FRONTEND_BASE_URL}${props.cancelUrl || '/plans'}`;

  const session = await prisma
    .$transaction(
      async tx => {
        const team = await tx.team.findUniqueOrThrow({
          where: {
            id: props.teamId,
          },

          select: {
            subscriptionId: true,
            id: true,
            externalCustomerId: true,
          },
        });

        const teamOwner = await teamService.getTeamOwner({ teamId: team.id, ctx: { tx } });

        if (!teamOwner) {
          throw new ApiError(httpStatus.NOT_FOUND, 'Team owner not found', undefined, false);
        }

        // team owner is the only one who can subscribe to a plan
        if (teamOwner.id !== props.userId) {
          throw new ApiError(httpStatus.FORBIDDEN, 'Unauthorized action', errKeys.TEAM_OWNER_ONLY_ACTION);
        }

        for (const price of props.priceIds) {
          const stripePrice = await stripe.prices.retrieve(price.priceId);

          if (!stripePrice) {
            throw new ApiError(httpStatus.NOT_FOUND, `Price not found for ID: ${price.priceId}`);
          }

          if (stripePrice.metadata?.pricingFlowVersion) {
            pricingFlowVersion = stripePrice.metadata?.pricingFlowVersion;
          }
        }

        const identificationMetadata = {
          teamId: props.teamId,
          ...(teamOwner?.email ? { email: teamOwner.email } : {}),
        };

        if (!team.externalCustomerId) {
          const customer = await stripe.customers.create({
            email: teamOwner.email,
            name: teamOwner.name || undefined,
          });

          await tx.team.update({
            where: {
              id: props.teamId,
            },

            data: {
              externalCustomerId: customer.id,
            },
          });

          team.externalCustomerId = customer.id; //* update the team object in memory
        }

        // expire any opened checkout sessions. this will remove any incomplete subscription that is held coz of an open checkout session
        //! Would this cause issues ??
        await _expireStripeOpenSessions(team.externalCustomerId);

        // check if the team already has a subscription
        const customerSubs = await stripe.subscriptions.list({
          customer: team.externalCustomerId,
          limit: 1,
        });

        if (customerSubs.data.length > 0) {
          const subs = customerSubs.data[0];

          if (subs.status === 'incomplete') {
            // if an active checkout session is open, expire it.
            // delete the subscription so the user can subscribe again
            await stripe.subscriptions.cancel(subs.id).catch(err => {
              LOGGER.error(`Error while cancelling incomplete subscription ${stringifyErr(err)}`);
              throw new ApiError(
                httpStatus.BAD_REQUEST,
                `It looks like you already have an incomplete subscription. If you currently have an active checkout session open, please close it and try again. If not, please wait a few moments and try again shortly.`,
              );
            });
            LOGGER.info(`Incomplete subscription implicitly cancelled for team ${props.teamId} so the user can subscribe again. subs id: ${subs.id}`);
          } else {
            // any other status will treated as active
            throw new ApiError(httpStatus.BAD_REQUEST, 'Team already has a subscription');
          }
        }

        let lineItems = [];

        // build the line items for the checkout session
        if (!pricingFlowVersion) {
          // old pricing flow
          lineItems = props.priceIds.map(({ priceId, for: itemType }) => ({
            price: priceId,
            ...(itemType === SUBS_ITEMS_TAGS.SEATS_USAGE && { quantity: 1 }),
          }));
        } else if (pricingFlowVersion === PRICING_FLOW_VERSIONS.V4) {
          lineItems = props.priceIds.map(({ priceId, for: itemType }) => ({
            price: priceId,
            ...(itemType === SUBS_ITEMS_TAGS.BASE_PRICE && { quantity: 1 }),
          }));
        }

        const _session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [...lineItems],
          subscription_data: {
            metadata: identificationMetadata,
          },
          customer: team?.externalCustomerId || undefined,
          metadata: identificationMetadata,
          allow_promotion_codes: true,
          mode: 'subscription',
          success_url: successUrl,
          cancel_url: cancelUrl,
          after_expiration: {
            recovery: {
              enabled: true,
              allow_promotion_codes: true,
            },
          },
        });

        return _session;
      },
      { timeout: 60_000 },
    )
    .catch(async err => {
      LOGGER.error(`Error while generating checkout session ${stringifyErr(err)}`);
      throw err;
    });

  return {
    sessionId: session.id,
    sessionUrl: session.url,
  };
};

export const isTeamHasPaidSubs = async ({ teamId, ctx }: Transactional<{ teamId: string }>) => {
  const _tx = ctx?.tx || prisma;

  const team = await _tx.team.findUniqueOrThrow({
    where: {
      id: teamId,
    },
    select: {
      subscription: {
        select: {
          plan: {
            select: {
              paid: true,
            },
          },
        },
      },
    },
  });

  return team?.subscription?.plan.paid || false;
};

// export const updateStripeSubscriptionSeatCount = async ({ teamId, tx = prisma, seatAdded = false, monthlyReporting = false }: { teamId: string; tx?: PrismaTransaction, seatAdded?: boolean, monthlyReporting?: boolean }) => {
//   try {
//     LOGGER.info(`Users count changed for team ${teamId}, checking if we need to update seats counts in Stripe`);
//     const subs = await getTeamSubs(teamId, { tx }, true);

//     if (!subs.object?.id) {
//       // This is a custom plan or a free plan, so we don't need to update seats counts in stripe
//       LOGGER.info(`Team ${teamId} is on a custom plan or a free plan, so we don't need to update seats counts in stripe`);
//       return;
//     }

//     if (!subs.object?.items?.data[0]?.price?.metadata?.newFlow && !subs.object?.items?.data[0]?.price?.metadata?.pricingFlowVersion) {
//       // If it's old pricing then we don't need to update seats counts in stripe
//       LOGGER.info(`Team ${teamId} is on an old pricing plan, so we don't need to update seats counts in stripe`);
//       return;
//     }

//     const teamMembersCount = await tx.user.count({
//       where: {
//         userTeamRole: {
//           some: {
//             sharedTeamRole: {
//               teamId,
//             },
//           },
//         },
//       },
//     });

//     let subscriptionItemId;
//     let pricingFlowVersion = null;

//     for (const item of subs.object?.items?.data || []) {
//       if (item.price.metadata && item.price.metadata.for === 'user seats') {
//         subscriptionItemId = item.id;
//         pricingFlowVersion = item.price.metadata?.pricingFlowVersion;
//         break;
//       }
//     }

//     if (!subscriptionItemId) {
//       throw new Error('No subscription item found for user seats');
//     }

//     if (!pricingFlowVersion){ // v3 pricing flow
//       const smythProps = subs.properties as SubscriptionProperties;
//       const minChargedSeats = Number(subs.object?.metadata?.minimumChargedSeats || smythProps?.minimumChargedSeats) || 0;
//       LOGGER.info(
//         `Team ${teamId} has ${teamMembersCount} seats, and the minimum charged seats is ${minChargedSeats}. New charged seats is ${Math.max(
//           minChargedSeats,
//           teamMembersCount,
//         )}`,
//       );

//       const chargedSeats = Math.max(minChargedSeats, teamMembersCount);

//       const updatedSubscriptionItem = await stripe.subscriptionItems.update(subscriptionItemId, {
//         quantity: chargedSeats,
//       });

//       return true;
//     } else if (pricingFlowVersion === PRICING_FLOW_VERSIONS.V4) {
//       // only report usage if seat is added or monthly reporting
//       // we will not report if a user is removed from the team
//       if(seatAdded || monthlyReporting){
//         // find included seats from sub object
//         const includedSeats = 1;

//         if (teamMembersCount - includedSeats > 0){
//           await reportUsageToStripeMeter({
//             stripeMeterName: `${config.variables.STRIPE_V4_SEATS_METER_NAME}`,
//             /* if seatAdded is true it means a new user accepted the invitation so we report 1 seat
//             if seatAdded is false it means we are monthly reporting and in monthly reporting we report the
//             difference between the current number of seats and the included seats */
//             value: seatAdded ? 1 : teamMembersCount - includedSeats,
//             customerId: subs.object.customer
//           })

//           LOGGER.info(`Successfully reported seats for customer ${subs.object.customer}`, {
//             customerId: subs.object.customer,
//             reportedCount: seatAdded ? 1 : teamMembersCount - includedSeats,
//           });
//           return true;
//         }
//       }
//     }
//   } catch (error) {
//     LOGGER.error(`Error in reporting seat count to stripe for team ${teamId}`,{
//         error: error.message,
//         stack: error.stack,
//         teamId: teamId,
//         seatAdded,
//         monthlyReporting,
//     });
//     return null;
//   }
// };

// export const reportTaskUsageToStripeMeter = async (teamId: string, taskCount: number) => {
//   const subs = await getTeamSubs(teamId, { tx: prisma }, true);

//   if (!subs.object?.id) {
//     // This is a custom plan or a free plan, so we don't need to report task usage
//     LOGGER.info(`Team ${teamId} is on a custom plan or a free plan, so we don't need to report task usage`);
//     return;
//   }

//   if (!subs.object?.items?.data[0]?.price?.metadata?.newFlow && !subs.object?.items?.data[0]?.price?.metadata?.pricingFlowVersion) {
//     // If it's old pricing then we we don't need to report task usage
//     LOGGER.info(`Team ${teamId} is on an old pricing plan, so we don't need to report task usage`);
//     return;
//   }

//   if (!subs.object.customer) {
//     throw new Error('No customer found for this subscription');
//   }

//   return await reportUsageToStripeMeter({
//     stripeMeterName: `${config.variables.STRIPE_METER_NAME}`,
//     value: taskCount,
//     customerId: subs.object.customer
//   })
// };

// export const reportUsageToStripe = async ({meterName, value, stripe_customer_id}) => {
//   let meterEvent;

//   try {
//     meterEvent = await axios.post(
//       'https://api.stripe.com/v1/billing/meter_events',
//       {
//         event_name: meterName,
//         timestamp: Math.floor(Date.now() / 1000),
//         payload: {
//           stripe_customer_id: stripe_customer_id,
//           value: String(value),
//         },
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${config.variables.STRIPE_SECRET_KEY}`,
//           'Content-Type': 'application/x-www-form-urlencoded',
//         },
//       },
//     );
//   } catch (error) {
//     LOGGER.error(`Error reporting usage!!: ${stringifyErr(error)}`);
//   }

//   return meterEvent;
// }

// export const reportUsageToStripeMeter = async ({stripeMeterName, value, customerId}) => {
//   let lastError: any;
//   for (let attempt = 1; attempt <= 3; attempt++) {
//     try {
//       LOGGER.info(`Attempting to send Stripe meter event`, {
//         customerId,
//         attempt,
//       });

//       const meterEvent = await axios.post(
//         'https://api.stripe.com/v1/billing/meter_events',
//         {
//           event_name: stripeMeterName,
//           timestamp: Math.floor(Date.now() / 1000), // Current timestamp (ISO format)
//           payload: {
//             stripe_customer_id: customerId,
//             value: String(value), // Convert taskCount (number) to string
//           },
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${config.variables.STRIPE_SECRET_KEY}`,
//             'Content-Type': 'application/x-www-form-urlencoded',
//           },
//         },
//       );

//       LOGGER.info(`Successfully sent Stripe meter event`, {
//         customerId,
//         attempt,
//         eventId: meterEvent.data?.id,
//       });
//       return meterEvent;
//     } catch (err: any) {
//       lastError = err;
//       if (attempt < 3) {
//         // Random backoff between 1-3 seconds * attempt number
//         const backoffMs = Math.floor(Math.random() * 2000 + 1000) * attempt; // 1-3 seconds
//         await new Promise(resolve => {
//           setTimeout(() => {
//             resolve(true);
//           }, backoffMs);
//         });
//       }
//     }
//   }

//   throw lastError;
// }

const _expireStripeOpenSessions = async (customerId: string) => {
  const sessions = await stripe.checkout.sessions.list({
    customer: customerId,
    status: 'open',
    limit: 10,
  });

  const activeSessions = sessions.data.filter(session => session.status === 'open' && session.customer?.toString() === customerId);

  for (const session of activeSessions) {
    LOGGER.info(`Expiring session: ${session.id}`);
    await stripe.checkout.sessions.expire(session.id);
  }
};
