/* eslint-disable no-nested-ternary */
/* eslint-disable no-param-reassign */
/* eslint-disable no-unsafe-optional-chaining */
import httpStatus from 'http-status';
import { prisma } from '../../../../prisma/prisma-client';
import ApiError from '../../../utils/apiError';
import { PrismaTransaction } from '../../../../types';
import { AiAgentSettings, AiAgentState } from '../../../utils/models';
import crypto from 'crypto';
import { PRISMA_ERROR_CODES, includePagination } from '../../../utils/general';
import { quotaService } from '../../quota/services';
import errKeys from '../../../utils/errorKeys';
import { createLogger } from '../../../../config/logging-v2';

const logger = createLogger('ai-agent-service');

const AGENT_LOCK_THRESHOLDS = {
  DISCONNECTED: 20 * 1000, // 30 seconds
  STALE_LOCK: 10 * 60 * 1000, // 10 minutes
};

export const getAllAiAgents = async ({
  teamId,
  include,
  pagination,
  sort,
  options,
  searchTerm,
}: {
  teamId: string | undefined;
  include?: {
    includeSettings?: boolean;
    contributors?: boolean;
    agentActivity?: boolean;
  };
  pagination?: {
    page?: number;
    limit?: number;
  };

  sort?: {
    field?: string;
    order?: string;
  };

  searchTerm?: string;

  options?: {
    tx?: PrismaTransaction;
  };
}) => {
  const _p = options?.tx || prisma;
  const isSearching = !!searchTerm;

  const searchWhereClause = {
    OR: [
      {
        name: {
          contains: searchTerm,
        },
      },
      {
        description: {
          contains: searchTerm,
        },
      },
    ],
  };

  if (sort?.field && !['createdAt', 'updatedAt', 'name'].includes(sort?.field)) {
    sort = undefined;
  }

  if (sort?.order && !['asc', 'desc'].includes(sort?.order)) {
    sort = undefined;
  }

  let agents: any = await _p.aiAgent.findMany({
    where: {
      team: {
        id: teamId,
      },
      ...(isSearching && searchWhereClause),
    },

    orderBy: {
      ...(sort?.field && {
        [sort.field]: sort.order ?? 'asc',
      }),
    },

    ...includePagination(pagination),

    select: {
      id: true,
      name: true,
      description: true,
      aiAgentSettings: include?.includeSettings,
      ...(include?.contributors === true && {
        contributors: {
          select: {
            isCreator: true,
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                email: true,
              },
            },
          },
        },
      }),
      createdAt: true,
      updatedAt: true,
      ...(include?.agentActivity === true && {
        changeActivity: {
          select: {
            name: true,
            type: true,
            createdAt: true,
            user: {
              select: {
                name: true,
                avatar: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      }),

      domain: {
        select: {
          name: true,
          id: true,
          verified: true,
          lastStatus: true,
        },
      },

      lastLockBeat: true,
      lastLockSaveOperation: true,
      lockId: true,
      lockAt: true,

      _count: {
        select: {
          AiAgentDeployment: true,
        },
      },
    },
  });

  const total = await _p.aiAgent.count({
    where: {
      teamId,
      ...(isSearching && searchWhereClause),
    },
  });

  agents = agents.map((agent: any) => {
    // exclude the lockId from the response
    const { lockId, lastLockBeat, lastLockSaveOperation, ...rest } = agent;
    return {
      ...rest,
      isLocked: agentHasValidLock(agent.lastLockBeat, agent.lastLockSaveOperation, agent.lockId),
    };
  });

  return {
    agents,
    total,
  };
};

export const saveAgent = async ({
  data,
  teamId,
  userId,
  lockId,
  spaceId,
  aiAgentId,
  parentTeamId,
}: {
  teamId: string;
  userId: number;
  lockId?: string;
  spaceId?: string;
  aiAgentId: string | undefined;
  parentTeamId: string;
  data: { name: string; json: { [key: string]: any }; description?: string; teamId?: string };
}) => {
  if (data.json) {
    data.json.teamId = teamId; // sanity check to make sure teamId of the agent is the same as the teamId of the user
    data.json.parentTeamId = parentTeamId;
  }

  if (!aiAgentId) {
    // create new agent
    const newAgent = await createNewAgent({
      userId,
      teamId,
      name: data.name,
      data: data.json,
      spaceId: spaceId ?? null,
      description: data.description,
    });

    return newAgent;
  }

  const runOperations = async (tx: PrismaTransaction) => {
    const agent = await tx.aiAgent.findFirst({
      where: {
        id: aiAgentId,
        teamId,
      },
      select: {
        id: true,
        teamId: true,

        lockId: true,
      },
    });

    if (!agent) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Agent does not exist');
    }

    if (agent.lockId !== lockId) {
      throw new ApiError(httpStatus.CONFLICT, 'Invalid lock id');
    }

    // update existing agent
    const updated = await tx.aiAgent.update({
      where: {
        id: aiAgentId,
      },
      data: {
        name: data.name,
        description: data.description,

        //* LOCKS updates
        lastLockSaveOperation: new Date(),
        lastLockBeat: new Date(), // a save operation is considered a beat as well

        aiAgentData: {
          update: {
            data: data.json,
          },
        },

        contributors: {
          upsert: {
            where: {
              userId_aiAgentId: {
                aiAgentId,
                userId,
              },
            },
            update: {},
            create: {
              user: {
                connect: {
                  id: userId,
                },
              },
            },
          },
        },
      },

      select: {
        id: true,
        name: true,
      },
    });

    return updated;
  };

  const updatedAgent = await prisma.$transaction(runOperations, {
    timeout: 30_000,
  });

  return updatedAgent;
};

export const createNewAgent = async ({
  name,
  teamId,
  data,
  userId,
  description,
  spaceId = null,
}: {
  name: string;
  teamId: string;
  data: object;
  userId: number;
  description?: string;
  spaceId: string | null;
}) => {
  const agent = await prisma.$transaction(async tx => {
    const { quotaReached } = await quotaService.checkDevAiAgentsLimit({ teamId }, { tx });
    if (quotaReached) {
      throw new ApiError(httpStatus.FORBIDDEN, 'You have reached the maximum number of agents', errKeys.QUOTA_EXCEEDED);
    }

    const spaceConnection = {
      space: {
        connect: {
          id: spaceId,
        },
      },
    };

    const _agent = await tx.aiAgent.create({
      data: {
        name,
        description,
        aiAgentData: {
          create: {
            data,
          },
        },

        team: {
          connect: {
            id: teamId,
          },
        },

        ...(spaceId ? spaceConnection : {}),

        contributors: {
          create: {
            user: {
              connect: {
                id: userId,
              },
            },
            isCreator: true,
          },
        },

        changeActivity: {
          create: {
            name: 'Agent created',
            type: 'agent_created',
            user: {
              connect: {
                id: userId,
              },
            },
          },
        },
      },

      select: {
        id: true,
        name: true,
      },
    });

    return _agent;
  });

  return agent;
};

export const getAgentById = async (
  aiAgentId: string,
  teamId: string | undefined,
  options: {
    anonymous?: boolean;
    include?: string[];
  },
) => {
  if (!options.anonymous && !teamId) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Internal error');
  }

  const agent = await prisma.aiAgent.findFirst({
    where: {
      id: aiAgentId,
      ...(options.anonymous === true ? {} : { teamId }),
    },

    select: {
      aiAgentData: {
        select: {
          data: true,
        },
      },
      name: true,
      updatedAt: true,
      description: true,

      domain: {
        select: {
          name: true,
          id: true,
          verified: true,
          lastStatus: true,
        },
      },

      ...(options.include?.includes('team.subscription')
        ? {
            team: {
              select: {
                name: true,
                id: true,
                parentId: true,
                subscription: {
                  select: {
                    id: true,
                    properties: true,
                  },
                },
              },
            },
          }
        : {}),

      _count: {
        select: {
          AiAgentDeployment: true,
        },
      },

      lastLockBeat: true,
      lastLockSaveOperation: true,
      lockId: true,
      lockedByName: true,
    },
  });

  if (!agent) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Agent not found');
  }

  const { name, updatedAt, aiAgentData, domain, lockId, lastLockBeat, lastLockSaveOperation, ...rest } = agent;
  const isLocked = agentHasValidLock(agent.lastLockBeat, agent.lastLockSaveOperation, agent.lockId);

  return {
    name,
    updatedAt,
    data: aiAgentData?.data,
    domain: agent.domain,
    isLocked,
    ...rest,
  };
};

