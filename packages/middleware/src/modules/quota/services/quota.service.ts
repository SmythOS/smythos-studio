// import { aiAgentService, subscriptionService } from '.';
import { aiAgentService } from '../../ai-agent/services';
import { subscriptionService } from '../../subscription/services';
// import { LOGGER } from '../../../../config/logging';
import { prisma } from '../../../../prisma/prisma-client';
import { prismaLogsDb } from '../../../../prisma-logs/prisma-client';
import { PrismaTransaction } from '../../../../types';
import { PlanPropFlags, PlanProperties, SubscriptionProperties } from '../interfaces';
import _ from 'lodash';
import { startOfMonth, startOfDay } from 'date-fns';
import { PRISMA_ERROR_CODES } from '../../../utils/general';
import ApiError from '../../../utils/apiError';
import httpStatus from 'http-status';
import { UTCDate } from '@date-fns/utc';
import { crawlerAxiosInstance } from '../../../utils/lib';
import { config } from '../../../../config/config';
import { usageReporter } from './UsageReporter';
import { createLogger } from '../../../../config/logging-v2';
import redisConn from '../../../connections/redis.connection';
import { processUsageRecord, processTaskStatsRecord, calculateBillingCycleDates } from '../utils';
import { FREE_USERS_FREE_CREDITS, SUBS_ITEMS_TAGS } from '../../subscription/constants';
import { BigNumber } from 'bignumber.js';
import { sendEmailQuotaReached } from './quota-email';
import Stripe from 'stripe';

const LOGGER = createLogger('QuotaService');

interface SubsProperties {
  freeCredits?: number;
  [key: string]: any;
}

export const checkProdAiAgentsLimit = async (
  { teamId }: { teamId: string },
  options?: {
    tx?: PrismaTransaction;
  },
) => {
  const operations = async (tx: PrismaTransaction) => {
    const subs = await subscriptionService.getTeamSubs(teamId, { tx });

    const planLimits = (subs?.plan?.properties as PlanProperties)?.limits;
    const prodAiAgentLimit = _.isNil(planLimits?.prodAiAgents) ? Infinity : planLimits?.prodAiAgents;

    // get the number of agents that contain at least one deployment (an agent with 5 deployments counts as 1)
    const numOfAgentsDeployed = await prisma.aiAgent.count({
      where: {
        teamId,
        AiAgentDeployment: {
          some: {},
        },
      },
    });

    const quotaReached = numOfAgentsDeployed >= prodAiAgentLimit;

    return { quotaReached };
  };
  // const res = await prisma.$transaction(async tx => {});

  // const res = await (options.tx ? operations(options.tx) : prisma.$transaction(operations));
  let res;
  if (options?.tx) {
    res = await operations(options.tx);
  } else {
    res = await prisma.$transaction(operations);
  }

  return res;
};

export const checkDevAiAgentsLimit = async (
  { teamId }: { teamId: string },
  options?: {
    tx?: PrismaTransaction;
  },
) => {
  const operations = async (tx: PrismaTransaction) => {
    const subs = await subscriptionService.getTeamSubs(teamId, { tx });

    const planLimits = (subs?.plan?.properties as PlanProperties)?.limits;
    const devAiAgentLimit = _.isNil(planLimits?.devAiAgents) ? Infinity : planLimits?.devAiAgents;

    const devAiAgents = await aiAgentService.getTeamAgentsCount(teamId, { tx });
    const quotaReached = devAiAgents >= devAiAgentLimit;

    return {
      quotaReached,
    };
  };

  let res;
  if (options?.tx) {
    res = await operations(options.tx);
  } else {
    res = await prisma.$transaction(operations);
  }

  return res;
};

