import httpStatus from 'http-status';
import { ExpressHandler, ExpressHandlerWithParams } from '../../../../../types';
import { authExpressHelpers } from '../../../auth/helpers/auth-express.helper';
import { quotaService } from '../../services';

export const getAgentTasksUsageByIdM2M: ExpressHandlerWithParams<
  {
    agentId: string;
  },
  {},
  any
> = async (req, res) => {
  const { agentId } = req.params;

  const record = await quotaService.getAgentTasksUsageByIdM2M({
    agentId,
  });

  return res.status(httpStatus.OK).json(record);
};

export const getAgentTasksUsageWithinM2M: ExpressHandlerWithParams<
  {
    agentId: string;
  },
  {},
  any
> = async (req, res) => {
  const { agentId } = req.params;
  const { startDate, endDate } = req.query;

  const records = await quotaService.getAgentTasksUsageWithinM2M({
    agentId,
    from: startDate,
    to: endDate,
  });

  return res.status(httpStatus.OK).json({
    records,
  });
};

export const getTeamTasksUsageByIdM2M: ExpressHandlerWithParams<
  {
    teamId: string;
  },
  {},
  any
> = async (req, res) => {
  const { teamId } = req.params;

  const usage = await quotaService.getTeamTasksUsageByIdM2M({
    teamId,
  });

  return res.status(httpStatus.OK).json(usage);
};

export const getTeamTasksUsageWithinM2M: ExpressHandlerWithParams<
  {
    teamId: string;
  },
  {},
  any
> = async (req, res) => {
  const { teamId } = req.params;
  const { startDate, endDate } = req.query;

  const records = await quotaService.getTeamTasksUsageWithinM2M({
    teamId,
    from: startDate,
    to: endDate,
  });

  return res.status(httpStatus.OK).json({
    records,
  });
};

export const consumeTeamTasksByAgentIdM2M: ExpressHandlerWithParams<
  {
    agentId: string;
  },
  {
    day: Date;
    number: number;
  },
  any
> = async (req, res) => {
  const { agentId } = req.params;
  const { day, number } = req.body;

  const record = await quotaService.consumeTeamTasksByAgentIdM2M({
    agentId,
    day,
    amount: number,
  });

  return res.status(httpStatus.OK).json(record);
};

// create a new route for this trackLLMTokensAndApiRequestsUsage from quota.service.ts
export const trackLLMTokensAndApiRequestsUsage: ExpressHandlerWithParams<
  {
    agentId: string;
    teamId: string;
  },
  {
    date?: Date;
    units: number;
    class: string;
    sourceId: string;
    userKey: boolean;
  },
  {
    message: string;
    data: any;
  }
> = async (req, res) => {
  const { agentId, teamId } = req.params;

  const result = await quotaService.trackLLMTokensAndApiRequestsUsage({ ...req.body, agentId, teamId });

  return res.status(httpStatus.OK).json(result);
};

export const getTotalUsageForBillingCycle: ExpressHandlerWithParams<
  {
    teamId: string;
  },
  {},
  any
> = async (req, res) => {
  const { teamId } = req.params;

  const result = await quotaService.getTotalUsageForBillingCycle(teamId);

  return res.status(httpStatus.OK).json(result);
};