export const getTeamAgentsCount = async (
  teamId: string,
  options?: {
    tx?: PrismaTransaction;
  },
) => {
  const _p = options?.tx || prisma;
  const count = await _p.aiAgent.count({
    where: {
      teamId,
    },
  });

  return count;
};

export const _getAgentWithSaltById = async (
  aiAgentId: string,
  {
    include,
  }: {
    include?: string[];
  },
) => {
  const agent = await prisma.aiAgent.findFirst({
    where: {
      id: aiAgentId,
    },

    select: {
      aiAgentData: {
        select: {
          data: true,
        },
      },

      ...(include?.includes('team.subscription')
        ? {
            team: {
              select: {
                subscription: {
                  select: {
                    id: true,
                    properties: true,

                    plan: {
                      select: {
                        name: true,
                        id: true,
                        properties: true,
                        isDefaultPlan: true,
                      },
                    },
                  },
                },
              },
            },
          }
        : {}),

      name: true,
      updatedAt: true,
      salt: true,
      teamId: true,

      lastLockBeat: true,
      lastLockSaveOperation: true,
      lockId: true,
      lockedByName: true,
    },
  });

  if (!agent) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Agent not found');
  }

  const isLocked = agentHasValidLock(agent.lastLockBeat, agent.lastLockSaveOperation, agent.lockId, {
    skipStaleCheck: true,
  });
  const { aiAgentData, ...rest } = agent;

  const agentData = (aiAgentData?.data || {}) as { [key: string]: any };
  // make sure the teamId is set in the aiagentData.data
  agentData.teamId = agent.teamId;

  return {
    data: agentData,
    isLocked,
    ...rest,
  };
};

