import express from "express";

import { Logger } from "@smythos/sre";

import agentLoader from "@debugger/middlewares/agentLoader.mw";
import {
  createSseConnection,
  getDebugSession,
  processAgentRequest,
} from "@debugger/services/agent-request-handler";

const console = Logger("[Debugger] Router: Agent");

const router = express.Router();

const middlewares = [agentLoader];

router.get("/agent/:id/debugSession", (req, res, next) => {
  console.log(
    `Getting debug session for agent ${req.params.id} with client IP ${req.headers["x-forwarded-for"]} - ${req.socket.remoteAddress}. x-hash-id ${req.headers["x-hash-id"]}`
  );
  const dbgSession = getDebugSession(req.params.id);
  res.send({ dbgSession });
});

router.get("/agent/:id/monitor", (req, res, next) => {
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

  return res.status(result?.status || 500).send(result?.data);
});
router.get(`/api/*`, middlewares, async (req, res) => {
  const agent: any = req._agent;
  const result: any = await processAgentRequest(agent.id, req);

  return res.status(result?.status || 500).send(result?.data);
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
    const result: any = await processAgentRequest(agent.id, req);
    return res.status(result?.status || 500).send(result?.data);
  }
);

export default router;