export const checkTeamMembersLimit = async (
  { teamId }: { teamId: string },
  options?: {
    tx?: PrismaTransaction;
  },
) => {
  const operations = async (tx: PrismaTransaction) => {
    const subs = await subscriptionService.getTeamSubs(teamId, { tx });

    const planLimits = (subs?.plan?.properties as PlanProperties)?.limits;
    const teamMembersLimit = _.isNil(planLimits?.teamMembers) ? Infinity : planLimits?.teamMembers;

    const teamMembers = await prisma.user.count({
      where: {
        // teamId,
        userTeamRole: {
          some: {
            sharedTeamRole: {
              teamId,
            },
          },
        },
      },
    });

    const quotaReached = teamMembers >= teamMembersLimit;
    LOGGER.warn(`teamMembers: ${teamMembers}, teamMembersLimit: ${teamMembersLimit}, quotaReached: ${quotaReached}`);

    return {
      quotaReached,
    };
  };

  let res;
  if (options?.tx) {
    res = await operations(options.tx);
  } else {
    res = await prisma.$transaction(operations);
  }

  return res;
};

export const checkSpacesLimit = async (
  { parentTeamId }: { parentTeamId: string },
  options?: {
    tx?: PrismaTransaction;
  },
) => {
  const operations = async (tx: PrismaTransaction) => {
    const subs = await subscriptionService.getTeamSubs(parentTeamId, { tx });
    const planLimits = (subs?.plan?.properties as PlanProperties)?.limits;
    const spacesLimit = _.isNil(planLimits?.spaces) ? 0 : planLimits?.spaces;

    const spacesCount = await prisma.team.count({
      where: {
        parentId: parentTeamId,
      },
    });
    const quotaReached = spacesCount >= spacesLimit;
    LOGGER.warn(`spacesCount: ${spacesCount}, spacesLimit: ${spacesLimit}, quotaReached: ${quotaReached}`);

    return {
      quotaReached,
    };
  };

  let res;
  if (options?.tx) {
    res = await operations(options.tx);
  } else {
    res = await prisma.$transaction(operations);
  }

  return res;
};

export const checkPlanFeatureFlagAccess = async (
  { teamId, featureFlag }: { teamId: string; featureFlag: keyof PlanPropFlags },
  options?: {
    tx?: PrismaTransaction;
  },
): Promise<{
  haveAccess: boolean;
}> => {
  const operations = async (tx: PrismaTransaction) => {
    const subs = await subscriptionService.getTeamSubs(teamId, { tx });

    const planProps = subs?.plan?.properties as PlanProperties;
    const featureFlags = planProps.flags;

    const haveAccess = featureFlags?.[featureFlag] || false;

    return {
      haveAccess,
    };
  };

  let res;
  if (options?.tx) {
    res = await operations(options.tx);
  } else {
    res = await prisma.$transaction(operations);
  }

  return res;
};

export const getTeamSubsQuotaUsage = async ({ teamId }: { teamId: string }) => {
  const operations = async (tx: PrismaTransaction) => {
    const subs = await subscriptionService.getTeamSubs(teamId, { tx });

    const subsProps = subs?.properties as SubscriptionProperties;
    const maxTasks = subsProps?.tasks || 0;

    const taskUsageAnchor = getCurrTaskUsageAnchor();

    // we currently get the usage from the Logs table by checking specific log types and syntax
    // const tasksUsage = await tx.aiAgentLog.count({
    //   where: {
    //     aiAgent: {
    //       teamId,
    //     },

    //     sourceId: {
    //       contains: '@', // this is the special key for identifying tasks
    //     },
    //     error: null,

    //     createdAt: {
    //       gte: taskUsageAnchor, // we count the usage from the start of the current month
    //       // gte: subs?.startDate,
    //       // lt: subs?.expiresAt,
    //     },
    //   },
    // });

    // get the tasks usage from the TasksStats table in the logs database
    const tasksUsageDetails = await prismaLogsDb.taskStats.aggregate({
      _sum: {
        number: true,
      },
      where: {
        teamId,
        day: {
          gte: taskUsageAnchor,
        },
      },
    });
    const tasksUsage = tasksUsageDetails._sum.number || 0;

    return {
      tasks: {
        max: maxTasks,
        used: tasksUsage,
      },
    };
  };

  return prisma.$transaction(operations, { timeout: 30_000 });
};

function getCurrTaskUsageAnchor() {
  // get the start of the current month (this is the anchor for the task usage calculation to all users)
  const startOfCurrentMonth = startOfMonth(new UTCDate());
  return startOfCurrentMonth;
}

