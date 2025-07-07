/**
 * UsageReporter - Handles usage tracking and reporting to Stripe's metered billing system
 *
 * This service manages the aggregation and reporting of usage metrics (tasks and seats) to Stripe.
 * It implements a buffered reporting strategy to optimize API calls and handle high-volume usage events.
 * Reason for initial implementation is because of the high volume of usage events with small Stripe API rate limits.
 *
 * Key features:
 * - Buffers usage data in Redis before reporting to Stripe
 * - Reports usage when either:
 *   a) A threshold amount is reached (FLUSH_THRESHOLD)
 *   b) A time interval has passed (INTERVAL)
 * - Handles different pricing versions (v3, v4) with different metering strategies
 * - Implements retry logic with exponential backoff for failed Stripe API calls
 * - Uses Redis locks to prevent duplicate reporting in distributed environments
 * - Provides separate handling for task usage and seat usage reporting
 *
 * Reported Metrics:
 * 1. Tasks Usage:
 *    - Aggregates task counts in Redis before reporting to Stripe
 *    - Uses different meter names based on pricing version (v3 vs v4)
 *    - Implements buffering to handle high-frequency task events efficiently
 *    - Reports accumulated usage when threshold or time interval is reached
 *
 * 2. Seats Usage:
 *    - v3 Pricing: Updates subscription quantity directly in Stripe
 *      - Uses max(minimumChargedSeats, actualSeats) as the charged quantity
 *    - v4 Pricing: Reports as metered usage
 *      - Reports only seats above the included quota
 *      - Reports incrementally when seats are added
 *      - Reports total overage during monthly reconciliation
 *
 * Redis Key Structure:
 * - Usage data: mw:usage_reporter:customer:{customerId}:{meterName}:task_usage
 * - Last report time: mw:usage_reporter:customer:{customerId}:last_reported
 * - Report locks: mw:usage_reporter:customer:{customerId}:report_lock
 */

import redisConn from '../../../connections/redis.connection';
import axios from 'axios';
import { config } from '../../../../config/config';
import { createLogger } from '../../../../config/logging-v2';
import { subscriptionService } from '../../subscription/services';
import { prisma } from '../../../../prisma/prisma-client';
import { PrismaTransaction } from '../../../../types';
import { SubscriptionProperties } from '../interfaces';
import { stripe } from '../../../lib/payments';
import { PRICING_FLOW_VERSIONS, SUBS_ITEMS_TAGS } from '../../subscription/constants';

const LOGGER = createLogger('UsageReporter');

class UsageReporter {
  // TODO [AHMED]: probably we might need to make the task units flush threshold dynamic based on the pricing flow version
  // TODO [AHMED]: since some versions report enourmous amount of tasks in a single event (e.g v4)
  TASK_UNITS_FLUSH_THRESHOLD = 100;
  TASK_UNITS_SYNC_INTERVAL = 1000 * 60 * 1; // 1 minute
  public timers: Record<string, NodeJS.Timeout> = {}; // customerId -> timer

  onStartup() {
    setInterval(() => {
      LOGGER.info(`Timers count: ${Object.keys(this.timers).length}`);
      LOGGER.info(`Customers in timers: ${Object.keys(this.timers).join(', ')}`);
    }, 30_000);

    this.initializeJob().catch(err => LOGGER.error('Error initializing usage reporter', err));
  }

  public async handleTeamTasksUsage({
    teamId,
    tasks,
    flushThreshold,
    meterName,
  }: {
    teamId: string;
    tasks: number;
    flushThreshold?: number;
    meterName: string;
  }) {
    try {
      LOGGER.info(`Reporting usage for team ${teamId}, checking if we need to report usage to stripe`);
      const subs = await subscriptionService.getTeamSubs(teamId, { tx: prisma }, true);

      if (!subs.object?.id) {
        // This is a custom plan or a free plan, so we don't need to update seats counts in stripe
        LOGGER.info(`Team ${teamId} is on a custom plan or a free plan, so we don't need to update seats counts in stripe`);
        return;
      }

      if (!subs.object?.items?.data[0]?.price?.metadata?.newFlow && !subs.object?.items?.data[0]?.price?.metadata?.pricingFlowVersion) {
        // If it's old pricing then we don't need to update seats counts in stripe
        LOGGER.info(`Team ${teamId} is on an old pricing plan, so we don't need to update seats counts in stripe`);
        return;
      }

      this.bufferAndReportTasks(subs.object.customer.toString(), meterName, tasks, flushThreshold);

      LOGGER.info(`Successfully reported usage for customer ${subs.object.customer}`, {
        customerId: subs.object.customer,
        reportedCount: tasks,
      });
    } catch (error) {
      LOGGER.error(`Error in reporting usage to stripe for team ${teamId}`, {
        error: error.message,
        stack: error.stack,
        teamId,
      });
      return null;
    }
  }

