import express from 'express';
import { authHeaders, smythAPI } from '../../../utils';
import axios from 'axios';
import config from '../../../../backend/config';
import { getM2MToken } from 'src/backend/services/logto-helper';
const router = express.Router();

const subTeamAPIReq = axios.create({
  baseURL: `${config.env.UI_SERVER}`,
});
router.delete('/deletesubteam', async (req, res) => {
  console.log('req.body', req.body);
  try {
    const response = await subTeamAPIReq.delete(`/app/page/teams/subteams/${req.body.id}`, {
      headers: req.headers,
      data: req.body,
    });
    console.log('response', response);
    return res.json(response.data);
  } catch (error: any) {
    // Type guard to check if error is an instance of Error
    if (error instanceof Error) {
      console.error('Error deleting subteam:', error.message);
    } else {
      console.error('An unknown error occurred while deleting subteam');
    }
    if (error?.response?.data?.error) {
      return res
        .status(error?.response?.data?.error?.code)
        .json({ error: error?.response?.data?.error });
    } else {
      return res.status(500).json({ error: error?.message });
    }
  }
});
router.delete('/unassignmember', async (req, res) => {
  try {
    const response = await subTeamAPIReq.delete(
      `/app/page/teams/${req.body.teamId}/members/unassign/${req.body.memberId}`,
      {
        headers: req.headers,
        data: {
          memberId: req.body.memberId,
          subteamId: req.body.teamId,
        },
      },
    );
    return res.json(response.data);
  } catch (error: unknown) {
    // Type guard to check if error is an instance of Error
    if (error instanceof Error) {
      console.error('Error unassigning member:', error.message);
    } else {
      console.error('An unknown error occurred while unassigning member');
    }
    return res.status(500).json({ error: 'Something went wrong' });
  }
});

export default router;
