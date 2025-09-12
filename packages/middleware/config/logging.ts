import winston from 'winston';

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

export { createLabeledLogger, LOGGER };
