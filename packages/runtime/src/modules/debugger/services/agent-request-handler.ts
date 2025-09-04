import axios from 'axios';
import { Request } from 'express';

import { AgentProcess, Logger } from '@smythos/sre';

import config from '@/core/config';
import { getMockData } from '@core/helpers/agent.helper';

const console = Logger('Service: Agent Request Handler');

const debugPromises: any = {}; //TODO : persist this ?
export const sseConnections = new Map();

export function getDebugSession(id) {
  console.log(`Getting debug session for agent ${id} with session id ${debugPromises[id]?.dbgSession}`);
  console.log(`Session exists: ${debugPromises[id] ? 'Yes' : 'No'} and session.dbgSession exists: ${debugPromises[id]?.dbgSession ? 'Yes' : 'No'}`);
  console.log(`Debug sessions found for the following agents: ${Object.keys(debugPromises).join(', ')}`);
  return debugPromises[id]?.dbgSession;
}

export function createSseConnection(req: any) {
  const sseId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hour
  const res = req.res;
  const connection = { res, timeout: null };
  // Store the connection
  sseConnections.set(sseId, connection);
  console.log(`Created SSE connection for ${sseId}`);

  const originalWrite = res.write;

  res.write = function (...args) {
    // Reset the inactivity timeout
    clearTimeout(connection.timeout);
    connection.timeout = setTimeout(() => {
      console.log(`Client disconnected: ${sseId}`);
      sseConnections.delete(sseId);
      res.end();
    }, INACTIVITY_TIMEOUT);

    // Call the original res.write
    return originalWrite.apply(res, args);
  };

  // Clean up when the client disconnects
  req.on('close', () => {
    console.log(`Client disconnected: ${sseId}`);
    sseConnections.delete(sseId);
    res.end();
  });

  return sseId;
}

export async function processAgentRequest(agentId: string, req: any) {
  const agentProcess = AgentProcess.load(req._agent);

  if (!agentProcess) {
    return { status: 404, data: 'Agent not found' };
  }

  await agentProcess.ready();
  //const req = agent.agentRequest;

  req.socket.on('close', () => {
    // console.log('Client socket closed, killing agent');
    // Handle the cancellation logic
    //agentProcess.agent.kill();
  });

  const skipDebug = typeof req.header('X-DEBUG-SKIP') != 'undefined';
  const monitorIds = req.header('X-MONITOR-ID')
    ? new Set<string>(
        req
          .header('X-MONITOR-ID')
          .split(',')
          .map((id: string) => id.trim()),
      )
    : undefined;
  if (monitorIds) {
    for (const monitorId of monitorIds) {
      if (sseConnections.has(monitorId)) {
        const connection = sseConnections.get(monitorId);
        agentProcess.agent.addSSE(connection.res, monitorId);
      }
    }
  }

  const readStateId: string = req.header('X-DEBUG-READ') || '';
  if (readStateId) {
    try {
      const result = await agentProcess.readDebugState(readStateId, {
        ...req,
        path: req.url,
        url: undefined,
        headers: {
          ...req.headers,
        },
      });
      return { status: 200, data: result };
    } catch (error: any) {
      console.error(error);
      return { status: 400, data: 'Agent State Unavailable' };
    }
  }

  let startLiveDebug = false;

  if (!skipDebug) {
    startLiveDebug =
      req._agent.usingTestDomain &&
      req._agent.debugSessionEnabled &&
      typeof req.header('X-DEBUG-RUN') == 'undefined' &&
      typeof req.header('X-DEBUG-read') == 'undefined' &&
      typeof req.header('X-DEBUG-INJ') == 'undefined' &&
      typeof req.header('X-DEBUG-STOP') == 'undefined';
  }

  // #region[mock_data]
  let body = [];
  try {
    const mockData = await getMockData(agentId);

    for (const [key, value] of Object.entries(mockData)) {
      let output = {};
      if (value && Object.keys(value).length > 0) {
        output = (value as any)?.data?.outputs;
      }
      if (output && Object.keys(output).length > 0) {
        body.push({
          id: key,
          ctx: {
            active: false,
            output,
          },
        });
      }
    }
  } catch (error) {
    console.warn('Error getting mock data', error);
  }

  // When we have mock data to inject, we need to set the x-mock-data-inj header
  if (body?.length > 0) {
    req.headers['x-mock-data-inj'] = '';
  }

  // If the body is an empty object, we need to convert it to an array
  const existingBody = Object.keys(req.body).length === 0 ? [] : req.body;

  if (Array.isArray(existingBody)) {
    const existingComponentIds = existingBody?.map(item => item.id) || [];

    body = body.filter(item => !existingComponentIds.includes(item.id));

    req.body = [...existingBody, ...body];
  }

  // #endregion[mock_data]

  if (startLiveDebug) {
    return runAgentDebug(agentId, agentProcess, req);
  } else {
    return runAgentProcess(agentId, agentProcess, req);
  }
}

