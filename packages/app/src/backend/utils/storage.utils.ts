import { privateStorage } from '../services/storage';

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
  // console.log('details', teamId, userId);
  // // const key = new URL(url).pathname;
  // const object = await abstractedS3Client
  //   .headObject({
  //     Bucket: config.env.AWS_S3_BUCKET_NAME,
  //     Key: key,
  //   })
  //   .catch((err) => {
  //     throw new Error('File not found');
  //   });

  // if (!object || Object.keys(object.Metadata).length === 0) {
  //   throw new Error('File not found');
  // }

  // console.log('metadata', object.Metadata);

  // if (object.Metadata?.teamid != teamId || object.Metadata?.userid != userId) {
  //   throw new Error('File not found');
  // }

  const meta = await privateStorage.stat(key).catch((e) => {
    throw new Error('File not found');
  });

  if (Object.keys(meta.metadata).length === 0) {
    throw new Error('File not found');
  }

  console.log(`S3 OBJECT ${key} METADATA: `, meta.metadata);

  if (meta.metadata?.teamid != teamId || meta.metadata?.userid != userId) {
    throw new Error('File not found');
  }
};
