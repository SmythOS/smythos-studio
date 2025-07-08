import express, { Request, Response } from 'express';
import axios from 'axios';

import { APIResponse } from '../../../types/';

const router = express.Router();

const SETTINGS_KEY = 'OpenAPI';

router.get('/fetch-spec', async (req: Request, res: Response<APIResponse>) => {
  const { url } = req.query;

  try {
    const response = await axios.get(url as string);

    const data = response.data;

    res.send(data);
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
});

export default router;
