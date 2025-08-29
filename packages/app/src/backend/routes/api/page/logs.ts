// TODO: move to enterprise app

import { privateStorage } from '@src/backend/services/storage';
import express from 'express';
import { authHeaders, smythAPI } from '../../../utils';
import { checkObjectOwnership } from '../../../utils/storage.utils';
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

async function getObjectDataByKey(key: string) {
  // return new Promise(async (resolve, reject) => {
  //   try {
  //     const response: any = await abstractedS3Client.getObject({
  //       Bucket: config.env.AWS_S3_BUCKET_NAME,
  //       Key: key,
  //     });
  //     const request = response.Body;
  //     let dataChunks = [];

  //     // Listen for data events to collect the chunks
  //     request.on('data', (chunk) => {
  //       dataChunks.push(chunk);
  //     });

  //     // Handle the end of the stream and convert the chunks to a string
  //     request.on('end', () => {
  //       const completeData = Buffer.concat(dataChunks);
  //       const bodyContent = completeData.toString('utf-8');
  //       resolve(bodyContent);
  //     });

  //     // Error handling for the stream
  //     request.on('error', (error) => {
  //       console.error('Error reading the S3 object stream:', error);
  //       reject(error);
  //     });
  //   } catch (error) {
  //     reject(error);
  //   }
  // });

  const stream = await privateStorage.getStream(key);

  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];

    stream.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    stream.on('error', (error) => {
      console.error('Error reading the Log verbose content object stream:', error);
      reject('Error reading the Log verbose content object stream');
    });
  });
}

export default router;
