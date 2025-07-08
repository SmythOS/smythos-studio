import express from 'express';
import {
  authHeaders,
  forwardToSmythAPIMiddleware,
  smythAPI,
  smythAPIReq,
} from '../../../utils';
import {
  checkObjectOwnership,
  extractObjectKeyFromUrl,
  isStorageFile,
} from '../../../utils/storage.utils';
import { includeTeamDetails } from '../../../middlewares/auth.mw';

const router = express.Router();

router.get('/vectorsNamespaceList', async (req, res) => {
  try {
    const { page, limit } = req.query;
    const result = await smythAPIReq.get(
      `/vectors/namespaces?page=${page}&limit=${limit}`,
      await authHeaders(req),
    );
    return res.json(result.data);
  } catch (error) {
    console.log('error', error);
    return res.status(500).json({ error });
  }
});

router.post('/addDatasource', includeTeamDetails, async (req, res) => {
  const url = req.body.url;
  try {
    if (isStorageFile(url)) {
      const key = extractObjectKeyFromUrl(url);

      await checkObjectOwnership(key, {
        // @ts-ignore
        teamId: req._team.id,
        // @ts-ignore
        userId: req._team.userId,
      });
    }
  } catch (error) {
    return res.status(403).json({ error: error.message });
  }
  const body = req.body;
  try {
    const result = await smythAPI.post(`/vectors/datasources`, body, await authHeaders(req));
    return res.json({ res: result.data });
  } catch (error) {
    return res.status(error?.response?.status || 500).json({ error: error?.response?.data });
  }
});

router.get('/datasourceList', async (req, res) => {
  try {
    const { namespaceName, page, limit } = req.query;
    const result = await smythAPIReq.get('/vectors/datasources', {
      params: { namespaceName, page, limit },
      ...(await authHeaders(req)),
    });
    return res.json({ res: result.data });
  } catch (error) {
    console.log('error', error);
    return res.status(500).json({ error });
  }
});

router.get('/sitemapStatus', async (req, res) => {
  try {
    const { id } = req.query;
    const result = await smythAPIReq.get(
      `/vectors/datasources/${id}/sitemap_status`,
      await authHeaders(req),
    );
    return res.json({ res: result.data });
  } catch (error) {
    console.log('error', error);
    return res.status(500).json({ error });
  }
});

router.get('/datasourceStatus', async (req, res) => {
  try {
    const { id } = req.query;
    const result = await smythAPIReq.get(
      `/vectors/datasources/${id}/status`,
      await authHeaders(req),
    );
    return res.json({ res: result.data });
  } catch (error) {
    console.log('error', error);
    return res.status(500).json({ error });
  }
});

router.delete('/deleteDatasource', async (req, res) => {
  try {
    const { id } = req.query;
    const result = await smythAPIReq.delete(`/vectors/datasources/${id}`, await authHeaders(req));
    return res.json({ res: result.data });
  } catch (error) {
    console.log('error', error.response);
    return res.status(error?.response?.status || 500).json({ error: error?.response?.data });
  }
});

const smythProxy = forwardToSmythAPIMiddleware({ endpointBuilder: (req) => `/vectors${req.url}` });

// forward all other requests to smyth api
router.get('/*', smythProxy);
router.post('/*', smythProxy);
router.put('/*', smythProxy);
router.delete('/*', smythProxy);

export default router;