async function runAgentProcess(agentId: string, agentProcess: AgentProcess, req: any) {
  try {
    //const req = agent.agentRequest;
    const debugPromiseId = `${agentId}`;

    if (req.header('X-DEBUG-STOP')) {
      if (debugPromises[debugPromiseId]) {
        console.log(`Debug session for agent ${agentId} with session id ${debugPromiseId} stopped because of X-DEBUG-STOP header. DELETING PROMISE`);
        const dbgPromise: any = debugPromises[debugPromiseId];
        delete debugPromises[debugPromiseId];
        dbgPromise.resolve({ status: 400, error: 'Debug Session Stopped' });
      }
    }

    //at this point dbgPromise might not exist yet
    let dbgPromise = debugPromises[debugPromiseId];
    if (dbgPromise?.sse) {
      //this sse was set by the runAgentDebug() function
      //we need to propagate it in order to capture each execution step stream in the same SSE monitor
      agentProcess.agent.addSSE(dbgPromise.sse);
    }
    //extract endpoint path
    //live agents (dev) do not have a version number
    //deployed agents have a version number
    const pathMatches = req.path.match(/(^\/v[0-9]+\.[0-9]+?)?(\/api\/(.+)?)/);
    if (!pathMatches || !pathMatches[2]) {
      return { status: 404, data: { error: 'Endpoint not found' } };
    }
    const endpointPath = pathMatches[2];
    const input = req.method == 'GET' ? req.query : req.body;
    // const result: any = await agent.process(endpointPath, input).catch((error) => ({ error }));

    const { data: result } = await agentProcess
      .run({
        ...req,
        path: req.path,
        url: undefined,
        headers: {
          ...req.headers,
          //'X-DEBUG-RUN': '',
        },
      })
      .catch(error => ({ data: { error: error.toString() } }));

    if (result.error) {
      console.error('ERROR', result.error);
      //res.status(500).json({ ...result, error: result.error.toString(), agentId: agent.id, agentName: agent.name });
      return {
        status: 500,
        data: {
          ...result,
          error: result.error.toString(),
          agentId: agentId,
          // agentName: agent?.name
          agentName: undefined,
        },
      };
    }
    //handle API embodiments debug response
    const dbgSession = result?.dbgSession || result?.expiredDbgSession || '';
    dbgPromise = debugPromises[debugPromiseId];
    if (dbgSession && dbgPromise) {
      if (result.finalResult) {
        //const result = debugPromises[agent.id].result;
        console.log(
          `Debug session for agent ${agentId} with session id ${debugPromiseId} resolved since the final result is available. DELETING PROMISE`,
        );
        delete debugPromises[debugPromiseId];

        dbgPromise.resolve(result.finalResult);
      }
    }
    return { status: 200, data: result };
  } catch (error: any) {
    console.error(error);
    if (error.response) {
      // The request was made, but the server responded with a non-2xx status
      return { status: error.response.status, data: error.response.data };
    } else {
      // Some other error occurred
      return { status: 500, data: 'Internal Server Error' };
    }
  }
}
async function runAgentDebug(agentId: string, agentProcess: AgentProcess, req: Request) {
  try {
    //const req = agent.agentRequest;
    const debugPromiseId = `${agentId}`;

    const excludedHeaders = ['host', 'content-length', 'accept-encoding'];
    const headers = Object.keys(req.headers)
      .filter(header => !excludedHeaders.includes(header.toLowerCase()))
      .reduce((obj, header) => {
        obj[header] = req.headers[header];
        return obj;
      }, {});
    headers['X-AGENT-ID'] = agentId;
    headers['X-DEBUG-RUN'] = '';

    //'X-DEBUG-RUN': '',
    const port = config.env.PORT;

    let url = `http://localhost:${port}${req.path.replace('/debug', '/api')}`;
    //add query params
    // * query params will add with 'params' property in axios to parse Object type data properly
    /* if (req.query) {
            const query = Object.keys(req.query)
                .map((key) => `${key}=${req.query[key]}`)
                .join('&');
            url += `?${query}`;
        } */

    const input = req.method == 'GET' ? req.query : req.body;

    //check if request has form-data

    //the following line does not handle get request case
    //const apiResponse = await axios.post(url, input, { headers }); //call the actual agentAPI locally

    let apiResponse;
    //make sure to map binary data back to the request body that we'll send to the agent
    // @ts-ignore
    if (req.files) {
      //send request with formData
      const formData = new FormData();
      //@ts-ignore
      for (let file of req.files) {
        const fieldname = file.fieldname;
        //get blob from file.buffer
        const blob = new Blob([file.buffer], { type: file.mimetype });

        formData.append(fieldname, blob, file.originalname);
      }
      for (let entry in req.body) {
        formData.append(entry, req.body[entry]);
      }

      apiResponse = await axios({
        method: req.method,
        url,
        data: formData,
        headers,
        params: req.query,
      });
    } else {
      //send request with json body
      apiResponse = await axios({
        method: req.method,
        url,
        data: req.body,
        headers,
        params: req.query,
      });
    }
    //const apiAgentResponse = await runAgentProcess(agent); //TODO : refactor the internal logic to use runAgentProcess() instead of making a post request
    const dbgSession = apiResponse?.data?.dbgSession;
    if (dbgSession) {
      //const agentId = agent.id;
      if (debugPromises[debugPromiseId]) {
        console.log(
          `Tried to start a new debug session for agent ${agentId}, but a session is already running. req path ${req.path} and url ${req.url}. DELETING THE OLD PROMISE TO START A NEW ONE`,
        );

        agentProcess?.agent?.sse?.close();
        const dbgPromise: any = debugPromises[debugPromiseId];
        dbgPromise.reject({
          status: 400,
          data: {
            error: 'Debug session interrupted by another request',
            details: { debugPromiseId, session: dbgPromise.dbgSession },
          },
        });

        delete debugPromises[debugPromiseId];
      }
      const sessionPromise = new Promise((resolve, reject) => {
        console.log(
          `A new debug session is started for agent ${agentId} with session id ${dbgSession} and req path ${req.path} and url${req.url}. CLIENT IP: ${req.headers['x-forwarded-for']} - ${req.socket.remoteAddress}. X-HASH-ID: ${req.headers['x-hash-id']}`,
        );
        debugPromises[debugPromiseId] = {
          dbgSession,
          resolve,
          reject,
          sse: agentProcess.agent.sse,
        };
        //promise expiration
        setTimeout(
          () => {
            console.log(`Debug session for agent ${agentId} with session id ${dbgSession} expired. DELETING PROMISE`);
            delete debugPromises[debugPromiseId];
            reject({ status: 500, data: 'Debug Session Expired' });
          },
          60 * 60 * 1000, // 1 hour
        );
      });

      const finalResult: any = await sessionPromise.catch(error => ({
        error,
      }));

      agentProcess?.agent?.sse?.close();

      if (finalResult?.error) {
        return {
          status: finalResult.status || 500,
          data: { error: finalResult.error },
        };
      }

      let data = finalResult;

      return { status: 200, data };
    }
    //res.status(apiResponse.status).send(apiResponse.data);
  } catch (error: any) {
    if (error.response) {
      // The request was made, but the server responded with a non-2xx status
      console.error(error.response.status, error.response.data);
      return { status: error.response.status, data: error.response.data };
    } else {
      // Some other error occurred
      console.error(error);
      return { status: 500, data: 'Internal Server Error' };
    }
  }
}

process.on('MANAGEMENT:DISABLE_PORT' as any, async () => {
  // close each connection at once using promise.all
  console.log('Closing all SSE connections');
  sseConnections.forEach(connection => {
    connection.res.end();
  });
  sseConnections.clear();
});