  public async handleTeamSeatsUsage({
    teamId,
    tx = prisma,
    seatAdded = false,
    monthlyReporting = false,
    meterName,
  }: {
    teamId: string;
    tx?: PrismaTransaction;
    seatAdded?: boolean;
    monthlyReporting?: boolean;
    meterName: string;
  }) {
    try {
      LOGGER.info(`Users count changed for team ${teamId}, checking if we need to update seats counts in Stripe`);
      const subs = await subscriptionService.getTeamSubs(teamId, { tx }, true);

      if (!subs.object?.id) {
        // This is a custom plan or a free plan, so we don't need to update seats counts in stripe
        LOGGER.info(`Team ${teamId} is on a custom plan or a free plan, so we don't need to update seats counts in stripe`);
        return;
      }

      if (!subs.object?.items?.data[0]?.price?.metadata?.newFlow && !subs.object?.items?.data[0]?.price?.metadata?.pricingFlowVersion) {
        // If it's old pricing then we don't need to update seats counts in stripe
        LOGGER.info(`Team ${teamId} is on an old pricing plan, so we don't need to update seats counts in stripe`);
        return;
      }

      // Get all team members to count non-smythos users
      const teamMembers = await tx.user.findMany({
        where: {
          userTeamRole: {
            some: {
              sharedTeamRole: {
                teamId,
              },
            },
          },
        },
        select: {
          id: true,
          email: true,
        },
      });

      // Count only non-smythos.com users
      const teamMembersCount = teamMembers.filter(member => !member.email.toLowerCase().endsWith('@smythos.com')).length;

      let subscriptionItemId;
      let pricingFlowVersion = null;

      for (const item of subs.object?.items?.data || []) {
        if (item.price.metadata && item.price.metadata.for === SUBS_ITEMS_TAGS.SEATS_USAGE) {
          subscriptionItemId = item.id;
          pricingFlowVersion = item.price.metadata?.pricingFlowVersion;
          break;
        }
      }

      if (!subscriptionItemId) {
        throw new Error('No subscription item found for user seats');
      }

      if (!pricingFlowVersion) {
        // v3 pricing flow
        const smythProps = subs.properties as SubscriptionProperties;
        const minChargedSeats = Number(subs.object?.metadata?.minimumChargedSeats || smythProps?.minimumChargedSeats) || 0;
        LOGGER.info(
          `Team ${teamId} has ${teamMembersCount} billable seats, and the minimum charged seats is ${minChargedSeats}. New charged seats is ${Math.max(
            minChargedSeats,
            teamMembersCount,
          )}`,
        );

        const chargedSeats = Math.max(minChargedSeats, teamMembersCount);

        await stripe.subscriptionItems.update(subscriptionItemId, {
          quantity: chargedSeats,
        });

        return true;
      } else if (pricingFlowVersion === PRICING_FLOW_VERSIONS.V4) {
        /* 
        only report usage if
          - seat is added 
          - monthly reporting (after each monthly invoice we will report users count so if 
          user removed team members during month it will be adjusted at this point)
        we will not report if a user is removed from the team 
        */
        if (seatAdded || monthlyReporting) {
          const subscriptionProperties: any = subs?.properties as SubscriptionProperties;
          const includedSeats = subscriptionProperties?.seatsIncluded || 0;

          if (teamMembersCount - includedSeats > 0) {
            await this.sendToMeter({
              // stripeMeterName: `${config.variables.STRIPE_V4_SEATS_METER_NAME}`,
              stripeMeterName: meterName,
              /* if seatAdded is true it means a new user accepted the invitation so we report 1 seat
              if seatAdded is false it means we are monthly reporting and in monthly reporting we report the
              difference between the total seats of the team and the free seats included in the subscription */
              value: seatAdded ? 1 : teamMembersCount - includedSeats,
              customerId: subs.object.customer,
            });

            LOGGER.info(`Successfully reported seats for customer ${subs.object.customer}`, {
              customerId: subs.object.customer,
              reportedCount: seatAdded ? 1 : teamMembersCount - includedSeats,
            });
            return true;
          }
        }
      }
    } catch (error) {
      LOGGER.error(`Error in reporting seat count to stripe for team ${teamId}`, {
        error: error.message,
        stack: error.stack,
        teamId,
        seatAdded,
        monthlyReporting,
      });
      return null;
    }
  }

