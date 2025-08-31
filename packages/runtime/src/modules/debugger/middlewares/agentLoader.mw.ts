import { ConnectorService, Logger } from "@smythos/sre";

import config from "@core/config";
import {
  addDefaultComponentsAndConnections,
  extractAgentVerionsAndPath,
  getAgentDomainById,
} from "@core/helpers/agent.helper";

const console = Logger("[Debugger] Middleware: agentLoader");

export default async function agentLoader(req, res, next) {
  console.log("agentLoader", req.path);
  const agentDataConnector = ConnectorService.getAgentDataConnector();

  if (req.path.startsWith("/static/")) {
    return next();
  }
  let agentId = req.header("X-AGENT-ID");
  let agentVersion = req.header("X-AGENT-VERSION") || "";
  const isAgentChatRequest = req.header("x-conversation-id") !== undefined;
  const isAgentFileParsingRequest =
    isAgentChatRequest || req.header("X-AGENT-REMOTE-CALL") !== undefined;
  const debugHeader =
    req.header("X-DEBUG-STOP") !== undefined ||
    req.header("X-DEBUG-RUN") !== undefined ||
    req.header("X-DEBUG-INJ") !== undefined ||
    req.header("X-DEBUG-READ") !== undefined;

  let agentDomain: any = "";
  let isTestDomain = false;
  let { path, version } = extractAgentVerionsAndPath(req.path);
  if (!version) version = agentVersion;
  const domain = req.hostname;
  const method = req.method;

  if (!agentId) {
    try {
      const result = agentDataConnector?.getAgentIdByDomain?.(domain);
      if (result && typeof result.catch === "function") {
        agentId = await result.catch((error) => {
          console.error(error);
        });
      } else {
        console.error(
          "getAgentIdByDomain method is not available or does not return a promise"
        );
      }
    } catch (error) {
      console.error("Error calling getAgentIdByDomain:", error);
    }
  }
  agentDomain = domain;
  if (agentId && domain.includes(config.env.AGENT_DOMAIN)) {
    isTestDomain = true;
  }
  if (agentId) {
    if (!isTestDomain && agentId && req.hostname.includes("localhost")) {
      console.log(
        `Host ${req.hostname} is using debug session. Assuming test domain`
      );
      isTestDomain = true;
    }
    if (agentDomain && !isTestDomain && !version && !debugHeader) {
      //when using a production domain but no version is specified, use latest
      version = "latest";
    }
    let agentData;
    try {
      const result = agentDataConnector?.getAgentData?.(agentId, version);
      if (result && typeof result.catch === "function") {
        agentData = await result.catch((error) => {
          console.error(error);
          return { error: error.message };
        });
      } else {
        console.error(
          "getAgentData method is not available or does not return a promise"
        );
        agentData = { error: "getAgentData method is not available" };
      }
    } catch (error) {
      console.error("Error calling getAgentData:", error);
      agentData = { error: error.message };
    }
    if (agentData?.error) {
      // return Not found error for storage requests
      if (req.path.startsWith("/storage/")) {
        return res.status(404).send(`File Not Found`);
      }
      return res.status(500).send({ error: agentData.error });
    }

    if (
      isAgentFileParsingRequest &&
      path.startsWith("/api/process_attachment_fallback")
    ) {
      // only add default components and connections for file parsing agent on file parsing requests
      addDefaultComponentsAndConnections(agentData);
      req.headers["x-debug-skip"] = "true"; // should be lowercase
    }

    // clean up agent data
    cleanAgentData(agentData);

    req._plan = agentData.data.planInfo;
    req._agent = agentData.data;
    req._agent.planInfo = req._plan || {
      planId: undefined,
      planName: undefined,
      isFreePlan: true,
      tasksQuota: 0,
      usedTasks: 0,
      remainingTasks: 0,
      maxLatency: 100,
    };

    if (!isTestDomain && req._agent.debugSessionEnabled && debugHeader) {
      console.log(
        `Host ${req.hostname} is using debug session. Assuming test domain.#2`
      );
      isTestDomain = true;
    }

    req._agent.usingTestDomain = isTestDomain;
    req._agent.domain = agentDomain || (await getAgentDomainById(agentId));

    console.log(
      `Loaded Agent:${agentId} v=${version} path=${path} isTestDomain=${isTestDomain} domain=${agentDomain}`
    );
    return next();
  }

  return res.status(404).send({ error: `${req.path} Not Found` });
}
// clean up agent data
function cleanAgentData(agentData) {
  if (agentData) {
    // remove Note components
    agentData.data.components = agentData.data.components.filter(
      (c) => c.name != "Note"
    );

    // remove templateInfo
    delete agentData.data?.templateInfo;

    // TODO : remove UI attributes
  }
  return agentData;
}
