import { RequestHandler, Router } from 'express';
import multer, { StorageEngine } from 'multer';
import { includeAxiosAuth, smythAPIReq } from '../../../utils';
import fs from 'fs';
import { promisify } from 'util';
import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import { s3Client, abstractedS3Client } from '../../../lib/s3';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import config from '../../../config';
import { includeTeamDetails } from '../../../middlewares/auth.mw';
import {
  checkObjectOwnership,
  extractObjectKeyFromUrl,
  isStorageFile,
} from '../../../utils/storage.utils';

const uploadRouter = Router();

const storage: StorageEngine = multerS3({
  s3: s3Client,
  bucket: config.env.AWS_S3_BUCKET_NAME,
  acl: 'private',
  contentType: multerS3.AUTO_CONTENT_TYPE,

  metadata: (req, file, cb) => {
    cb(null, {
      // @ts-ignore
      userId: String(req._team.userId),
      // @ts-ignore
      teamId: String(req._team.id),
      mimetype: file?.mimetype,
    });
  },

  key: async (req, file, cb) => {
    // fetch team id from smyth api
    // let teamId: number;
    // try {
    //     // @ts-ignore
    //     const token = req.user.accessToken;
    //     teamId = (await smythAPIReq.get('/teams/me', includeAxiosAuth(token))).data.team.id;
    // } catch (error) {
    //     cb(new Error('Internal Server Error'), null);
    // }

    //@ts-ignore
    const teamId = req._team.id;

    const uniquePart = uuidv4();
    const hashedFilename = crypto
      .createHash('sha256')
      .update(file.originalname + Date.now().toString())
      .digest('hex');

    cb(null, `/datasources/teams/${teamId}/${hashedFilename}-${uniquePart}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 100, // 100MB
  },
});

uploadRouter.put('/uploads/datasources', includeTeamDetails, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Internal Server Error' });
  }
  res.json({
    file: {
      // @ts-ignore
      key: req.file.key,
    },
  });
});

// maybe this endpoint is not necessary since the object will be deleted (S3 lifecycle)?
uploadRouter.delete('/uploads/datasources', includeTeamDetails, async (req, res) => {
  // use s3
  const key: string = req.query.key as string;

  try {
    await checkObjectOwnership(key, {
      // @ts-ignore
      teamId: req._team.id,
      // @ts-ignore
      userId: req._team.userId,
    });
  } catch (error) {
    return res.status(403).json({ error: error.message });
  }
  if (!key) {
    return res.status(400).json({ error: 'key is required' });
  }

  try {
    const result = await abstractedS3Client.deleteObject({
      Key: key,
      Bucket: config.env.AWS_S3_BUCKET_NAME,
    });

    res.json({ message: 'success' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default uploadRouter;