  private async bufferAndReportTasks(customerId: string, stripeMeterName?: string, taskCount?: number, flushThreshold?: number) {
    const _flushThreshold = flushThreshold ?? this.TASK_UNITS_FLUSH_THRESHOLD;

    LOGGER.info(`Report tasks was called for customer ${customerId}, count: ${taskCount}`, {
      customerId,
      taskCount,
      _flushThreshold,
      currentUsage: await redisConn.get(this.keyGen.usage(customerId, stripeMeterName)),
    });

    //
    // Keys in Redis for tracking last report time and usage count
    const usageKey = this.keyGen.usage(customerId, stripeMeterName);
    const lastReportKey = this.keyGen.lastReport(customerId);

    // Increment usage in Redis
    const newUsageCount = await redisConn.incrby(usageKey, taskCount || 0);

    let lastReported: number | string = await redisConn.get(lastReportKey);
    lastReported = lastReported ? parseInt(lastReported, 10) : 0;
    const timeSinceLastReport = lastReported ? Date.now() - lastReported : this.TASK_UNITS_SYNC_INTERVAL;

    if (timeSinceLastReport >= this.TASK_UNITS_SYNC_INTERVAL || newUsageCount >= _flushThreshold) {
      if (newUsageCount <= 0) {
        LOGGER.info(`Skipping usage report for customer ${customerId} - usage count is 0`, {
          customerId,
          newUsageCount,
        });
        return;
      }
      LOGGER.info(
        timeSinceLastReport >= this.TASK_UNITS_SYNC_INTERVAL
          ? `Threshold reached for customer ${customerId} (time since last report)`
          : `Threshold reached for customer ${customerId} (usage count)`,
        {
          timeSinceLastReport,
          newUsageCount,
          threshold: this.TASK_UNITS_FLUSH_THRESHOLD,
        },
      );

      // report to stripe
      // lock the key so that no other reports are sent while this is in progress
      const lockKey = this.keyGen.ongoingReportLock(customerId);
      const lockAcquired = await redisConn.set(lockKey, '1', 'EX', 30, 'NX'); // Lock expires in 30 seconds
      if (lockAcquired) {
        LOGGER.info(`Reporting usage for customer ${customerId}`, {
          taskCount,
          accumulatedUsage: newUsageCount,
        });

        // report to stripe
        try {
          await this.sendToMeter({ customerId, value: newUsageCount, stripeMeterName });
          await redisConn.set(lastReportKey, Date.now());
          await redisConn.decrby(usageKey, newUsageCount);
          LOGGER.info(`Successfully reported usage for customer ${customerId}`, {
            customerId,
            reportedCount: taskCount,
            remainingUsage: await redisConn.get(usageKey),
          });
        } catch (err: any) {
          LOGGER.error(`Error reporting usage for customer ${customerId}`, {
            error: err.message,
            stack: err.stack,
            customerId,
            taskCount,
          });
        } finally {
          // delete the lock key
          await redisConn.del(lockKey);
        }
      } else {
        LOGGER.warn(`Could not acquire lock for customer ${customerId} for reporting usage`);
      }
    } else if (newUsageCount > 0) {
      if (this.timers[customerId]) return;
      this.timers[customerId] = setTimeout(() => {
        LOGGER.info(`Timer for customer ${customerId} to report usage has fired`);
        this.bufferAndReportTasks(customerId, stripeMeterName, undefined, flushThreshold);
        delete this.timers[customerId]; // delete the timer after it has run
      }, this.TASK_UNITS_SYNC_INTERVAL);
      LOGGER.info(`Created timer for customer ${customerId} to report usage`, {
        customerId,
      });
    }
  }

