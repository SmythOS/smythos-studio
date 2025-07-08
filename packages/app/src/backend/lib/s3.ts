import { S3Client, S3 } from '@aws-sdk/client-s3';
import config from '../config';
const s3Client = new S3Client({
  region: config.env.AWS_S3_REGION,
  credentials: {
    accessKeyId: config.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.env.AWS_SECRET_ACCESS_KEY,
  },
});

const abstractedS3Client = new S3({
  region: config.env.AWS_S3_REGION,
  credentials: {
    accessKeyId: config.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.env.AWS_SECRET_ACCESS_KEY,
  },
});

export { s3Client, abstractedS3Client };
