import {
  addDefaultComponentsAndConnections,
  extractAgentVerionsAndPath,
  getAgentDomainById,
} from "../services/agent-helper";
import config from "../config";

import { createLogger } from "../services/logger";
import { ConnectorService } from "smyth-runtime";
import { DEFAULT_FILE_PARSING_ENDPOINT } from "../constants";

import { refreshBillingCache } from "../services/billing-service";

const console = createLogger("___FILENAME___");

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
  let agentDomain: any = "";
  let isTestDomain = false;
  let { path, version } = extractAgentVerionsAndPath(req.path);
  if (!version) version = agentVersion;
  if (!agentId) {
    const domain = req.hostname;
    const method = req.method;

    try {
      const result = agentDataConnector?.getAgentIdByDomain?.(domain);
      if (result && typeof result.catch === 'function') {
        agentId = await result.catch((error) => {
          console.error(error);
        });
      } else {
        console.error('getAgentIdByDomain method is not available or does not return a promise');
      }
    } catch (error) {
      console.error('Error calling getAgentIdByDomain:', error);
    }
    agentDomain = domain;
    if (agentId && domain.includes(config.env.AGENT_DOMAIN)) {
      isTestDomain = true;
    }
  }
  if (agentId) {
    if (!isTestDomain && agentId && req.hostname.includes("localhost")) {
      console.log(
        `Agent is running on localhost (${req.hostname}), assuming test domain`
      );
      isTestDomain = true;
    }
    if (agentDomain && !isTestDomain && !version) {
      //when using a production domain but no version is specified, use latest
      version = "latest";
    }

    let agentData;
    try {
      const result = agentDataConnector?.getAgentData?.(agentId, version);
      if (result && typeof result.catch === 'function') {
        agentData = await result.catch((error) => {
          console.error(error);
          return { error: error.message };
        });
      } else {
        console.error('getAgentData method is not available or does not return a promise');
        agentData = { error: 'getAgentData method is not available' };
      }
    } catch (error) {
      console.error('Error calling getAgentData:', error);
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
      path.startsWith(DEFAULT_FILE_PARSING_ENDPOINT)
    ) {
      addDefaultComponentsAndConnections(agentData);
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

    req._agent.usingTestDomain = isTestDomain;
    req._agent.domain = agentDomain || (await getAgentDomainById(agentId));
    //req._agent.version = version;
    //req._data1 = 1;

    // Pre-fetch billing data to ensure cached data is readily available for usage limit validation
    // To avoid an additional network call in this middleware, we pass teamId to refreshBillingCache
    // The parentTeamId is then derived from the teamId within refreshBillingCache.
    const parentTeamId = agentData.data?.parentTeamId;
    const teamId = agentData.data?.teamId;
    refreshBillingCache(parentTeamId, teamId);

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
