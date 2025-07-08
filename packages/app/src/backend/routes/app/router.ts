import express from 'express';
import appPageRouter from './page/index';

const router = express.Router();

router.use('/page/:pageName', (req, res, next) => {
  const pageName = req.params.pageName;
  // Check if the router exists in the routers index
  if (appPageRouter[pageName]) {
    // Use the selected router
    appPageRouter[pageName](req, res, next);
  } else {
    res.status(404).send({ error: 'Page API not found : ' + pageName });
  }
});

export default router;
