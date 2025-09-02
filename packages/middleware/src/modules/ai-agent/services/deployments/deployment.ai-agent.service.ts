/* eslint-disable no-underscore-dangle */
/* eslint-disable no-restricted-syntax */
import httpStatus from 'http-status';
import { aiAgentService } from '..';
import { prisma } from '../../../../../prisma/prisma-client';
import { PrismaTransaction } from '../../../../../types';
import { versionUtils } from '../../../../utils';
import ApiError from '../../../../utils/apiError';
import { AbstractDeployer } from './strategies/AbstractDeployer';
import { SmythOsDeployer } from './strategies/SmythOsDeployer';

/*
 Intro:
     - creates deployments for ai-agents with versioning
 Defining the services:
    - createDeployment
    - getDeployment
    - getDeployments

 
 */

export const createDeployment = async ({
  aiAgentId,
  unformattedVersion,
  teamId,
  releaseNotes,
}: {
  aiAgentId: string;
  unformattedVersion?: string | null;
  releaseNotes?: string | null;
  teamId: string;
}) => {
  /**
   * Pre-conditions:
   * 1. check agent exists
   * 2. check version is valid
   * 3. check version is not already deployed (must be higher than previous version)
   * 4. (DISABLED) check if the agent data and settings are identical to the previous version, if so, don't create a new deployment
   */

  const deployment = await prisma.$transaction(
    async tx => {
      const aiAgentSnapshot = await tx.aiAgent.findUnique({
        where: {
          teamId_id: {
            teamId,
            id: aiAgentId,
          },
        },
        select: {
          aiAgentData: {
            select: {
              data: true,
            },
          },
          aiAgentSettings: {
            select: {
              key: true,
              value: true,
            },
          },
        },
      });
      const snapshotData = aiAgentSnapshot?.aiAgentData?.data as { version: string } | null;

      if (!aiAgentSnapshot) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Agent not found');
      }

      // check if this agent is the first time to be deployed, if so, check QUOTA

      const depCount = await tx.aiAgentDeployment.count({
        where: {
          aiAgentId,
        },
      });

      let _unformattedVersion = unformattedVersion;

      if (!unformattedVersion) {
        const nextVersionComponents = await fetchNextVersion({
          aiAgentId,
          tx,
        });
        _unformattedVersion = versionUtils.buildUnformattedVersion(nextVersionComponents);
      }

      const { major, minor } = versionUtils.extractVersionComponents(_unformattedVersion);

      // get a bigger or equal major version and the biggest minor version

      const conflictingRecord = await tx.aiAgentDeployment.findFirst({
        where: {
          aiAgentId,
          OR: [
            {
              majorVersion: {
                equals: major,
              },
              minorVersion: {
                gte: minor,
              },
            },
            {
              majorVersion: {
                gt: major,
              },
            },
          ],
        },
      });

      if (conflictingRecord) {
        throw new ApiError(httpStatus.CONFLICT, 'This version is already deployed or is lower than the latest version');
      }

      /**
       * Cases to reject a version:
       * - an existing existing with the same major and the minor equals to or higher than the existing record minor
       * - an existing record with a higher major
       */

      let distribution: { url: string; name: string; id: string } = {
        url: '',
        name: '',
        id: '',
      };

      // TODO: later, we will add more deployment strategies to AWS, GCP, etc.
      const deploymentStrategy: AbstractDeployer = new SmythOsDeployer();

      const _deploymentResponse = deploymentStrategy.deploy({
        distribution,
        teamId,
        aiAgent: {
          settings: aiAgentSnapshot.aiAgentSettings,
          snapshotData: snapshotData || { version: '1.0.0' },
          id: aiAgentId,
        },
        payload: {
          releaseNotes: releaseNotes || '',
          versionComponents: {
            major,
            minor,
          },
        },
        tx,
      });

      return _deploymentResponse;
    },
    { timeout: 60_000 },
  );

  return deployment;
};

export const getDeploymentById = async (
  deploymentId: string,
  teamId?: string,
  options?: {
    anonymous?: boolean;
  },
) => {
  const deployment = await prisma.aiAgentDeployment.findFirst({
    where: {
      id: deploymentId,
      ...(options?.anonymous
        ? {}
        : {
            aiAgent: {
              team: {
                id: teamId as string,
              },
            },
          }),
    },

    select: {
      id: true,
      aiAgent: {
        select: {
          name: true,
        },
      },
      majorVersion: true,
      minorVersion: true,
      aiAgentId: true,
      aiAgentData: true,
      aiAgentSettings: true,
      createdAt: true,
      updatedAt: true,
      releaseNotes: true,
    },
  });

  if (!deployment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Deployment not found');
  }

  return deployment;
};

