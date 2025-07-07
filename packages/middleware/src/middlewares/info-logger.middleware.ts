import { Request, Response, NextFunction } from 'express';
import { LOGGER } from '../../config/logging';
// import trafficCustomMetrics from '../metrices/custom/traffic.custom.metrices';

export const infoLogger = (req: Request, _res: Response, next: NextFunction) => {
  // Check for the 'X-Forwarded-For' header first to get the original IP address
  const forwardedIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  const startHrTime = process.hrtime();
  // const endDuration = trafficCustomMetrics.responseTime.startTimer({ method: req.method, path: req.path });

  _res.on('finish', () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedTimeInSec = elapsedHrTime[0] + elapsedHrTime[1] / 1e9;
    LOGGER.info(`${req.method} ${req.path} - ${elapsedTimeInSec} sec (${elapsedTimeInSec * 1000} ms)`);

    // endDuration();
    // trafficCustomMetrics.responseTime.observe({ method: req.method, path: req.path }, elapsedTimeInSec);
  });

  LOGGER.info(`Request from ${forwardedIp} to ${req.originalUrl}`);
  next();
};
