/* eslint-disable no-param-reassign */
import httpStatus from 'http-status';
import { prisma } from '../../../../prisma/prisma-client';
import ApiError from '../../../utils/apiError';
import errKeys from '../../../utils/errorKeys';
import { includePagination } from '../../../utils/general';

// #region User-level
export async function getConversations({
  teamId,
  userId,
  query,
  sort,
  pagination,
}: {
  teamId: string;
  userId: number;
  query?: {
    isOwner?: boolean;
  };
  pagination?: {
    page?: number;
    limit?: number;
  };
  sort?: {
    order?: 'asc' | 'desc';
    field?: 'createdAt' | 'updatedAt' | 'label';
  };
}): Promise<any> {
  if (sort?.field && !['createdAt', 'updatedAt', 'label'].includes(sort?.field)) {
    sort = undefined;
  }

  if (sort?.order && !['asc', 'desc'].includes(sort?.order)) {
    sort = undefined;
  }

  const whereClause = {
    teamId,
    ownerId: query?.isOwner ? userId : undefined,
  };

  const conversations = await prisma.aiAgentConversation.findMany({
    where: whereClause,

    orderBy: {
      ...(sort?.field && {
        [sort.field]: sort.order ?? 'asc',
      }),
    },

    ...includePagination(pagination),

    select: {
      id: true,
      aiAgentId: true,
      chunkSize: true,
      lastChunkID: true,
      label: true,
      createdAt: true,
      updatedAt: true,
      summary: true,
      teamId: true,
    },
  });

  const total = await prisma.aiAgentConversation.count({
    where: whereClause,
  });

  return {
    total,
    conversations,
  };
}

export async function getMyConversations({
  teamId,
  userId,
  pagination,
}: {
  teamId: string;
  userId: number;
  pagination?: { page?: number; limit?: number };
}) {
  const conversations = await prisma.aiAgentConversation.findMany({
    where: {
      teamId,
      ownerId: userId,
    },

    ...includePagination(pagination),

    select: {
      id: true,
      aiAgentId: true,
      chunkSize: true,
      lastChunkID: true,
      label: true,
      createdAt: true,
      updatedAt: true,
      summary: true,
      teamId: true,
    },
  });

  return conversations;
}

export async function createTeamConversation({
  teamId,
  userId,
  data,
}: {
  teamId: string;
  userId: number;
  data: {
    label?: string;
    summary?: string;
    aiAgentId: string;
    chunkSize?: number;
    lastChunkID?: string;
  };
}) {
  const agent = await prisma.aiAgent.findFirst({
    where: {
      id: data.aiAgentId,
      teamId,
    },
    select: { teamId: true },
  });

  if (!agent) {
    throw new ApiError(404, 'Agent not found');
  }

  console.log(data.aiAgentId);
  const newConversation = await prisma.aiAgentConversation.create({
    data: {
      teamId,
      ownerId: userId,
      label: data.label,
      summary: data.summary,
      aiAgentId: data.aiAgentId,
      chunkSize: data.chunkSize,
      lastChunkID: data.lastChunkID,
    },

    select: {
      id: true,
      aiAgentId: true,
      chunkSize: true,
      lastChunkID: true,
      label: true,
      createdAt: true,
      updatedAt: true,
      summary: true,
    },
  });

  return newConversation;
}

export async function updateTeamConversation({
  teamId,
  userId,
  conversationId,
  data,
}: {
  teamId: string;
  userId: number;
  conversationId: string;
  data: {
    label?: string;
    summary?: string;
  };
}) {
  const existing = await prisma.aiAgentConversation.findFirst({
    where: {
      id: conversationId,
      teamId,
      ownerId: userId,
    },
    select: { ownerId: true, id: true },
  });

  if (!existing) {
    throw new ApiError(404, 'Agent conversation not found');
  }

  if (existing.ownerId !== userId) {
    throw new ApiError(403, 'You do not own this conversation', errKeys.UNAUTHORIZED_ACTION);
  }

  const updated = await prisma.aiAgentConversation.update({
    where: {
      id: conversationId,
      teamId,
      ownerId: userId,
    },
    data: {
      label: data.label,
      summary: data.summary,
    },

    select: {
      id: true,
      aiAgentId: true,
      chunkSize: true,
      lastChunkID: true,
      label: true,
      createdAt: true,
      updatedAt: true,
      summary: true,
    },
  });

  return updated;
}

export async function deleteTeamConversation({ teamId, userId, conversationId }: { teamId: string; userId: number; conversationId: string }) {
  const existing = await prisma.aiAgentConversation.findFirst({
    where: {
      id: conversationId,
      teamId,
    },
    select: { ownerId: true, id: true },
  });

  if (!existing) {
    throw new ApiError(404, 'Agent conversation not found');
  }

  if (existing.ownerId !== userId) {
    throw new ApiError(403, 'You do not own this conversation', errKeys.UNAUTHORIZED_ACTION);
  }

  const deleted = await prisma.aiAgentConversation.delete({
    where: {
      id: conversationId,
    },
  });

  return deleted;
}

