import express from 'express';
import { getAgents } from '../../../services/user-data.service';
import { authHeaders, smythAPIReq } from '../../../utils';
const router = express.Router();

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

// AGENT PIN/UNPIN
router.post('/ai-agent/:agentId/pin', async (req, res) => {
  try {
    const { agentId } = req.params;
    const response = await smythAPIReq.post(`/ai-agent/${agentId}/pin`, {}, await authHeaders(req));
    
    return res.json(response.data);
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ error: error?.message || 'Something went wrong while pinning the agent' });
  }
});

router.delete('/ai-agent/:agentId/pin', async (req, res) => {
  try {
    const { agentId } = req.params;
    const response = await smythAPIReq.delete(`/ai-agent/${agentId}/pin`, await authHeaders(req));
    
    return res.json(response.data);
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ error: error?.message || 'Something went wrong while unpinning the agent' });
  }
});

export default router;
