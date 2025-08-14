import express from 'express';
import { forwardToSmythAPIMiddleware } from '../../../utils';
const router = express.Router();
const smythProxy = forwardToSmythAPIMiddleware({ endpointBuilder: (req) => `/teams${req.url}` });

router.get('/*', smythProxy);
router.post('/*', smythProxy);
router.put('/*', smythProxy);
router.delete('/*', smythProxy);

export default router;
