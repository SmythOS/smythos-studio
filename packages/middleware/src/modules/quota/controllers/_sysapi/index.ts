import httpStatus from 'http-status';
import { ExpressHandler, ExpressHandlerWithParams } from '../../../../../types';
import { authExpressHelpers } from '../../../auth/helpers/auth-express.helper';
import { quotaService } from '../../services';

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
