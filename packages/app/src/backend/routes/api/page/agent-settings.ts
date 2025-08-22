import { randomUUID } from 'crypto';
import express, { Request } from 'express';
import { rateLimit } from 'express-rate-limit';
import { generateLinkedInAvatarPrompt } from '../../../../shared/constants/prompts';
import { includeTeamDetails } from '../../../middlewares/auth.mw';
import * as falai from '../../../services/falai-helper';
import SmythPubStaticStorage from '../../../services/storage/SmythStaticStorage.class';
import * as userData from '../../../services/user-data.service';
import { getAgents } from '../../../services/user-data.service';
import { authHeaders, forwardToSmythAPIMiddleware, smythAPIReq } from '../../../utils';
const router = express.Router();
const staticStorage = new SmythPubStaticStorage();

// routes for dynamic content goes here

router.get('/agent/:id/settings', async (req, res) => {
  const { id } = req.params;
  try {
    const response = await smythAPIReq.get(`/ai-agent/${id}/settings`, await authHeaders(req));
    return res.json(response.data.settings);
  } catch (error) {
    return res.status(500).json({ error: 'Something went wrong while fetching agent settings' });
  }
});

router.put('/agent/:id/settings', async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  try {
    const response = await smythAPIReq.put(
      `/ai-agent/${id}/settings`,
      data,
      await authHeaders(req),
    );

    return res.json(response.data.message);
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ error: 'Something went wrong while updating agent settings' });
  }
});

router.get('/ai-agent/:agentId/deployments', forwardToSmythAPIMiddleware());
router.get('/ai-agent/:agentId/deployments/latest', forwardToSmythAPIMiddleware());

router.post('/embodiment', async (req, res) => {
  try {
    const response = await smythAPIReq.post(`/embodiments`, req.body, await authHeaders(req));

    return res.json(response.data);
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ error: 'Something went wrong while saving the embodiment' });
  }
});

router.put('/embodiment', async (req, res) => {
  try {
    const response = await smythAPIReq.put(`/embodiments`, req.body, await authHeaders(req));

    return res.json(response.data);
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ error: 'Something went wrong while updating the embodiment' });
  }
});

router.get('/embodiments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const response = await smythAPIReq.get(`/embodiments?aiAgentId=${id}`, await authHeaders(req));

    return res.json(response.data);
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ error: 'Something went wrong while fetching the embodiment' });
  }
});

router.get('/agents', async (req, res) => {
  try {
    const { page, limit, search, sortField, order } = req.query;
    const includeSettings = true;
    const _agents = await getAgents(
      req,
      includeSettings,
      page.toString(),
      limit.toString(),
      search,
      sortField,
      order,
    );

    return res.json(_agents);
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ error: 'Something went wrong while fetching agents list' });
  }
});

router.post('/lock', async (req, res) => {
  const { agentId } = req.body;
  const userId = req?._user?.id;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'User not found' });
  }

  const result: any = await userData.lockAgent(req, agentId).catch((error) => ({ error }));
  if (result.error) {
    return res.status(400).json({ success: false, error: result.error.message });
  }
  res.send({ success: true, lock: result.lock });
});
router.put('/release-lock', async (req, res) => {
  const { agentId, lockId } = req.body;
  const userId = req?._user?.id;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'User not found' });
  }

  const result: any = await userData
    .unlockAgent(req, agentId, lockId)
    .catch((error) => ({ error }));
  if (result.error) {
    return res.status(400).json({ success: false, error: result.error.message });
  }
  res.send({ success: true });
});

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
  '/ai-agent/:agentId/avatar/upload',
  [includeTeamDetails, uploadAvatarMw.single('avatar')],
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Internal Server Error' });
    }

    // @ts-ignore
    const key = req.file.key;
    const publicUrl = staticStorage.getPublicUrl(key);

    // save the avatar in the agent settings
    await smythAPIReq.put(
      `/ai-agent/${req.params.agentId}/settings`,
      {
        key: 'avatar',
        value: publicUrl,
      },
      await authHeaders(req),
    );

    return res.json({ success: true, url: publicUrl });
  },
);

const avatarGenRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 10,
  keyGenerator: (req) => {
    return req._team?.id;
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  requestPropertyName: 'avatarGenRateLimit',
});
router.post(
  '/ai-agent/:agentId/avatar/auto-generate',
  [includeTeamDetails, avatarGenRateLimiter],
  async (req: Request, res) => {
    try {
      const base64Image: string = await falai.generateImage({
        prompt: generateLinkedInAvatarPrompt(),
      });

      const key = SmythPubStaticStorage.path(
        'teams',
        SmythPubStaticStorage.hash(req._team.id),
        `avatar-${randomUUID()}`,
      );
      const uploaded = await staticStorage.saveContent({
        key,
        contentType: 'image/png',
        body: Buffer.from(base64Image, 'base64'),
        skipAclCheck: true,
      });

      if (!uploaded.success) {
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      const publicUrl = uploaded.url;

      // save the avatar in the agent settings
      await smythAPIReq.put(
        `/ai-agent/${req.params.agentId}/settings`,
        {
          key: 'avatar',
          value: publicUrl,
        },
        await authHeaders(req),
      );

      return res.json({ success: true, url: publicUrl });
    } catch (error) {
      console.log('Error generating avatar', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },
);

router.delete('/ai-agent/:agentId/avatar', async (req, res) => {
  try {
    const response = await smythAPIReq.delete(
      `/ai-agent/${req.params.agentId}/settings/avatar`,
      await authHeaders(req),
    );
    return res.json(response.data);
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ error: 'Something went wrong while deleting agent avatar' });
  }
});

// forward rest of the requests to smyth api
router.get('/ai-agent/*', forwardToSmythAPIMiddleware());
router.post('/ai-agent/*', forwardToSmythAPIMiddleware());
router.put('/ai-agent/*', forwardToSmythAPIMiddleware());
router.delete('/ai-agent/*', forwardToSmythAPIMiddleware());
export default router;
