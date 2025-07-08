import express from 'express';

import templatesRouter from './templates/router';

const router = express.Router();

router.use('/templates', templatesRouter);

export default router;