export const deleteAgent = async (id: string, teamId: string) => {
  // check if the agent is locked (being edited by another user)

  const agent = await prisma.aiAgent.findFirst({
    where: {
      id,
      teamId,
    },
    select: {
      id: true,
      lockId: true,
      lastLockBeat: true,
      lastLockSaveOperation: true,
    },
  });

  if (!agent) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Agent not found');
  }

  //* for now bypass the lock check
  // if (agentHasValidLock(agent?.lastLockBeat, agent?.lastLockSaveOperation, agent?.lockId)) {
  //   throw new ApiError(httpStatus.CONFLICT, 'Agent is locked');
  // }

  await prisma.aiAgent.delete({
    where: {
      id,
      teamId,
    },
  });

  return agent;
};

export const accquireAgentLock = async ({ aiAgentId, teamId, userId }: { aiAgentId: string; teamId: string; userId: number }) => {
  /*
  ALL OPERATIONS MUST BE ATOMIC

  Scenario 1: Agent is not locked
  Scenario 2: Agent is already locked by another user

  #Scenario 1 Solution:
  1. Create a new lock
  2. Return the lock (with its id)


  #Scenario 2 Solution:
  1. Check if the lock is expired (lastLockBeat + 1 minute < now [DISCONNECTED] OR lastLockSaveOperation + 10 minutes < now [STALE LOCK])
  2. If the lock is expired, update the lock with the new user
  3. Return the lock (with its id)

  */

  const runOperations = async (tx: PrismaTransaction) => {
    const agent = await tx.aiAgent.findFirst({
      where: {
        id: aiAgentId,
        teamId,
      },
      select: {
        id: true,
        name: true,
        lockId: true,
        lastLockBeat: true,
        lastLockSaveOperation: true,
      },
    });

    const caller = await tx.user.findUniqueOrThrow({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!agent) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Agent not found');
    }

    if (!agent.lockId || !agent.lastLockBeat || !agent.lastLockSaveOperation) {
      // Scenario 1
      const agentWithLock = await tx.aiAgent.update({
        where: {
          id: aiAgentId,
        },

        data: {
          lockId: crypto.randomBytes(16).toString('hex'),
          lockAt: new Date(),
          lockedByName: caller?.name,
          lastLockBeat: new Date(),
          lastLockSaveOperation: new Date(), // this is the first time we are saving the lock
        },

        select: {
          lockAt: true,
          lockId: true,
        },
      });

      logger.info(`A new agent lock accquired for agent ${aiAgentId} because there was no current lock`);

      return {
        id: agentWithLock.lockId,
        timestamp: agentWithLock.lockAt,
      };
    }

    // Scenario 2

    if (!agentHasValidLock(agent.lastLockBeat, agent.lastLockSaveOperation, agent.lockId)) {
      // release the lock
      const agentWithLock = await tx.aiAgent.update({
        where: {
          id: aiAgentId,
        },

        data: {
          lockId: crypto.randomBytes(16).toString('hex'),
          lockAt: new Date(),
          lockedByName: caller?.name ?? 'Unknown',
          lastLockBeat: new Date(),
          lastLockSaveOperation: new Date(), // this is the first time we are saving the lock
        },

        select: {
          lockAt: true,
          lockId: true,
        },
      });

      logger.info(
        `A new agent lock accquired for agent ${aiAgentId} because the current agent lock was expired and another accquire lock req was called  `,
      );

      return {
        id: agentWithLock.lockId,
        timestamp: agentWithLock.lockAt,
      };
    }

    // lock is still valid
    logger.info(`Failed to accquire agent lock for agent ${aiAgentId} because the current lock is still valid`);
    throw new ApiError(httpStatus.CONFLICT, 'Agent is locked', errKeys.AGENT_LOCK_FAIL);
  };

  try {
    const lock = await prisma.$transaction(runOperations);

    return lock;
  } catch (error: any) {
    if (error?.isApiError) {
      throw error;
    }
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to acquire agent lock', errKeys.AGENT_LOCK_FAIL);
  }
};

