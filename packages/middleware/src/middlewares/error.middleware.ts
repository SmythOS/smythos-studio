import { ErrorRequestHandler } from 'express';
import httpStatus from 'http-status';
import { config } from '../../config/config';
// import trafficCustomMetrics from '../metrices/custom/traffic.custom.metrices';

const errorHandler: ErrorRequestHandler = (err: any, _req, res, _next: any) => {
  // eslint-disable-next-line prefer-const
  let { statusCode, message, errKey } = err;

  if (!err.isOperational) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = httpStatus[httpStatus.INTERNAL_SERVER_ERROR];
  }

  res.locals.errorMessage = err.message;

  const response = {
    code: statusCode ?? httpStatus.INTERNAL_SERVER_ERROR,
    message: message ?? httpStatus[statusCode],
    ...(config.variables.env === 'development' && { stack: err.stack }),
    ...(errKey && { errKey }),
  };

  // LOGGER.error(new Error(`[${err.statusCode}] ${err.message} ${err.stack}`));

  // trafficCustomMetrics.errorCounter.labels({ method: _req.method, path: _req.path, status: statusCode ?? httpStatus.INTERNAL_SERVER_ERROR }).inc();

  res.status(statusCode ?? httpStatus.INTERNAL_SERVER_ERROR).send(response);
};

export { errorHandler };
