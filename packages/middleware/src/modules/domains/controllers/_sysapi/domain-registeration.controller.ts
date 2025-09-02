import httpStatus from 'http-status';
import { ExpressHandler } from '../../../../../types';
import { domainRegisterationService } from '../../services';

export const queryDomain: ExpressHandler<{ name: string }, { domain: any }> = async (req, res) => {
  const { name } = req.body;

  const domain = await domainRegisterationService.getDomain(name, undefined, {
    anonymous: true,
  });

  res.status(httpStatus.OK).json({
    message: 'Domain retrieved successfully',
    domain,
  });
};

export const getDomains: ExpressHandler<null, { domains: any }> = async (req, res) => {
  const { verified = true, name, aiAgentId } = req.query;

  const domains = await domainRegisterationService.getDomainsM2M({
    verified: Boolean(verified),
    name: name as string,
    aiAgentId: aiAgentId as string,
  });

  res.status(httpStatus.OK).json({
    message: 'Domains retrieved successfully',
    domains,
  });
};
