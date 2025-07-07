import { ExpressHandlerWithParams } from '../../../../../types';
import { embodimentService } from '../../services';
import httpStatus from 'http-status';

export const getEmbodimentsByAgentId: ExpressHandlerWithParams<{}, {}, { embodiments: any }> = async (req, res) => {
  const { aiAgentId } = req.query;

  const embodiments = await embodimentService.getEmbodiments(aiAgentId, undefined, {
    anonymous: true,
  });

  res.status(httpStatus.OK).json({
    message: 'Embodiments retrieved successfully',
    embodiments,
  });
};