export const releaseAgentLock = async ({ aiAgentId, teamId, lockId }: { aiAgentId: string; teamId: string; lockId: string }) => {
  const runOperations = async (tx: PrismaTransaction) => {
    const agent = await tx.aiAgent.findFirst({
      where: {
        id: aiAgentId,
        teamId,
      },
      select: {
        id: true,
        lockId: true,
      },
    });

    if (!agent) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Agent not found');
    }

    if (!agent.lockId) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Agent is not locked');
    }

    if (agent.lockId !== lockId) {
      throw new ApiError(httpStatus.CONFLICT, 'Invalid lock id');
    }

    const released = await tx.aiAgent.update({
      where: {
        id: aiAgentId,
      },
      data: {
        lockId: null,
        lockAt: null,
        lockedByName: null,
        lastLockBeat: null,
        lastLockSaveOperation: null,
      },

      select: null,
    });

    return released;
  };

  try {
    await prisma.$transaction(runOperations);
  } catch (error: any) {
    if (error?.isApiError) {
      throw error;
    }

    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to release agent lock');
  }
};

export const beatAgentLock = async ({ aiAgentId, teamId, lockId }: { aiAgentId: string; teamId: string; lockId: string }) => {
  try {
    const updated = await prisma.aiAgent.update({
      where: {
        id: aiAgentId,
        teamId,
        lockId,
      },
      data: {
        lastLockBeat: new Date(),
      },

      select: null,
    });

    return updated;
  } catch (error: any) {
    console.log('error', error);
    if (error?.code === PRISMA_ERROR_CODES.NON_EXISTENT_RECORD) {
      throw new ApiError(httpStatus.NOT_FOUND, 'The specified agent was not found or the provided lock ID is invalid.', errKeys.AGENT_LOCK_FAIL);
    }
    throw new ApiError(httpStatus.BAD_REQUEST, error.message ?? 'Unable to update agent lock status', errKeys.AGENT_LOCK_FAIL);
  }
};

