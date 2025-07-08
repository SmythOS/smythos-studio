import express from 'express';
import config from '../../../config';
import { getM2MToken } from '../../../services/logto-helper';
import axios from 'axios';
const router = express.Router();

router.post('/create-collection', async (req, res) => {
  try {
    const token = await getM2MToken();
    const result = await axios.post(
      `${config.api.SMYTH_M2M_API_URL}/app-config/collections`,
      { name: req.body.name, color: req.body.color, icon: req.body.icon },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    return res.send({ success: true, data: result.data });
  } catch (error) {
    return res.send({ success: false, error: error.message, data: {} });
  }
});

export default router;
