import httpStatus from 'http-status';
import ApiError from '../../../utils/apiError';
import { prisma } from '../../../../prisma/prisma-client';
import { aiAgentService } from '../../ai-agent/services';
import { PrismaTransaction } from '../../../../types';

export const checkEmbodimentExistsOrThrow = async (
  embodimentId: number,
  teamId: string,
  options?: {
    tx?: PrismaTransaction;
  },
) => {
  const _p = options?.tx || prisma;

  const embodiment = await _p.embodiment.findFirst({
    where: {
      id: embodimentId,
      aiAgent: {
        teamId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!embodiment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Embodiment not found');
  }
};

export const createEmbodiment = async ({
  type,
  properties,
  aiAgentId,
  teamId,
}: {
  type: string;
  properties: object;
  aiAgentId: string;
  teamId: string;
}) => {
  const embodiment = await prisma.$transaction(async tx => {
    await aiAgentService.checkAgentExistsOrThrow(aiAgentId, teamId, {
      tx,
    });

    const _newRecord = await tx.embodiment.create({
      data: {
        type,
        properties,
        aiAgent: {
          connect: {
            id: aiAgentId,
          },
        },
      },
      select: {
        createdAt: true,
        id: true,
        type: true,
        properties: true,
        aiAgentId: true,
      },
    });

    return _newRecord;
  });
  return embodiment;
};

export const getEmbodiments = async (
  aiAgentId: string,
  teamId: string | undefined,
  options?: {
    anonymous: boolean;
  },
) => {
  await aiAgentService.checkAgentExistsOrThrow(aiAgentId, teamId, {
    anonymous: options?.anonymous,
  });

  const embodiments = await prisma.embodiment.findMany({
    where: {
      aiAgent: {
        ...(options?.anonymous ? {} : { teamId }),
        id: aiAgentId,
      },
    },
    select: {
      createdAt: true,
      id: true,
      type: true,
      properties: true,
      aiAgentId: true,
    },
  });
  return embodiments;
};

export const getEmbodiment = async (embodimentId: number, teamId: string) => {
  const embodiment = await prisma.embodiment.findFirst({
    where: {
      id: embodimentId,
      aiAgent: {
        teamId,
      },
    },
    select: {
      createdAt: true,
      id: true,
      type: true,
      properties: true,
      aiAgentId: true,
    },
  });

  if (!embodiment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Embodiment not found');
  }

  return embodiment;
};

export const updateEmbodiment = async ({
  embodimentId,
  type,
  properties,
  teamId,
}: {
  embodimentId: number;
  type: string;
  properties: object;
  teamId: string;
}) => {
  await prisma.$transaction(async tx => {
    await checkEmbodimentExistsOrThrow(embodimentId, teamId, { tx });

    await tx.embodiment.updateMany({
      where: {
        id: embodimentId,
        aiAgent: {
          teamId,
        },
      },
      data: {
        type,
        properties,
      },
    });
  });
};

export const deleteEmbodiment = async (embodimentId: number, teamId: string) => {
  await prisma.$transaction(async tx => {
    const deleted = await tx.embodiment.deleteMany({
      where: {
        id: embodimentId,
        aiAgent: {
          teamId,
        },
      },
    });

    if (deleted.count === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Embodiment not found');
    }
  });
};
