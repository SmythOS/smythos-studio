import httpStatus from 'http-status';
import { PrismaTransaction } from '../../../../types';
import ApiError from '../../../utils/apiError';

export const getDomains = async (
  teamId: string | undefined,
  options: {
    verified: boolean;
  },
) => {
  return [];
};

export const getDomainsM2M = async (query?: { verified?: boolean; name?: string; aiAgentId?: string }) => {
  return [];
};

export const getDomain = async (
  domainName: string,
  teamId: string | undefined,
  options: {
    anonymous: boolean;
  },
) => {
  throw new ApiError(httpStatus.NOT_FOUND, 'Domain not found');
};

export const createDomain = async (name: string, teamId: string) => {
  return Promise.resolve(true);
};

export const updateDomain = async (
  domainName: string,
  teamId: string,
  data: {
    aiAgentId?: string | null;
  },
): Promise<any> => {
  return Promise.resolve(true);
};

export const verifyDomain = async (name: string, teamId: string) => {
  return Promise.resolve(true);
};

export const checkDomainStatus = async (name: string, teamId: string) => {
  return {
    status: false,
    teamId: teamId,
    aiAgentId: null,
  };
};

export const deleteDomain = async (domainName: string, teamId: string) => {
  return Promise.resolve(true);
};

export const checkDomainNameExists = async (
  name: string,
  teamId: string,
  options?: {
    tx: PrismaTransaction;
  },
) => {
  return Promise.resolve(true);
};
