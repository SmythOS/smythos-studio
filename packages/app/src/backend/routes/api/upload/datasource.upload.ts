import { privateStorage } from '@src/backend/services/storage';
import { StorageACL } from '@src/backend/services/storage/StaticStorage';
import crypto from 'crypto';
import { Router } from 'express';
import { includeTeamDetails } from '../../../middlewares/auth.mw';
import { checkObjectOwnership } from '../../../utils/storage.utils';

// FILE SHOULD BE RELOCATED TO ENTERPRISE APP
// TODO: TEST:STORAGE

const uploadRouter = Router();

const uploadMw = privateStorage.createUploadMw({
  purge: 'DAILY',
  acl: StorageACL.Private,
  limits: {
    fileSize: 1024 * 1024 * 100, // 100MB
  },

  key: (req, file) => {
    const teamId = req._team.id;

    // const uniquePart = uuidv4();
    // const hashedFilename = crypto
    //   .createHash('sha256')
    //   .update(file.originalname + Date.now().toString())
    //   .digest('hex')
    //   .slice(0, 16);
    const randomId = crypto.randomBytes(8).toString('hex'); // 16-char hex ID

    return `/datasources/teams/${teamId}/${randomId}--${file.originalname}`;
  },

  metadata: (req, file) => {
    return {
      // @ts-ignore
      userId: String(req._team.userId),
      // @ts-ignore
      teamId: String(req._team.id),
      mimetype: file?.mimetype,
    };
  },
});

uploadRouter.put(
  '/uploads/datasources',
  includeTeamDetails,
  uploadMw.single('file'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Internal Server Error' });
    }
    res.json({
      file: {
        // @ts-ignore
        key: req.file.key,
      },
    });
  },
);

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
    await privateStorage.deleteContent({ key }).catch((e) => {
      console.error('Failed to delete datasource file', e);
      throw new Error('Failed to delete file');
    });

    res.json({ message: 'success' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default uploadRouter;
