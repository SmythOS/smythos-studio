import { config } from '../../config/config';
import { SESClient } from '@aws-sdk/client-ses';

// sesClient
export const sesClient = new SESClient({
  region: config.variables.AWS_REGION,
  credentials: {
    accessKeyId: config.variables.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.variables.AWS_SECRET_ACCESS_KEY,
  },
});