export const getAgentLockStatus = async ({ aiAgentId, teamId }: { aiAgentId: string; teamId: string }) => {
  const agent = await prisma.aiAgent.findFirst({
    where: {
      id: aiAgentId,
      teamId,
    },
    select: {
      id: true,
      lockId: true,
      lastLockBeat: true,
      lastLockSaveOperation: true,
    },
  });

  if (!agent) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Agent not found');
  }

  const isLocked = agentHasValidLock(agent.lastLockBeat, agent.lastLockSaveOperation, agent.lockId);

  return {
    isLocked,
  };
};

function agentHasValidLock(
  lastBeat: Date | null | undefined,
  lastSave: Date | null | undefined,
  lockId: string | null | undefined,
  options?: {
    skipStaleCheck?: boolean;
  },
) {
  if (!lastBeat || !lastSave || !lockId) {
    return false;
  }
  const now = new Date();
  const lastBeatThreshold = new Date(lastBeat.getTime() + AGENT_LOCK_THRESHOLDS.DISCONNECTED);
  const lastSaveThreshold = new Date(lastSave.getTime() + AGENT_LOCK_THRESHOLDS.STALE_LOCK);

  return now < lastBeatThreshold && lockId !== null && (options?.skipStaleCheck || now < lastSaveThreshold);
}

export const checkAgentExistsOrThrow = async (
  aiAgentId: string,
  teamId: string | undefined | null,
  options?: {
    anonymous?: boolean;
    tx?: PrismaTransaction;
  },
) => {
  // eslint-disable-next-line no-underscore-dangle
  const _prisma = options?.tx ? options.tx : prisma;
  const agent = await _prisma.aiAgent.findFirst({
    where: {
      id: aiAgentId,
      ...(options?.anonymous === true ? {} : { teamId }),
    },
    select: {
      id: true,
      teamId: true,
    },
  });

  if (!agent) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Agent does not exist');
  }

  return agent;
};

// M2M call
export const getAgentByDomain = async (domain: string) => {
  const domainQuery = await prisma.domain.findFirst({
    where: {
      name: domain,
    },
    select: {
      name: true,
      aiAgent: true,
    },
  });

  if (!domainQuery) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Domain not found');
  }

  const agent = domainQuery?.aiAgent;

  if (!agent) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Agent not found');
  }

  return agent;
};

// M2M: AGENT states
export async function getStates(aiAgentId: string): Promise<AiAgentState[]> {
  return prisma.aiAgentState.findMany({ where: { aiAgentId } });
}

export async function createState(agentId: string, key: string, value: string): Promise<AiAgentState> {
  const existingState = await prisma.aiAgentState.findFirst({
    where: {
      key,
      aiAgentId: agentId,
    },
  });

  if (existingState) {
    return prisma.aiAgentState.update({
      where: {
        id: existingState.id,
      },
      data: {
        value,
      },
    });
  }

  return prisma.aiAgentState.create({
    data: {
      aiAgent: { connect: { id: agentId } },
      key,
      value,
    },
  });
}

export async function getState(agentId: string, stateKey: string): Promise<AiAgentState> {
  const setting = await prisma.aiAgentState.findFirst({
    where: {
      key: stateKey,
      aiAgentId: agentId,
    },
  });

  if (!setting) {
    throw new ApiError(404, 'State not found');
  }

  return setting;
}

export async function deleteState(agentId: string, stateKey: string) {
  const aiAgentState = await prisma.aiAgentState.findFirst({
    where: {
      aiAgentId: agentId,
      key: stateKey,
    },

    select: {
      key: true,
      id: true,
    },
  });

  if (!aiAgentState) {
    throw new ApiError(404, 'State not found');
  }

  const deleted = await prisma.aiAgentState.delete({
    where: {
      id: aiAgentState.id,
    },
  });

  return deleted;
}

