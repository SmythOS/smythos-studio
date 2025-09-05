import httpStatus from 'http-status';
import { ExpressHandler } from '../../../../types';
import { authExpressHelpers } from '../../auth/helpers/auth-express.helper';
import { domainRegisterationService } from '../services';

//* DOMAINS

export const postDomain: ExpressHandler<{ name: string }, { domain: any }> = async (req, res) => {
  const { name } = req.body;
  const teamId = authExpressHelpers.getTeamId(res);

  const domain = await domainRegisterationService.createDomain(name, teamId);

  res.status(httpStatus.OK).json({
    message: 'Domain saved successfully',
    domain,
  });
};

export const putUpdateDomain: ExpressHandler<
  {
    name: string;
    data: {
      aiAgentId: string | null;
    };
  },
  {}
> = async (req, res) => {
  const { name, data } = req.body;
  const teamId = authExpressHelpers.getTeamId(res);

  await domainRegisterationService.updateDomain(name, teamId, data);

  res.status(httpStatus.OK).json({
    message: 'Domain updated successfully',
  });
};

export const getDomains: ExpressHandler<null, { domains: any }> = async (req, res) => {
  const { verified = false } = req.query;

  const domains = await domainRegisterationService.getDomains(authExpressHelpers.getTeamId(res), {
    verified: verified === 'true',
  });

  res.status(httpStatus.OK).json({
    message: 'Domains retrieved successfully',
    domains,
  });
};

export const queryDomain: ExpressHandler<{ name: string }, { domain: any }> = async (req, res) => {
  const { name } = req.body;
  const teamId = authExpressHelpers.getTeamId(res);

  const domain = await domainRegisterationService.getDomain(name, teamId, {
    anonymous: false,
  });

  res.status(httpStatus.OK).json({
    message: 'Domain retrieved successfully',
    domain,
  });
};

export const deleteDomain: ExpressHandler<{ name: string }, {}> = async (req, res) => {
  const { name } = req.body;
  const teamId = authExpressHelpers.getTeamId(res);

  await domainRegisterationService.deleteDomain(name, teamId);

  res.status(httpStatus.OK).json({
    message: 'Domain deleted successfully',
  });
};
