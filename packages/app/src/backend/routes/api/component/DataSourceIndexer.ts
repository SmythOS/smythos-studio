import axios from 'axios';
import { Router } from 'express';
import config from '../../../config';
import { authHeaders, smythAPIReq } from '../../../utils';

const router = Router();

const getAuthHeaders = (req: any) => {
  const headers: Record<string, string> = {};

  if (req.user?.accessToken) {
    headers['Authorization'] = `Bearer ${req.user.accessToken}`;
  }

  if (req.headers['x-smyth-team-id']) {
    headers['x-smyth-team-id'] = req.headers['x-smyth-team-id'];
  }

  // Add debug header for routing through debugger server
  headers['x-smyth-debug'] = 'true';

  return headers;
};

router.get('/namespaces', async (req, res) => {
  try {
    const result = await smythAPIReq.get('/vectors/namespaces', await authHeaders(req));
    return res.json(result.data.namespaces);
  } catch (error) {
    console.log('error', error?.message);
    return res.status(500).json({ error });
  }
});

router.get('/v2/namespaces', async (req, res) => {
  const url = `${config.env.API_SERVER}/user/data-pools/namespaces`;

  try {
    const result = await axios.get(url, {
      headers: getAuthHeaders(req),
    });

    return res.json(result.data.namespaces);
  } catch (error) {
    console.error('Error fetching namespaces:', error?.response?.data || error.message);

    const errorData = error?.response?.data;

    if (errorData && typeof errorData === 'object') {
      return res.status(error?.response?.status || 500).json(errorData);
    }

    return res.status(error?.response?.status || 500).json({
      error: errorData || 'Failed to fetch namespaces',
    });
  }
});

export default router;