// AGENT settings
export async function getAgentSettings(
  aiAgentId: string,
  teamId: string | undefined | null,
  options?: {
    anonymous?: boolean;
  },
): Promise<AiAgentSettings[]> {
  return prisma.aiAgentSettings.findMany({
    where: {
      aiAgent: {
        id: aiAgentId,
        ...(options?.anonymous === true ? {} : { teamId }),
      },
    },
  });
}

export async function createAgentSetting(aiAgentId: string, key: string, value: string, teamId: string): Promise<AiAgentSettings> {
  const existingSetting = await prisma.aiAgentSettings.findFirst({
    where: {
      key,
      aiAgent: {
        id: aiAgentId,
        teamId,
      },
    },
  });

  if (existingSetting) {
    return prisma.aiAgentSettings.update({
      where: {
        id: existingSetting.id,
      },
      data: {
        value,
      },
    });
  }

  return prisma.aiAgentSettings.create({
    data: {
      aiAgent: { connect: { id: aiAgentId } },
      key,
      value,
    },
  });
}

export async function getAgentSetting(aiAgentId: string, key: string, teamId: string): Promise<AiAgentSettings> {
  const setting = await prisma.aiAgentSettings.findFirst({
    where: {
      key,
      aiAgent: {
        id: aiAgentId,
        teamId,
      },
    },
  });

  if (!setting) {
    throw new ApiError(404, 'Setting not found');
  }

  return setting;
}

export async function deleteAgentSetting(aiAgentId: string, key: string, teamId: string) {
  const setting = await prisma.aiAgentSettings.findFirst({
    where: {
      key,
      aiAgent: {
        id: aiAgentId,
        teamId,
      },
    },
    select: {
      key: true,
      id: true,
    },
  });

  if (!setting) {
    throw new ApiError(404, 'Setting not found');
  }

  const deleted = await prisma.aiAgentSettings.delete({
    where: {
      id: setting.id,
      key,
    },
  });

  return deleted;
}

export const getAgentCallLogs = async ({
  teamId,
  aiAgentId,
  where,
  pagination,
}: {
  teamId: string;
  aiAgentId: string;
  where?: {
    sourceId?: string;
    componentId?: string;
    inputDateFrom?: Date;
    inputDateTo?: Date;
    outputDateFrom?: Date;
    outputDateTo?: Date;
    sessionID?: string;
    workflowID?: string;
    processID?: string;
    tags?: string;
  };
  pagination?: {
    page?: number;
    limit?: number;
  };
}) => {
  const agent = await prisma.aiAgent.findFirst({
    where: {
      id: aiAgentId,
      teamId,
    },
    select: {
      id: true,
    },
  });

  if (!agent) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Agent not found');
  }

  type Where = typeof prisma.aiAgentLog.findMany extends (args: { where: infer T }) => any ? T : never;

  const agentLogQueryWhereClause: Where = {
    aiAgent: {
      id: aiAgentId,
      teamId,
    },

    sourceId: { equals: where?.sourceId },
    componentId: { equals: where?.componentId },
    sessionID: { equals: where?.sessionID },
    workflowID: { equals: where?.workflowID },
    processID: { equals: where?.processID },

    AND: [
      {
        OR: [{ tags: null }, { tags: { not: { contains: 'DEBUG' } } }],

        ...(where?.tags && {
          tags: {
            contains: where.tags,
          },
        }),
      },
    ],
    inputTimestamp: {
      ...(where?.inputDateFrom && { gte: where?.inputDateFrom }),
      ...(where?.inputDateTo && { lte: where?.inputDateTo }),
    },
    outputTimestamp: {
      ...(where?.outputDateFrom && { gte: where?.outputDateFrom }),
      ...(where?.outputDateTo && { lte: where?.outputDateTo }),
    },
  };

  const logs = await prisma.aiAgentLog.findMany({
    where: agentLogQueryWhereClause,
    ...includePagination(pagination),
    // orderBy: {
    //   createdAt: 'asc',
    // }, //! COMMENTED OUT BECAUSE IT'S SLOW UNTIL WE FIX THE INDEXES. FOR NOW, WE WILL MANUALLY SORT THE RESULTS after the query
    // TODO @AHMED: FIX THE INDEXES
  });

  logs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const total = await prisma.aiAgentLog.count({
    where: agentLogQueryWhereClause,
  });

  return {
    logs,
    total,
  };
};