  private async sendToMeter({ stripeMeterName, value, customerId }) {
    let lastError: any;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        LOGGER.info(`Attempting to send Stripe meter event`, {
          customerId,
          attempt,
        });

        const meterEvent = await axios.post(
          'https://api.stripe.com/v1/billing/meter_events',
          {
            event_name: stripeMeterName,
            timestamp: Math.floor(Date.now() / 1000), // Current timestamp (ISO format)
            payload: {
              stripe_customer_id: customerId,
              value: String(value), // Convert taskCount (number) to string
            },
          },
          {
            headers: {
              Authorization: `Bearer ${config.variables.STRIPE_SECRET_KEY}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        );

        LOGGER.info(`Successfully sent Stripe meter event`, {
          customerId,
          attempt,
          eventId: meterEvent.data?.id,
        });
        return meterEvent;
      } catch (err: any) {
        lastError = err;
        if (attempt < 3) {
          // Random backoff between 1-3 seconds * attempt number
          const backoffMs = Math.floor(Math.random() * 2000 + 1000) * attempt; // 1-3 seconds
          await new Promise(resolve => {
            setTimeout(() => {
              resolve(true);
            }, backoffMs);
          });
        }
      }
    }

    throw lastError;
  }

  // Background job to initialize and perform periodic reporting [& soon some cleanup]
  // TODO [AHMED]: if we failed to report usage for a customer, we should remove it if it is unrecoverable [e.g 404 (customer not found)]
  public async initializeJob() {
    LOGGER.info('Initializing usage reporter...');

    const initJobLockKey = this.keyGen.initJobLock();

    const initJobLockAcquired = await redisConn.set(initJobLockKey, '1', 'EX', 10, 'NX');
    if (!initJobLockAcquired) {
      LOGGER.warn('Usage reporter initialization already in progress by another instance');
      return;
    }

    LOGGER.info('Gathered initial lock for usage reporter initialization');

    // Fetch all keys matching the usage pattern (both old and new formats)
    const customerUsageKeys = await redisConn.keys(this.keyGen.usageSearchKey());
    LOGGER.info(`Found ${customerUsageKeys.length} usage keys`);

    for (const usageKey of customerUsageKeys) {
      const keyParts = usageKey.split(':'); // Extract parts of the key
      const customerId = keyParts[3]; // Always the customer ID
      let meterName = config.variables.STRIPE_METER_NAME; // Default to old meter

      // If key contains meter name (new format), extract it
      if (keyParts.length === 5) {
        meterName = keyParts[4]; // Meter name exists
      }

      const lockKey = this.keyGen.ongoingReportLock(customerId);
      const isUserReportOngoing = await redisConn.get(lockKey); // Check if lock exists
      const usageCount = await redisConn.get(usageKey);

      if (usageCount && parseInt(usageCount, 10) <= 0) {
        continue; // Skip if no usage recorded
      }

      if (!isUserReportOngoing) {
        try {
          LOGGER.info(`Customer ${customerId} is using meter: ${meterName}`);

          // Now, call reportTasks with the correct Stripe meter
          this.bufferAndReportTasks(customerId, meterName).catch(err => {
            LOGGER.error(`Init job: Error reporting usage for customer ${customerId}: ${err.message}`);
          });
        } catch (err) {
          LOGGER.error(`Error processing customer ${customerId} in initializeJob`, {
            error: err.message,
            stack: err.stack,
          });
        }
      } else {
        LOGGER.info(`Skipping report for customer ${customerId} during initialization; an ongoing report lock for this customer is already ongoing`);
      }
    }

    LOGGER.info('Usage reporter initialization complete.');
  }

  private keyGen = {
    initJobLock: () => 'mw:usage_reporter:init_job_lock',
    usageSearchKey: () => 'mw:usage_reporter:customer:*:*:task_usage',

    // If meterName is undefined (old format), use default meter
    usage: (customer: string, meterName?: string) =>
      meterName ? `mw:usage_reporter:customer:${customer}:${meterName}:task_usage` : `mw:usage_reporter:customer:${customer}:task_usage`, // Old format fallback

    lastReport: (customer: string) => `mw:usage_reporter:customer:${customer}:last_reported`,
    ongoingReportLock: (customer: string) => `mw:usage_reporter:customer:${customer}:report_lock`,
  };
}

export const usageReporter = new UsageReporter();