export const listDeploymentsByAgentId = async ({
  teamId,
  aiAgentId,
  options,
  include = [],
}: {
  teamId?: string;
  aiAgentId: string;
  options?: {
    anonymous?: boolean;
  };
  include?: string[];
}) => {
  await aiAgentService.checkAgentExistsOrThrow(aiAgentId, teamId, {
    anonymous: options?.anonymous,
  });

  let deployments = await prisma.aiAgentDeployment.findMany({
    where: {
      aiAgent: {
        id: aiAgentId,
        ...(options?.anonymous
          ? {}
          : {
              team: {
                id: teamId as string,
              },
            }),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      createdAt: true,
      id: true,
      majorVersion: true,
      minorVersion: true,
      aiAgentId: true,
      releaseNotes: true,
      aiAgent: {
        select: {
          name: true,
        },
      },

      ...(include?.includes('aiAgentData')
        ? {
            aiAgentData: true,
          }
        : {}),
    },
  });

  // for backward compatibility, add to each deployment an empty domain object
  if (include?.includes('domain')) {
    deployments = deployments.map((deployment: any) => {
      (deployment.aiAgent as any).domain = [];
      return deployment;
    });
  }

  const deploymentsWithUnformattedVersion: {
    createdAt: Date;
    id: string;
    majorVersion: number;
    minorVersion: number;
    aiAgentId: string;
    version: string;
  }[] = deployments.map(deployment => ({
    ...deployment,
    version: versionUtils.buildUnformattedVersion({
      major: deployment.majorVersion,
      minor: deployment.minorVersion,
    }),
  }));

  return deploymentsWithUnformattedVersion;
};

export const getLatestAgentDeployment = async ({ teamId, aiAgentId }: { teamId: string; aiAgentId: string }) => {
  await aiAgentService.checkAgentExistsOrThrow(aiAgentId, teamId, {
    anonymous: false,
  });

  const deployment = await prisma.aiAgentDeployment.findFirst({
    where: {
      aiAgent: {
        id: aiAgentId,
        teamId,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      createdAt: true,
      id: true,
      majorVersion: true,
      minorVersion: true,
      aiAgentId: true,
      aiAgentData: true,
      aiAgentSettings: true,
      releaseNotes: true,

      aiAgent: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!deployment) {
    return null;
  }

  (deployment.aiAgent as any).domain = [];

  return {
    ...deployment,
    version: versionUtils.buildUnformattedVersion({
      major: deployment.majorVersion,
      minor: deployment.minorVersion,
    }),
  };
};

export const getDeploymentByMajorMinorVersion = async (
  aiAgentId: string,
  majorVersion: string,
  minorVersion: string,
  teamId?: string,
  options?: {
    anonymous?: boolean;
  },
) => {
  const deployment = await prisma.aiAgentDeployment.findFirst({
    where: {
      aiAgentId,
      majorVersion: Number(majorVersion),
      minorVersion: Number(minorVersion),
      ...(options?.anonymous
        ? {}
        : {
            aiAgent: {
              team: {
                id: teamId as string,
              },
            },
          }),
    },

    select: {
      id: true,
      aiAgent: {
        select: {
          name: true,
        },
      },
      majorVersion: true,
      minorVersion: true,
      aiAgentId: true,
      aiAgentData: true,
      aiAgentSettings: true,
      createdAt: true,
      updatedAt: true,
      releaseNotes: true,
    },
  });

  if (!deployment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Deployment not found');
  }

  return deployment;
};

export const fetchNextVersion = async ({ aiAgentId, tx }: { aiAgentId: string; tx?: PrismaTransaction }) => {
  const _p = tx || prisma;
  //! NEED TO BE OPTIMIZED
  // get the latest version
  const latestDeployments = await _p.aiAgentDeployment.findMany({
    where: {
      aiAgentId,
    },

    orderBy: {
      majorVersion: 'desc',
    },

    select: {
      majorVersion: true,
      minorVersion: true,
    },
  });

  const latestDeployment = latestDeployments.sort((a, b) => b.majorVersion - a.majorVersion || b.minorVersion - a.minorVersion)[0];

  if (!latestDeployment) {
    return {
      major: 1,
      minor: 0,
    };
  }

  return {
    major: latestDeployment.majorVersion,
    minor: latestDeployment.minorVersion + 1,
  };
};

export const getTeamDeploymentsCount = async (
  teamId: string,
  options?: {
    tx?: PrismaTransaction;
  },
) => {
  const _p = options?.tx || prisma;
  const count = await _p.aiAgentDeployment.count({
    where: {
      aiAgent: {
        teamId,
      },
    },
  });

  return count;
};
