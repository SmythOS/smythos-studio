import express from "express";
import agentLoader from "../../middlewares/agentLoader.mw";
import cors from "../../middlewares/cors.mw";
import {
  createSseConnection,
  getDebugSession,
  processAgentRequest,
} from "../../services/agent-request-handler";
import uploadHandler from "../../middlewares/uploadHandler.mw";
import ParallelRequestLimiter from "../../middlewares/ParallelRequestLimiter.mw";
import { createLogger } from "../../services/logger";
const console = createLogger("___FILENAME___");
const router = express.Router();

/* agentLoader must come before agentAuth because agentAuth relies on req._agent, set by agentLoader.
Also, uploadHandler should precede agentLoader to parse multipart/form-data correctly */
const middlewares = [cors, uploadHandler, agentLoader, ParallelRequestLimiter];

router.options("*", [cors]); //enable CORS for preflight requests

router.get("/agent/:id/debugSession", [cors], (req, res, next) => {
  console.log(
    `Getting debug session for agent ${req.params.id} with client IP ${req.headers["x-forwarded-for"]} - ${req.socket.remoteAddress}. x-hash-id ${req.headers["x-hash-id"]}`
  );
  const dbgSession = getDebugSession(req.params.id);
  res.send({ dbgSession });
});

router.get("/agent/:id/monitor", [cors], (req, res, next) => {
  const sseId = createSseConnection(req);

  // Set headers for SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Send the unique ID as the first event
  res.write(`event: init\n`);
  res.write(`data: ${sseId}\n\n`);
});

router.post(`/api/*`, middlewares, async (req, res) => {
  const agent = req._agent;
  const result: any = await processAgentRequest(agent.id, req);
  // const result = await sreAdapter.debugRun(agent.id, req);
  return res.status(result?.status || 500).send(result?.data);
});
router.get(`/api/*`, middlewares, async (req, res) => {
  const agent: any = req._agent;
  const result: any = await processAgentRequest(agent.id, req);

  // const result = await sreAdapter.debugRun(agent.id, req);
  return res.status(result?.status || 500).send(result?.data);
  // return res.status(200).send(result);
});

router.post(`/:version/api/*`, middlewares, async (req, res) => {
  const agent: any = req._agent;
  const result: any = await processAgentRequest(agent.id, req);
  return res.status(result?.status || 500).send(result?.data);
});
router.get(`/:version/api/*`, middlewares, async (req, res) => {
  const agent: any = req._agent;
  const result: any = await processAgentRequest(agent.id, req);
  return res.status(result?.status || 500).send(result?.data);
});

router.post(
  /^\/v[0-9]+(\.[0-9]+)?\/api\/(.+)/,
  middlewares,
  async (req, res) => {
    const agent: any = req._agent;
    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }
    //const parts = req.url.split('/');
    //const version = parts[1];
    //const endpoint = parts[3];

    const result: any = await processAgentRequest(agent.id, req);
    return res.status(result?.status || 500).send(result?.data);
    //res.send({ result: `Not implemented yet\nVersion: ${version}, Endpoint: ${endpoint}` });
  }
);

// router.post(`/component/:name`, middlewares, async (req, res) => {
//     const { name } = req.params;
//     const component = Components[name];
//     if (!component) {
//         res.status(404).send('Component not found');
//         return;
//     }
//     const result = await component.process(req.body).catch((error) => ({ error }));
//     if (result.error) {
//         res.status(500).send(result);
//         return;
//     }
//     res.send(result);
// });

export default router;
