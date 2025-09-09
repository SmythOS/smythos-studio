import { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { Logger } from '@smythos/sre';

import config from '@core/config';

const logger = Logger('(Core) Middleware: Error');

/**
 * Centralized error handler for all application errors
 */
const errorHandler: ErrorRequestHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  // eslint-disable-next-line prefer-const
  let { statusCode, message, errKey } = err;

  // Handle operational vs programming errors
  if (!err.isOperational) {
    statusCode = 500;
    message = 'Internal Server Error';
  }

  res.locals.errorMessage = err.message;

  const response = {
    success: false,
    code: statusCode ?? 500,
    message: message ?? 'Internal Server Error',
    ...(config.env.NODE_ENV === 'development' && { stack: err.stack }),
    ...(errKey && { errKey }),
  };

  // Log error with request context
  logger.error(`[${statusCode ?? 500}] ${req.method} ${req.path} - ${message}`, {
    statusCode: statusCode ?? 500,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    ...(config.env.NODE_ENV === 'development' && { stack: err.stack }),
  });

  return res.status(statusCode ?? 500).json(response);
};

/**
 * 404 Not Found handler - creates error and passes to error handler
 */
const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new Error(`Path not found: ${req.method} ${req.path}`);
  (error as any).statusCode = 404;
  (error as any).isOperational = true;
  next(error);
};

export { errorHandler, notFoundHandler };
