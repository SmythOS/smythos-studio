import config from '../config';
import { abstractedS3Client } from '../lib/s3';

export const isStorageFile = (url: string) => {
  const urlObject = new URL(url);

  return urlObject.protocol === 'storage:' || urlObject.protocol === 's3:';
};

export const checkObjectOwnership = async (
  key: string,
  {
    teamId,
    userId,
  }: {
    teamId: string;
    userId: string;
  },
) => {
  console.log('details', teamId, userId);
  // const key = new URL(url).pathname;
  const object = await abstractedS3Client
    .headObject({
      Bucket: config.env.AWS_S3_BUCKET_NAME,
      Key: key,
    })
    .catch((err) => {
      throw new Error('File not found');
    });

  if (!object || Object.keys(object.Metadata).length === 0) {
    throw new Error('File not found');
  }

  console.log('metadata', object.Metadata);

  if (object.Metadata?.teamid != teamId || object.Metadata?.userid != userId) {
    throw new Error('File not found');
  }
};

export const getObjectDataByKey = (key: string) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response: any = await abstractedS3Client.getObject({
        Bucket: config.env.AWS_S3_BUCKET_NAME,
        Key: key,
      });
      const request = response.Body;
      let dataChunks = [];

      // Listen for data events to collect the chunks
      request.on('data', (chunk) => {
        dataChunks.push(chunk);
      });

      // Handle the end of the stream and convert the chunks to a string
      request.on('end', () => {
        const completeData = Buffer.concat(dataChunks);
        const bodyContent = completeData.toString('utf-8');
        resolve(bodyContent);
      });

      // Error handling for the stream
      request.on('error', (error) => {
        console.error('Error reading the S3 object stream:', error);
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
};

export const extractObjectKeyFromUrl = (url: string) => {
  const urlObject = new URL(url);

  return urlObject.pathname;
};
