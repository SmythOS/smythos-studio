import express from 'express';
import { smythAPIReq, forwardToSmythAPIMiddleware, authHeaders } from '../../../utils/';

const router = express.Router();

router.get('/domainsList', async (req, res) => {
  try {
    const result = await smythAPIReq.get('/domains?verified=true', await authHeaders(req));
    return res.json(result.data.domains);
  } catch (error) {
    console.log('error', error);
    return res
      .status(error?.status || error?.response?.status || 500)
      .json({ error: error?.message });
  }
});

const smythProxy = forwardToSmythAPIMiddleware({ endpointBuilder: (req) => `/domain${req.url}` });

// forward all other requests to smyth api
router.get('/*', smythProxy);
router.post('/*', smythProxy);
router.put('/*', smythProxy);
router.delete('/*', smythProxy);

export default router;