// NEW M2M ENDPOINTS

export const consumeTeamTasksByAgentIdM2M = async ({ agentId, amount, day }: { agentId: string; amount: number; day: Date }) => {
  const startOfDayDate = startOfDay(new UTCDate(day)); // start of the day in UTC

  const agent = await prisma.aiAgent.findUniqueOrThrow({
    where: {
      id: agentId,
    },
    select: {
      teamId: true,
    },
  });

  // add the task to the TasksStats table in the logs database
  const exisitingDayTask = await prismaLogsDb.taskStats.findFirst({
    where: {
      agentId,
      day: startOfDayDate,
    },
  });

  let record;

  if (exisitingDayTask) {
    record = await prismaLogsDb.taskStats.update({
      where: {
        id: exisitingDayTask.id,
      },
      data: {
        number: { increment: amount },
      },

      select: {
        id: true,
        day: true,
        number: true,
        agentId: true,
      },
    });
  } else {
    record = await prismaLogsDb.taskStats.create({
      data: {
        agentId,
        day: startOfDayDate,
        number: amount,
        teamId: agent.teamId,
      },
      select: {
        id: true,
        day: true,
        number: true,
        agentId: true,
      },
    });
  }

  await usageReporter.handleTeamTasksUsage({ teamId: agent.teamId, tasks: amount, meterName: config.variables.STRIPE_METER_NAME }); // v3 payment logic

  return record;
};

