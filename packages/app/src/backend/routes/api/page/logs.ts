import express from 'express';
import path from 'path';
import fs from 'fs';
import config from '../../../config';
import { authHeaders, includeAxiosAuth, smythAPI } from '../../../utils';
import { AxiosError } from 'axios';
import {
  checkObjectOwnership,
  extractObjectKeyFromUrl,
  getObjectDataByKey,
  isStorageFile,
} from '../../../utils/storage.utils';
import { Team } from '../../../types';
const router = express.Router();

router.get('/:agentId', async (req, res) => {
  const { tag, sessionID, page = 1, limit = 10 } = req.query;
  const { agentId } = req.params;

  const token = req.user.accessToken;

  if (!tag && !sessionID) {
    const data = await getSessions(
      req,
      agentId,
      token,
      parseInt(page.toString()),
      parseInt(limit.toString()),
    );

    if (data.error) {
      return res.status(500).json({ error: data.error });
    }
    return res.json(data);
  }

  if (tag) {
    const data = await getLogsByTag(req, agentId, tag, token);
    if (data.error) {
      return res.status(500).json({ error: data.error });
    }
    return res.json(data);
  }

  if (sessionID) {
    const data = await getLogsBySession(req, agentId, sessionID, token);
    if (data.error) {
      return res.status(500).json({ error: data.error });
    }
    return res.json(data);
  }
});

router.get('/:agentId/fulldata', async (req, res) => {
  const { agentId } = req.params;
  const { id } = req.query;
  const token = req.user.accessToken;

  console.log('Fetching logs for agent', agentId, 'with id', id);

  try {
    // const team: Team = (await smythAPI.get('/teams/me', includeAxiosAuth(token))).data.team;
    const teamId = req.headers['x-smyth-team-id'];
    // const userId = team.userId;
    // const url = req.body.url;

    const key = `teams/${teamId}/logs/${agentId}/${id}`;

    await checkObjectOwnership(key, {
      // @ts-ignore
      teamId,
      // @ts-ignore
      userId: undefined,
    });

    const data = await getObjectDataByKey(key);

    return res.send(data);
  } catch (error) {
    return res.status(500).json({ error: 'Cannot Read Data' });
  }
});

async function getLogsByTag(req, agentId, tag, token) {
  try {
    const response = await smythAPI.get(
      `/ai-agent/${agentId}/logs/calls?tags=${tag?.toString()?.substring(0, 256)}`,
      await authHeaders(req),
    );
    // const columns = Object.keys(response.data.logs[0]);
    // const data = response.data.logs.map((e) => Object.values(e));
    const data = response.data.logs.map((e) => {
      delete e.id;
      if (typeof e.result == 'string') {
        try {
          e.result = JSON.parse(e.result);
        } catch (e) {}
      }
      if (typeof e.error == 'string') {
        try {
          e.error = JSON.parse(e.error);
        } catch (e) {}
      }
      return e;
    });
    return data;
  } catch (error: any) {
    return { error: error.response?.data };
  }
}

async function getLogsBySession(req, agentId, sessionID, token) {
  try {
    const response = await smythAPI.get(
      `/ai-agent/${agentId}/logs/calls?sessionID=${sessionID?.toString()?.substring(0, 256)}`,
      await authHeaders(req),
    );
    // const columns = Object.keys(response.data.logs[0]);
    // const data = response.data.logs.map((e) => Object.values(e));
    const data = response.data.logs.map((e) => {
      delete e.id;
      if (typeof e.result == 'string') {
        try {
          e.result = JSON.parse(e.result);
        } catch (e) {}
      }
      if (typeof e.error == 'string') {
        try {
          e.error = JSON.parse(e.error);
        } catch (e) {}
      }
      return e;
    });
    return data;
  } catch (error: any) {
    return { error: error.response?.data };
  }
}

async function getSessions(req, agentId, token, page = 1, limit = 10) {
  try {
    const response = await smythAPI.get(
      `/ai-agent/${agentId}/logs/sessions?page=${page}&limit=${limit}`,
      await authHeaders(req),
    );
    const logs = response.data.logs || [];
    const totalLogs = response.data.total || 0;
    const totalPages = Math.ceil(totalLogs / limit);

    return {
      logs,
      totalLogs,
      totalPages,
      currentPage: page,
    };
  } catch (error) {
    return { error: error.response?.data };
  }
}

export default router;
