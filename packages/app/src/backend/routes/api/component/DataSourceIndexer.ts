import { Router } from 'express';
import { authHeaders, smythAPIReq } from '../../../utils';

const router = Router();

router.get('/namespaces', async (req, res) => {
  try {
    const result = await smythAPIReq.get('/vectors/namespaces', await authHeaders(req));
    return res.json(result.data.namespaces);
  } catch (error) {
    console.log('error', error?.message);
    return res.status(500).json({ error });
  }
});

export default router;