export const getAgentTasksUsageByIdM2M = async ({ agentId }: { agentId: string }) => {
  const agent = await prisma.aiAgent.findUniqueOrThrow({
    where: {
      id: agentId,
    },
    select: {
      id: true,
      team: {
        select: {
          subscription: {
            select: {
              properties: true,
              plan: {
                select: {
                  isDefaultPlan: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const tasksUsageAnchor = getCurrTaskUsageAnchor();
  const isFreeUser = agent.team.subscription?.plan?.isDefaultPlan;
  const maxTasks = calcMaxTasks(agent.team.subscription?.properties as SubscriptionProperties);

  const tasksUsage = await prismaLogsDb.taskStats.groupBy({
    where: {
      agentId,
      day: {
        gte: tasksUsageAnchor,
      },
    },

    by: ['agentId'],

    _sum: {
      number: true,
    },
  });

  const tasks = tasksUsage[0]?._sum?.number || 0;

  return {
    tasks,
    maxTasks,
    isFreeUser,
  };
};

function calcMaxTasks(subsProps: SubscriptionProperties) {
  let maxTasks = subsProps?.tasks ?? 0;
  if (subsProps?.bonusTasks && !Number.isNaN(subsProps.bonusTasks)) {
    maxTasks += subsProps.bonusTasks;
  }

  return maxTasks;
}

export const getAgentTasksUsageWithinM2M = async ({ agentId, from, to }: { agentId: string; from?: string; to?: string }) => {
  await prisma.aiAgent
    .findUniqueOrThrow({
      where: {
        id: agentId,
      },
      select: {
        teamId: true,
      },
    })
    .catch(err => {
      if (err.code === PRISMA_ERROR_CODES.NON_EXISTENT_RECORD) throw new ApiError(httpStatus.NOT_FOUND, 'Agent not found');
    });

  const _from = new UTCDate(from).toISOString() || new UTCDate(0).toISOString();
  const _to = new UTCDate(to).toISOString() || new UTCDate().toISOString();

  const result = await prismaLogsDb.$queryRaw`SELECT YEAR(day) AS year,
  MONTH(day) AS month,
  SUM(number) as number,
  teamId, agentId
  FROM TaskStats
  where day >= ${_from} AND
  day <= ${_to} AND
  agentId = ${agentId}
  group by  YEAR(day), MONTH(day)`;

  return result;
};

export const getTeamTasksUsageByIdM2M = async ({ teamId }: { teamId: string }) => {
  const team = await prisma.team.findUniqueOrThrow({
    where: {
      id: teamId,
    },
    select: {
      id: true,
      subscription: {
        select: {
          properties: true,

          plan: {
            select: {
              isDefaultPlan: true,
            },
          },
        },
      },
    },
  });

  const tasksUsageAnchor = getCurrTaskUsageAnchor();
  const maxTasks = calcMaxTasks(team.subscription?.properties as SubscriptionProperties);
  const isFreeUser = team.subscription?.plan?.isDefaultPlan;

  const tasksUsage = await prismaLogsDb.taskStats.groupBy({
    where: {
      teamId: team.id,
      day: {
        gte: tasksUsageAnchor,
      },
    },

    by: ['teamId'],

    _sum: {
      number: true,
    },
  });

  const tasks = tasksUsage[0]?._sum?.number || 0;

  return {
    tasks,
    maxTasks,
    isFreeUser,
  };
};

export const getTeamTasksUsageWithinM2M = async ({ teamId, from, to }: { teamId: string; from?: string; to?: string }) => {
  await prisma.team.findUniqueOrThrow({
    where: {
      id: teamId,
    },
    select: { id: true },
  });

  const _from = new UTCDate(from).toISOString() || new UTCDate(0).toISOString();
  const _to = new UTCDate(to).toISOString() || new UTCDate().toISOString();

  const result = await prismaLogsDb.$queryRaw`SELECT YEAR(day) AS year,
  MONTH(day) AS month,
  SUM(number) as number,
  teamId, agentId
  FROM TaskStats
  where day >= ${_from} AND
  day <= ${_to} AND
  teamId = ${teamId}
  group by  YEAR(day), MONTH(day)`;

  return result;
};

export const getTeamFeaturesQuotaUsage = async ({ parentTeamId, currTeamId }: { parentTeamId: string; currTeamId: string }) => {
  const team = await prisma.team.findUniqueOrThrow({
    where: {
      id: parentTeamId,
    },

    select: {
      subTeams: {
        select: {
          id: true,
        },
      },
    },
  });

  const allTeamsIds = [parentTeamId, ...team.subTeams.map(subTeam => subTeam.id)];

  const dataPools = (
    await crawlerAxiosInstance.get(`/usage/teams?index=${config.variables.PINECONE_DEFAULT_INDEX_NAME}&teams=${allTeamsIds.join(',')}`)
  ).data?.summary;

  const numOfAgentsDeployed = await prisma.aiAgent.count({
    where: {
      teamId: currTeamId,
      AiAgentDeployment: {
        some: {},
      },
    },
  });

  return {
    dataPools,
    activeAgents: numOfAgentsDeployed,
  };
};

export const getTotalUsageForBillingCycle = async (teamId: string, subsWithObject?: any) => {
  const [subs, team] = await Promise.all([
    subsWithObject ? Promise.resolve(subsWithObject) : subscriptionService.getTeamSubs(teamId, {}, true),
    prisma.team.findUnique({
      where: { id: teamId },
      select: { parentId: true },
    }),
  ]);

  if (!team) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Team not found');
  }

  // Process subscription data
  const planCredits = (subs?.properties as SubsProperties)?.freeCredits
    ? parseFloat((subs?.properties as any)?.freeCredits || '0')
    : subs.plan.isDefaultPlan
    ? FREE_USERS_FREE_CREDITS
    : 0;
  const planName = subs.plan.name;

  let cycleStart: Date;
  let cycleEnd: Date;

  const stripeObj = subs?.object as Stripe.Subscription;
  if (stripeObj) {
    cycleStart = new Date(stripeObj.current_period_start * 1000);
    cycleEnd = new Date(stripeObj.current_period_end * 1000);
  } else {
    // in case the plan is not linked to stripe, we count metered-billing for the current month only
    const subsStartDate = new Date(subs.startDate).getUTCDate();
    const now = new Date();
    const { start, end } = calculateBillingCycleDates(now, subsStartDate);
    cycleStart = new Date(start);
    cycleEnd = new Date(end);
  }

  LOGGER.info(`Fetching usage from ${cycleStart.toISOString()} to ${cycleEnd.toISOString()}`);

  // Get all relevant team IDs (parent team and subteams)
  const parentTeamId = team.parentId || teamId;
  const allTeams = await prisma.team.findMany({
    where: {
      OR: [{ id: parentTeamId }, { parentId: parentTeamId }],
    },
    select: { id: true },
  });

  const teamIds = allTeams.map(team => team.id);

  // Query usage data
  const totalUsage = await prismaLogsDb.usage.aggregate({
    where: {
      teamId: { in: teamIds },
      day: {
        gte: cycleStart,
        lt: cycleEnd,
      },
    },
    _sum: {
      multipliedCost: true,
    },
  });

  // overage means the usage that is beyond the free credits
  const overage = Math.max(0, totalUsage._sum.multipliedCost - planCredits);

  // Prepare result
  const result = {
    planName,
    billingCycleStartAt: cycleStart.toISOString(),
    billingCycleEndAt: cycleEnd.toISOString(),
    usage: totalUsage._sum.multipliedCost || 0,
    overage,
    freeCredits: planCredits,
  };

  return result;
};

export const trackLLMTokensAndApiRequestsUsage = async ({
  date,
  units,
  class: usageClass,
  agentId,
  teamId,
  sourceId,
  userKey,
}: {
  date?: Date;
  units: number;
  class: string;
  agentId: string;
  teamId: string;
  sourceId: string;
  userKey: boolean;
}) => {
  // check if team exists in the db
  const team = await prisma.team.findUnique({
    where: {
      id: teamId,
    },
    select: {
      subscription: {
        select: {
          properties: true,
        },
      },
    },
  });

  if (!team) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Team not found');
  }

  // check if agent belongs to the team
  const agent = await prisma.aiAgent.findUnique({
    where: {
      id: agentId,
    },
  });

  if (!agent) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Agent not found');
  }

  if (agent.teamId !== teamId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Agent does not belong to the team');
  }

  // Normalize date to remove time component
  const normalizedDay = date ? new Date(new Date(date).setUTCHours(0, 0, 0, 0)) : new Date();

  let cost = 0;
  let multipliedCost = 0;

  if (!userKey) {
    let costRecord: any = await redisConn.get(`smyth:costs_table:${sourceId}/${usageClass}`);
    if (costRecord) {
      costRecord = JSON.parse(costRecord);
    } else {
      costRecord = await prismaLogsDb.costs.findFirst({
        where: { sourceId: `${sourceId}/${usageClass}` },
        select: { unitCost: true },
      });
      await redisConn.set(`smyth:costs_table:${sourceId}/${usageClass}`, JSON.stringify(costRecord), 'EX', 5 * 60); // 5 minutes
    }

    if (!costRecord) {
      LOGGER.error(`No cost configuration found for: ${sourceId}/${usageClass}`);
      throw new ApiError(httpStatus.NOT_FOUND, `No cost configuration found for: ${sourceId}/${usageClass}`);
    }

    if (costRecord.unitCost === 0) {
      LOGGER.warn(`Received cost event with sourceId=${sourceId} but unit cost for this source is Zero`);
    }
    const subs = await subscriptionService.getTeamSubs(teamId, {}, true);
    const planProperties: any = subs.plan.properties;

    // cost = (units / 1000000) * costRecord.unitCost;
    cost = new BigNumber(units).dividedBy(1_000_000).multipliedBy(costRecord.unitCost).toNumber();

    const multiplier = planProperties?.flags?.modelCostMultiplier ?? 1;
    // multipliedCost = cost * multiplier;
    multipliedCost = new BigNumber(cost).multipliedBy(multiplier).toNumber();

    if ('modelCostMultiplier' in (planProperties?.flags || {}) && costRecord.unitCost > 0) {
      const totalUsage = await getTotalUsageForBillingCycle(teamId, subs);
      const freeCredits = (subs?.properties as any)?.freeCredits
        ? parseFloat((subs?.properties as any)?.freeCredits || '0')
        : subs.plan.isDefaultPlan
        ? FREE_USERS_FREE_CREDITS
        : 0;

      sendEmailQuotaReached(
        teamId,
        totalUsage.planName || '',
        totalUsage.usage + multipliedCost || 0,
        freeCredits,
        totalUsage.billingCycleStartAt,
        totalUsage.billingCycleEndAt,
      ).catch(error => {
        LOGGER.error(`sendEmailQuotaReached: Error sending email quota reached: ${error}`);
      });

      if (totalUsage.usage + multipliedCost > freeCredits) {
        /* 
          for example if the total usage cost from usage table is 10 and the current usage is 2
          and the free credits are 11 now for reporting we only need to report 1 that why this if 
          condition is added it will report the usage to stripe only for the amount that is beyond 
          the free credits 

          1) If user is under the free credits limit, only the excess amount is reported
          2) If user already over the free credits limit, the full new usage is reported
        */
        let reportUsageCostDollar = 0;

        if (totalUsage.usage < freeCredits) {
          reportUsageCostDollar = new BigNumber(totalUsage.usage).plus(multipliedCost).minus(freeCredits).toNumber();
        } else {
          reportUsageCostDollar = multipliedCost;
        }

        /*
         * Metered Usage Reporting to Stripe Logic (IMPORTANT):
         * we report to Stripe the cost per transform_quantity.divide_by (1 million in v4) and by the end of the billing cycle, Stripe will divide all usage by the divide_by (1 million in v4)
         */
        const usageSubsItem = subs.object?.items?.data?.filter(item => item.price.metadata?.for === SUBS_ITEMS_TAGS.TASKS_USAGE)[0];
        if (usageSubsItem) {
          const meterUnitPrice = new BigNumber(usageSubsItem?.price?.unit_amount_decimal).dividedBy(100).toNumber(); // convert to dollars
          const transformQuantity = usageSubsItem?.price?.transform_quantity;
          const transformedCost = new BigNumber(reportUsageCostDollar).multipliedBy(transformQuantity?.divide_by ?? 1).toNumber();
          //! should we really round it?!! the main purpose of rounding was to avoid precision issues but now we are using BigNumber so it should be fine
          const unitsToReport = Math.round(new BigNumber(transformedCost).dividedBy(meterUnitPrice).toNumber()); // we divide by unit price in case it was not 1$ per unit
          LOGGER.info(`Reporting usage cost for teamId: ${teamId}, units: ${unitsToReport}. Net cost: ${reportUsageCostDollar}`);
          usageReporter.handleTeamTasksUsage({
            teamId,
            tasks: unitsToReport,
            flushThreshold: 25_000_000, // 25M unit = 100 (cents) * (transform_quantity.divide_by - 1M) / 4 = 0.25$
            meterName: config.variables.STRIPE_V4_MODAL_USAGE_METER_NAME,
          });
        } else {
          LOGGER.warn(`Usage subs item not found for subs id: ${subs.id} plan name: ${subs.plan?.name}!! Not reporting usage to Stripe`);
        }
      }
    }
  }

  // Try to update existing record
  const updated = await prismaLogsDb.usage.updateMany({
    where: {
      day: normalizedDay,
      class: usageClass,
      agentId,
      sourceId,
      userKey,
    },
    data: {
      units: { increment: units },
      cost: { increment: cost },
      multipliedCost: { increment: multipliedCost },
      updatedAt: new Date(),
    },
  });

  const usageData = {
    day: normalizedDay,
    units,
    class: usageClass,
    agentId,
    teamId,
    sourceId,
    cost,
    multipliedCost,
    userKey,
  };

  // If no record was updated, create a new one
  if (updated.count === 0) {
    await prismaLogsDb.usage.create({ data: usageData });
  }

  LOGGER.info('Usage tracked successfully', usageData);

  return {
    message: 'Usage tracked successfully',
    data: usageData,
  };
};

export const cacheMonthlyLLMTokensAndApiRequestsUsage = async (date = null, teamId = null, keyType: 'usage' | 'taskstats' = 'usage') => {
  const currentDate = new Date();

  // Determine target dates (last 3 months or specific date)
  const targetDates = date
    ? [new Date(date)]
    : [
        new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1), // Two months ago
        new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1), // Last month
        new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), // Current month
      ];

  const finalUsageData = {};

  for (const targetDate of targetDates) {
    const month = targetDate.getMonth() + 1;
    const year = targetDate.getFullYear();
    const teamUsage = {};

    let data;
    if (keyType === 'usage') {
      data = await prismaLogsDb.usage.groupBy({
        by: ['teamId', 'day', 'agentId', 'sourceId', 'class'],
        where: {
          day: {
            gte: new Date(year, month - 1, 1),
            lt: new Date(year, month, 1),
          },
          userKey: false,
          ...(teamId ? { teamId } : {}),
        },
        _sum: {
          units: true,
          multipliedCost: true,
        },
      });

      // Process usage data
      data.forEach(record => {
        processUsageRecord(teamUsage, record);
      });
    } else {
      // Handle taskstats
      data = await prismaLogsDb.taskStats.groupBy({
        by: ['teamId', 'day', 'agentId'],
        where: {
          day: {
            gte: new Date(year, month - 1, 1),
            lt: new Date(year, month, 1),
          },
          ...(teamId ? { teamId } : {}),
        },
        _sum: {
          number: true,
        },
      });

      // Process taskstats data
      data.forEach(record => {
        processTaskStatsRecord(teamUsage, record);
      });
    }

    // Cache the results
    for (const [teamId, usage] of Object.entries(teamUsage)) {
      const cacheKey = `smyth:${keyType}:${teamId}:${month}-${year}`;
      await redisConn.set(cacheKey, JSON.stringify(usage), 'EX', 30 * 24 * 60 * 60);

      if (!finalUsageData[teamId]) {
        finalUsageData[teamId] = {};
      }
      finalUsageData[teamId][`${month}-${year}`] = usage;
    }
  }

  return finalUsageData;
};

export const getMonthlyLLMTokensAndApiRequestsUsage = async ({ teamId, date }) => {
  const team = await prisma.team.findUnique({
    where: {
      id: teamId,
    },
    select: {
      id: true,
      parentId: true,
      name: true,
    },
  });

  if (!team) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Team not found');
  }

  const subs = await subscriptionService.getTeamSubs(teamId);
  const planProperties: any = subs.plan.properties;
  const keyType = planProperties?.flags?.modelCostMultiplier ? 'usage' : 'taskstats';

  // If parentId is null, fetch all child teams. Otherwise, only use the current team
  const allTeams =
    team.parentId === null
      ? [
          { id: teamId, name: team.name },
          ...(await prisma.team.findMany({
            where: { parentId: teamId },
            select: { id: true, name: true },
          })),
        ]
      : [{ id: teamId, name: team.name }];

  const agentsListPromise = allTeams.map(async team =>
    aiAgentService.getTeamAgents({
      teamId: team.id,
    }),
  );

  const targetDate = date ? new Date(date) : new Date();
  const month = targetDate.getMonth() + 1; // Convert 0-based month to 1-based
  const year = targetDate.getFullYear();

  // Generate cache keys for all team IDs
  const cacheKeys = allTeams.map(team => `smyth:${keyType}:${team.id}:${month}-${year}`);

  // Fetch data from Redis for all team IDs
  const dataPromises = cacheKeys.map(async (key, index) => {
    const cachedData = await redisConn.get(key);
    const currentTeam = allTeams[index];

    if (cachedData) {
      return {
        teamId: currentTeam.id,
        teamName: currentTeam.name,
        data: JSON.parse(cachedData),
      };
    }

    // Cache miss, log and re-cache
    LOGGER.info(`Cache miss for teamId: ${currentTeam.id}, keyType: ${keyType}, month: ${month}-${year}`);
    const usage = await cacheMonthlyLLMTokensAndApiRequestsUsage(date, currentTeam.id, keyType);

    // Extract the correct data format from the nested structure
    const formattedData = usage[currentTeam.id]?.[`${month}-${year}`] || (keyType === 'usage' ? { days: {}, costs: {} } : { days: {} });

    return {
      teamId: currentTeam.id,
      teamName: currentTeam.name,
      data: formattedData,
    };
  });

  // Wait for all promises to resolve
  const teamDataArray = await Promise.all(dataPromises);
  const agentsList = await Promise.all(agentsListPromise);

  return { analytics: teamDataArray, agents: agentsList };
};
