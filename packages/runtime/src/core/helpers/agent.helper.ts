import axios from "axios";
import config from "../config";

import { Logger } from "@smythos/sre";

import { includeAuth, mwSysAPI } from "../services/smythAPIReq";
import { getM2MToken } from "./logto.helper";

import {
  AGENT_AUTH_SETTINGS_KEY,
  MOCK_DATA_SETTINGS_KEY,
  PROD_VERSION_VALUES,
  TEST_VERSION_VALUES,
} from "@core/constants";
import { AccessCandidate, ConnectorService } from "@smythos/sre";
import { defaultFileParsingAgent } from "../default-file-parsing-agent";

const logger = Logger("(Core) Service: Agent Helper");

export function extractAgentVerionsAndPath(url) {
  const regex = /^\/v(\d+(\.\d+)?)?(\/api\/.+)/;
  const match = url.match(regex);

  if (match) {
    return {
      path: match[3],
      version: match[1] || "",
    };
  } else {
    return {
      path: url,
      version: "",
    };
  }
}

export async function getAgentDomainById(agentId: string) {
  const token = (await getM2MToken("https://api.smyth.ai")) as string;
  const agentDataConnector = ConnectorService.getAgentDataConnector();

  const Authorization = `Bearer ${token}`;

  const result: any = await mwSysAPI
    .get("/domains?verified=true", { headers: { Authorization } })
    .catch((error) => ({ error }));

  if (result.error) {
    throw new Error("Error getting domain info");
  }

  const domain = result.data.domains.find(
    (domainEntry: any) => domainEntry?.aiAgent?.id === agentId
  )?.name;

  if (!domain) {
    const deployed = await agentDataConnector.isDeployed(agentId);
    if (deployed) {
      return `${agentId}.${config.env.PROD_AGENT_DOMAIN}`;
    } else {
      return `${agentId}.${config.env.AGENT_DOMAIN}`;
    }
  }
  return domain;
}

export async function readAgentOAuthConfig(agentData) {
  const authInfo = await getAgentAuthData(agentData.id);
  const method = authInfo?.method;
  const provider = authInfo?.provider[authInfo?.method];
  if (!provider) {
    return {};
  }
  const authOIDCConfigURL = provider.OIDCConfigURL;
  const clientID = provider.clientID;
  const clientSecret = provider.clientSecret;
  const openid: any = await axios
    .get(authOIDCConfigURL)
    .catch((error) => ({ error }));

  const tokenURL = openid?.data?.token_endpoint;
  const authorizationURL = openid?.data?.authorization_endpoint;

  return {
    authorizationURL,
    tokenURL,
    clientID,
    clientSecret,
    method,
    provider,
  };
}

export function getAgentIdAndVersion(model: string) {
  const [agentId, version] = model.split("@");
  let agentVersion = version?.trim() || undefined;
  if (TEST_VERSION_VALUES.includes(agentVersion)) {
    agentVersion = "";
  }
  if (PROD_VERSION_VALUES.includes(agentVersion)) {
    agentVersion = "latest";
  }

  return { agentId, agentVersion };
}

