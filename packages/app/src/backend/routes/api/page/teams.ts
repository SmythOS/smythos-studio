import express from 'express';
import { forwardToSmythAPIMiddleware } from '../../../utils';
import { includeTeamDetails } from '../../../middlewares/auth.mw';
import SmythPubStaticStorage from '../../../services/storage/SmythStaticStorage.class';
import { randomUUID } from 'crypto';
import { authHeaders, smythAPIReq } from '../../../utils';

const router = express.Router();
const smythProxy = forwardToSmythAPIMiddleware({ endpointBuilder: (req) => `/teams${req.url}` });

const staticStorage = new SmythPubStaticStorage();

const uploadAvatarMw = staticStorage.getMulter({
  key: (req, file) =>
    SmythPubStaticStorage.path(
      'teams',
      SmythPubStaticStorage.hash(req._team.id),
      `avatar-${randomUUID()}`,
    ),
  limits: {
    fileSize: 1024 * 1024 * 15, // 15MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type. Only images are allowed'));
  },
});

router.post(
  '/company-logo/upload',
  [includeTeamDetails, uploadAvatarMw.single('logo')],
  async (req, res) => {
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      // @ts-ignore
      const key = req.file.key;
      const publicUrl = staticStorage.getPublicUrl(key);

      console.log('publicUrl', publicUrl);

      // save the logo in the team settings
      await smythAPIReq.put(
        `/teams/settings`,
        {
          settingKey: 'companyLogo',
          settingValue: JSON.stringify({ url: publicUrl }),
        },
        await authHeaders(req),
      );

      return res.json({ success: true, url: publicUrl });
    } catch (error) {
      console.error('Error saving company logo:', error);
      return res.status(500).json({ error: 'Failed to save company logo' });
    }
  },
);

router.get('/*', smythProxy);
router.post('/*', smythProxy);
router.put('/*', smythProxy);
router.delete('/*', smythProxy);

export default router;
