import { Request } from "express";

import { AgentProcess, Logger } from "@smythos/sre";

const console = Logger("(Agent Runner) Service: Agent Request Handler");

export async function processAgentRequest(agent: any, req: Request) {
  if (!agent) {
    return { status: 404, data: "Agent not found" };
  }
  //const req = agent.agentRequest;

  req.socket.on("close", () => {
    // console.log('Client socket closed, killing agent');
    // Handle the cancellation logic
    // agent.kill();
  });

  const hasDebugHeader = [
    "X-DEBUG-RUN",
    "X-DEBUG-READ",
    "X-DEBUG-INJ",
    "X-DEBUG-STOP",
  ].some((header) => req.header(header));

  if (hasDebugHeader) {
    return { status: 403, data: "Debug functions are not supported" };
  }

  return runAgentProcess(agent, req);
}

async function runAgentProcess(agent: any, req: any) {
  try {
    //extract endpoint path
    //live agents (dev) do not have a version number
    //deployed agents have a version number
    const pathMatches = req.path.match(/(^\/v[0-9]+\.[0-9]+?)?(\/api\/(.+)?)/);
    if (!pathMatches || !pathMatches[2]) {
      return { status: 404, data: { error: "Endpoint not found" } };
    }

    const { data: result } = await AgentProcess.load(req._agent)
      .run({
        ...req,
        path: req.path,
        url: undefined,
      })
      .catch((error) => ({ data: { error: error.toString() } }));

    if (result.error) {
      console.error("ERROR", result.error);
      return {
        status: 500,
        data: {
          ...result,
          error: result.error.toString(),
          agentId: agent?.id,
          agentName: agent?.name,
        },
      };
    }

    return { status: 200, data: result };
  } catch (error: any) {
    console.error(error);
    if (error.response) {
      // The request was made, but the server responded with a non-2xx status
      return { status: error.response.status, data: error.response.data };
    } else {
      // Some other error occurred
      return { status: 500, data: "Internal Server Error" };
    }
  }
}
