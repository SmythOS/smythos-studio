import httpStatus from 'http-status';
import { ExpressHandler } from '../../../../types';
import { embodimentService } from '../services';
import { aiAgentService } from '../../ai-agent/services';
import { authExpressHelpers } from '../../auth/helpers/auth-express.helper';

export const createEmbodiment: ExpressHandler<
  {
    type: string;
    properties: object;
    aiAgentId: string;
  },
  { embodiment: any }
> = async (req, res) => {
  const { aiAgentId, type, properties } = req.body;
  const teamId = authExpressHelpers.getTeamId(res);

  const embodiment = await embodimentService.createEmbodiment({
    teamId,
    type,
    properties,
    aiAgentId,
  });

  return res.status(httpStatus.CREATED).json({ embodiment });
};

export const getEmbodiments: ExpressHandler<{}, { embodiments: any }> = async (req, res) => {
  const aiAgentId = req.query.aiAgentId as string;
  const teamId = authExpressHelpers.getTeamId(res);

  const embodiments = await embodimentService.getEmbodiments(aiAgentId, teamId);

  return res.status(httpStatus.OK).json({
    message: 'Embodiments retrieved successfully',
    embodiments,
  });
};

export const getEmbodiment: ExpressHandler<
  {
    embodimentId: string;
  },
  { embodiment: any }
> = async (req, res) => {
  const { embodimentId } = req.params;
  const teamId = authExpressHelpers.getTeamId(res);

  const embodiment = await embodimentService.getEmbodiment(+embodimentId, teamId);

  return res.status(httpStatus.OK).json({
    message: 'Embodiment retrieved successfully',
    embodiment,
  });
};

export const updateEmbodiment: ExpressHandler<
  {
    embodimentId: string;
    type: string;
    properties: object;
  },
  { embodiment: any }
> = async (req, res) => {
  const { embodimentId, type, properties } = req.body;
  const teamId = authExpressHelpers.getTeamId(res);

  const embodiment = await embodimentService.updateEmbodiment({
    embodimentId: +embodimentId,
    type,
    properties,
    teamId,
  });

  return res.status(httpStatus.OK).json({
    message: 'Embodiment updated successfully',
    embodiment,
  });
};

export const deleteEmbodiment: ExpressHandler<
  {
    embodimentId: string;
  },
  {}
> = async (req, res) => {
  const { embodimentId } = req.params;
  const teamId = authExpressHelpers.getTeamId(res);

  await embodimentService.deleteEmbodiment(+embodimentId, teamId);

  return res.status(httpStatus.OK).json({
    message: 'Embodiment deleted successfully',
  });
};
