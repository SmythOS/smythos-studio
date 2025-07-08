import express from 'express';
import { forwardToSmythAPIMiddleware } from '../../../utils';

const router = express.Router();
const smythProxy = forwardToSmythAPIMiddleware();

router.get('/quota/*', smythProxy);
router.post('/quota/*', smythProxy);
router.put('/quota/*', smythProxy);
router.delete('/quota/*', smythProxy);

export default router;