export async function getAgentEmbodiments(agentID) {
  try {
    const token = (await getM2MToken("https://api.smyth.ai")) as string;
    const response = await axios.get(
      `${config.env.SMYTH_API_BASE_URL}/_sysapi/v1/embodiments?aiAgentId=${agentID}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data.embodiments;
  } catch (error: any) {
    logger.error(error.response?.data, error.message);
    throw new Error(
      `Error getting embodiments for agentId=${agentID}: ${error?.message}`
    );
  }
}

export async function getAgentIdByDomain(domain = "") {
  let agentId;
  //first check if this is the internal wildcard agents domain
  const isStageWildcardDomain = domain.includes(config.env.AGENT_DOMAIN);
  const isProdWildcardDomain = domain.includes(config.env.PROD_AGENT_DOMAIN);
  if (isStageWildcardDomain || isProdWildcardDomain) {
    agentId = domain.split(".")[0];
    if (
      `${agentId}.${config.env.AGENT_DOMAIN}` !== domain &&
      `${agentId}.${config.env.PROD_AGENT_DOMAIN}` !== domain
    ) {
      throw new Error(`Invalid agent domain: ${domain}`);
    }
    if (isStageWildcardDomain) return agentId;
  }

  const token = (await getM2MToken("https://api.smyth.ai")) as string;
  const Authorization = `Bearer ${token}`;
  const result: any = await mwSysAPI
    .get("/domains?verified=true", { headers: { Authorization } })
    .catch((error) => ({ error }));

  if (result.error) {
    throw new Error("Error getting domain info");
  }

  if (agentId) {
    const hasDomain = result.data.domains.find(
      (domainEntry: any) => domainEntry?.aiAgent?.id === agentId
    );
    if (hasDomain) {
      throw new Error("Wrong domain");
    }
  } else {
    agentId = result.data.domains.find(
      (domainEntry: any) => domainEntry.name === domain
    )?.aiAgent?.id;
  }

  return agentId;
}

function migrateAgentData(data) {
  if (!data.version) {
    const newData = JSON.parse(JSON.stringify(data));
    for (let component of newData.components) {
      component.outputs = component.connectors;
      component.inputs = component.receptors;
      component.outputProps = component.connectorProps;
      component.inputProps = component.receptorProps;
      delete component.connectors;
      delete component.receptors;
      delete component.connectorProps;
      delete component.receptorProps;
    }
    return newData;
  }

  if (data.version === "1.0.0") {
    if (data.description && !data.behavior) {
      data.behavior = data.description;
    }
  }

  return data;
}

export async function getAgentDataById(agentID, version) {
  try {
    const token = (await getM2MToken("https://api.smyth.ai")) as string;

    let agentObj;

    const response = await mwSysAPI.get(
      `/ai-agent/${agentID}?include=team.subscription`,
      includeAuth(token)
    );
    agentObj = response.data.agent;
    const authData = agentObj.data.auth;

    const tasksResponse = await mwSysAPI.get(
      `/quota/team/${agentObj.teamId}/tasks/subscription`,
      includeAuth(token)
    );
    agentObj.taskData = tasksResponse.data;

    agentObj.data.debugSessionEnabled =
      agentObj?.data?.debugSessionEnabled && agentObj?.isLocked;

    if (version) {
      const deploymentsList = await mwSysAPI.get(
        `/ai-agent/${agentID}/deployments`,
        includeAuth(token)
      );
      const deployment =
        version == "latest"
          ? deploymentsList?.data?.deployments[0]
          : deploymentsList?.data?.deployments?.find(
              (deployment) => deployment.version === version
            );
      if (deployment) {
        const deployResponse = await mwSysAPI.get(
          `/ai-agent/deployments/${deployment.id}`,
          includeAuth(token)
        );
        agentObj.data = deployResponse?.data?.deployment?.aiAgentData;
        agentObj.data.debugSessionEnabled = false;
        agentObj.data.agentVersion = deployment.version;
      } else {
        throw new Error(`Requested Deploy Version not found: ${version}`);
      }
    }

    if (!agentObj?.data?.auth?.method || agentObj?.data?.auth?.method == "none")
      agentObj.data.auth = authData;

    agentObj.data = migrateAgentData(agentObj.data);

    return agentObj;
  } catch (error: any) {
    logger.error(error.response?.data, error.message);
    throw new Error(
      `Error getting agent data for agentId=${agentID}: ${error?.message}`
    );
  }
}

export function addDefaultComponentsAndConnections(agentData) {
  agentData.data.components?.unshift(...defaultFileParsingAgent.components);
  agentData.data.connections?.unshift(...defaultFileParsingAgent.connections);
}

async function fetchAgentAuthData(agentId: string) {
  const accountConnector = ConnectorService.getAccountConnector();
  return await accountConnector
    .user(AccessCandidate.agent(agentId))
    .getAgentSetting(AGENT_AUTH_SETTINGS_KEY);
}

export async function getAgentAuthData(agentId: string) {
  const freshSettings = await fetchAgentAuthData(agentId);
  return JSON.parse(freshSettings || "{}");
}

export async function getMockData(agentId: string) {
  const accountConnector = ConnectorService.getAccountConnector();
  const mockData = await accountConnector
    .user(AccessCandidate.agent(agentId))
    .getAgentSetting(MOCK_DATA_SETTINGS_KEY);
  return JSON.parse(mockData || "{}");
}
