import express from 'express';
import grafanaProxy from './grafana-proxy';
import config from '../../config';

const router = express.Router();

router.use('/', grafanaProxy);
router.use('/api/ds/query', [express.json()], grafanaProxy);

export default router;