export async function getTeamConversationById({ teamId, userId, conversationId }: { teamId: string; userId: number; conversationId: string }) {
  const conversation = await prisma.aiAgentConversation.findFirst({
    where: {
      id: conversationId,
      teamId,
    },

    select: {
      id: true,
      aiAgentId: true,
      chunkSize: true,
      lastChunkID: true,
      label: true,
      createdAt: true,
      updatedAt: true,
      summary: true,
    },
  });

  if (!conversation) {
    throw new ApiError(404, 'Agent conversation not found');
  }

  return conversation;
}

// #region M2M

export async function createConversationM2M(data: {
  label?: string;
  summary?: string;
  teamId: string;
  ownerId?: number;
  aiAgentId: string;
  chunkSize?: number;
  lastChunkID?: string;
}): Promise<any> {
  const team = await prisma.team.findFirst({
    where: {
      id: data.teamId,
    },
    select: { id: true },
  });

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  const agent = await prisma.aiAgent.findFirst({
    where: {
      id: data.aiAgentId,
    },
    select: { teamId: true },
  });

  if (!agent) {
    throw new ApiError(404, 'Agent not found');
  }

  if (agent.teamId !== data.teamId) {
    throw new ApiError(400, 'Agent does not belong to the given team');
  }

  if (data.ownerId !== undefined) {
    const user = await prisma.user.findFirst({
      where: {
        id: data.ownerId,
      },
      select: {
        userTeamRole: {
          where: {
            sharedTeamRole: {
              teamId: data.teamId,
            },
          },
          select: {
            sharedTeamRole: {
              select: {
                teamId: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const matchingTeamId = user.userTeamRole?.[0]?.sharedTeamRole?.teamId;
    if (!matchingTeamId) {
      throw new ApiError(400, 'User does not belong to the given team');
    }
  }

  return prisma.aiAgentConversation.create({
    data,

    select: {
      id: true,
      aiAgentId: true,
      ownerId: true,
      chunkSize: true,
      lastChunkID: true,
      label: true,
      createdAt: true,
      updatedAt: true,
      summary: true,
      teamId: true,
    },
  });
}

export async function updateConversationM2M(
  id: string,
  data: {
    ownerId?: number;
    chunkSize?: number;
    lastChunkID?: string;
    label?: string;
    summary?: string;
  },
): Promise<any> {
  const existing = await prisma.aiAgentConversation.findFirst({
    where: {
      id,
    },
    select: { aiAgentId: true, teamId: true },
  });

  if (!existing) {
    throw new ApiError(404, 'Agent conversation not found');
  }

  if (data.ownerId) {
    const user = await prisma.user.findFirst({
      where: {
        id: data.ownerId,
      },
      select: {
        userTeamRole: {
          where: {
            sharedTeamRole: {
              teamId: existing.teamId,
            },
          },
          select: {
            sharedTeamRole: {
              select: {
                teamId: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const matchingTeamId = user.userTeamRole?.[0]?.sharedTeamRole?.teamId;
    if (!matchingTeamId) {
      throw new ApiError(400, 'User does not belong to the team that owns the conversation');
    }
  }

  const updated = await prisma.aiAgentConversation.update({
    where: {
      id,
    },
    data,

    select: {
      id: true,
      aiAgentId: true,
      ownerId: true,
      chunkSize: true,
      lastChunkID: true,
      label: true,
      createdAt: true,
      updatedAt: true,
      summary: true,
      teamId: true,
    },
  });

  return updated;
}

export async function getConversationByIdM2M(id: string): Promise<any> {
  const conversation = await prisma.aiAgentConversation.findFirst({
    where: {
      id,
    },

    select: {
      id: true,
      aiAgentId: true,
      ownerId: true,
      chunkSize: true,
      lastChunkID: true,
      label: true,
      createdAt: true,
      updatedAt: true,
      summary: true,
      teamId: true,
    },
  });

  if (!conversation) {
    throw new ApiError(404, 'Agent conversation not found');
  }

  return conversation;
}

export async function getConversationsM2M({
  query,
}: {
  query?: {
    ownerId?: number;
    agentId?: string;
  };
}): Promise<any> {
  const conversations = await prisma.aiAgentConversation.findMany({
    where: {
      ownerId: query?.ownerId,
      aiAgentId: query?.agentId,
    },

    select: {
      id: true,
      aiAgentId: true,
      ownerId: true,
      chunkSize: true,
      lastChunkID: true,
      label: true,
      createdAt: true,
      updatedAt: true,
      summary: true,
      teamId: true,
    },
  });

  return conversations;
}

export async function getConversationsByAgentIdM2M(agentId: string): Promise<any> {
  const conversations = await prisma.aiAgentConversation.findMany({
    where: {
      aiAgentId: agentId,
    },

    select: {
      id: true,
      aiAgentId: true,
      ownerId: true,
      chunkSize: true,
      lastChunkID: true,
      label: true,
      createdAt: true,
      updatedAt: true,
      summary: true,
      teamId: true,
    },
  });

  return conversations;
}

export async function deleteConversationM2M(id: string) {
  const existing = await prisma.aiAgentConversation.findFirst({
    where: {
      id,
    },
    select: { id: true },
  });

  if (!existing) {
    throw new ApiError(404, 'Agent conversation not found');
  }

  const deleted = await prisma.aiAgentConversation.delete({
    where: {
      id,
    },
  });

  return deleted;
}

// #endregion
