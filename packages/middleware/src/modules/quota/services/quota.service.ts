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
import { createLogger } from '../../../../config/logging-v2';

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
