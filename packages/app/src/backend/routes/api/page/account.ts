import express from 'express';
import path from 'path';
import fs from 'fs';
import config from '../../../config';
import { authHeaders, smythAPI } from '../../../utils';
import { getAgents } from '../../../services/user-data.service';
import { AxiosError } from 'axios';
const router = express.Router();

router.delete('/', async (req: express.Request | any, res: express.Response | any) => {
  try {
    const response = await smythAPI.delete('/user/account', await authHeaders(req));
  } catch (error: any) {
    return res.status(error?.status || error?.response?.status || 500).json(error.response?.data);
  }

  req.session.destroy(function (err) {
    if (err) {
      // handle error
    } else {
      // session destroyed, redirect or perform other actions
      console.log('invalid session, redirecting to login');
    }
  });

  return res.status(200).json({ message: 'Account deleted successfully' });
});

export default router;
