import httpStatus from 'http-status';
import { prisma } from '../../../../../../prisma/prisma-client';
import { PrismaTransaction } from '../../../../../../types';
import ApiError from '../../../../../utils/apiError';

export interface VersionComponents {
  major: number;
  minor: number;
}

export interface DeployParams {
  teamId: string;
  distribution: { url: string; name: string; id: string };
  payload: {
    releaseNotes: string;
    versionComponents: VersionComponents;
  };
  aiAgent: {
    id: string;
    settings: { key: string; value: string }[];
    snapshotData: { version: string; [key: string]: any };
  };
  tx: PrismaTransaction;
}

export abstract class AbstractDeployer {
  abstract deploy(params: DeployParams): Promise<any>;
}