export const getAgentCallLogsSessions = async ({
  teamId,
  aiAgentId,
  pagination,
}: {
  teamId: string;
  aiAgentId: string;
  pagination?: {
    page?: number;
    limit?: number;
  };
}) => {
  const agent = await prisma.aiAgent.findFirst({
    where: {
      id: aiAgentId,
      teamId,
    },
    select: {
      id: true,
    },
  });

  if (!agent) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Agent not found');
  }

  // id,  createdAt, sourceId, input, tags, sessionID

  type Where = typeof prisma.aiAgentLog.findMany extends (args: { where: infer T }) => any ? T : never;

  const agentLogQueryWhereClause: Where = {
    aiAgent: {
      id: aiAgentId,
      teamId,
    },

    componentId: { contains: 'AGENT' },
    AND: [
      {
        OR: [{ tags: null }, { tags: { not: { contains: 'DEBUG' } } }],
      },
    ],
  };
  const logs = await prisma.aiAgentLog.findMany({
    where: agentLogQueryWhereClause,
    ...includePagination(pagination),

    select: {
      id: true,
      createdAt: true,
      sourceId: true,
      input: true,
      tags: true,
      sessionID: true,
      workflowID: true,
      processID: true,
    },

    orderBy: {
      createdAt: 'desc',
    },
  });

  const total = await prisma.aiAgentLog.count({
    where: agentLogQueryWhereClause,
  });

  return {
    logs,
    total,
  };
};

export const addAgentCallLogM2M = async ({
  aiAgentId,
  data,
}: {
  aiAgentId: string;
  data: {
    [key: string]: any;
  };
}) => {
  await checkAgentExistsOrThrow(aiAgentId, undefined, { anonymous: true });

  const log = await prisma.aiAgentLog.create({
    data: {
      aiAgent: {
        connect: {
          id: aiAgentId,
        },
      },
      ...data,
    },
  });

  return log;
};

export const updateAgentCallLogM2M = async ({
  logId,
  data,
}: {
  logId: number;
  data: {
    [key: string]: any;
  };
}) => {
  try {
    const updated = await prisma.aiAgentLog.update({
      where: {
        id: logId,
      },
      data,

      select: null,
    });

    return updated;
  } catch (error: any) {
    if (error.code === PRISMA_ERROR_CODES.NON_EXISTENT_RECORD) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Log not found');
    }
    throw error;
  }
};

export const getTeamAgents = async ({
  teamId,
  deployedOnly = false,
  includeData = false,
  pagination,
}: {
  teamId: string;
  deployedOnly?: boolean;
  includeData?: boolean;
  pagination?: {
    page?: number;
    limit?: number;
  };
}) => {
  const whereClause = {
    teamId,
    ...(deployedOnly && {
      AiAgentDeployment: {
        some: {}, // if there are any deployments, this agent is considered deployed
      },
    }),
  };

  const agents = await prisma.aiAgent.findMany({
    where: whereClause,
    ...includePagination(pagination),
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      domain: {
        select: {
          name: true,
          id: true,
          verified: true,
          lastStatus: true,
        },
      },
      _count: {
        select: {
          AiAgentDeployment: true,
        },
      },
      ...(includeData && {
        aiAgentData: {
          select: {
            data: true,
          },
        },
      }),
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const total = await prisma.aiAgent.count({
    where: whereClause,
  });

  // Transform the response to include the deployed flag
  const transformedAgents = agents.map(agent => ({
    ...agent,
    deployed: agent._count.AiAgentDeployment > 0,
    _count: undefined, // Remove the _count field from the response
  }));

  return {
    agents: transformedAgents,
    total,
  };
};
