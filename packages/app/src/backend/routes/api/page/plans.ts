import express from 'express';
import { authHeaders, forwardToSmythAPIMiddleware, smythAPI } from '../../../utils';

const router = express.Router();
const smythProxy = forwardToSmythAPIMiddleware();

router.get('/subscriptions/*', smythProxy);

router.post('/subscriptions/checkout/generate-session', async (req, res) => {
  const tid = req.cookies['_fprom_tid'];

  try {
    const response = await smythAPI.post(
      '/subscriptions/checkout/generate-session',
      {
        ...req.body,
        tid,
      },
      await authHeaders(req),
    );

    return res.json(response.data);
  } catch (error) {
    return res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: 'Internal Server Error' });
  }
});

router.post('/subscriptions/*', smythProxy);
router.put('/subscriptions/*', smythProxy);
router.delete('/subscriptions/*', smythProxy);

export default router;
