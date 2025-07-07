import 'dotenv/config';
import winston from 'winston';

// function getCurrentTimestamp() {
//   return new Date().toISOString();
// }

// export const LOGGER = {
//   info: (message: any) => {
//     console.log(`[INFO] ${getCurrentTimestamp()} ${message}`);
//   },

//   error: (message: any, error?: any) => {
//     console.log(`[ERROR] ${getCurrentTimestamp()} ${message}: ${error}`);
//   },

//   warn: (message: any) => {
//     console.log(`[WARN] ${getCurrentTimestamp()} ${message}`);
//   },

//   debug: (message: any) => {
//     console.log(`[DEBUG] ${getCurrentTimestamp()} ${message}`);
//   },
// };

function createBaseLogger() {
  return winston.createLogger({
    level: 'info', // log level

    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({
        stack: true,
      }),
      winston.format.splat(),
      winston.format.json(),
    ),

    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`),
        ),
      }),
    ],
  });
}

const createLabeledLogger = (labels: { [key: string]: string }) => {
  const logger = createBaseLogger();

  logger.defaultMeta = labels;

  return logger;
};

const LOGGER = createBaseLogger();
LOGGER.on('error', err => {
  console.error(err);
});

export { LOGGER, createLabeledLogger };
