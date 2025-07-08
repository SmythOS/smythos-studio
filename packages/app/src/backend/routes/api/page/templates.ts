import express from 'express';
import { readAgentTemplates } from '../../router.utils';

const router = express.Router();

router.get('/agent-templates', async (req, res) => {
  try {
    const templates = await readAgentTemplates(req);
    return res.send({ success: true, data: templates });
  } catch (error) {
    return res.send({ success: true, data: {} });
  }
});

export default router;
