import { Agent, AgentRequest, AgentSettings, ConnectorService, Logger } from '@smythos/sre';

import config from '@core/config';
import { addDefaultComponentsAndConnections, extractAgentVerionsAndPath, getAgentDomainById, getAgentIdAndVersion } from '@core/helpers/agent.helper';

const console = Logger('[Embodiment] Middleware: Agent Loader');

export default async function agentLoader(req, res, next) {
  console.log('agentLoader', req.path);
  const agentDataConnector = ConnectorService.getAgentDataConnector();

  const isAgentLLMCall = req.body.model ? true : false;
  const agentFromModel: any = isAgentLLMCall ? getAgentIdAndVersion(req.body.model) : {};

  if (req.path.startsWith('/static/')) {
    return next();
  }
  let agentId = req.header('X-AGENT-ID') || agentFromModel.agentId;
  let agentVersion = req.header('X-AGENT-VERSION') || agentFromModel.version || '';
  const isAgentChatRequest = req.header('x-conversation-id') !== undefined;
  const debugHeader =
    req.header('X-DEBUG-STOP') !== undefined ||
    req.header('X-DEBUG-RUN') !== undefined ||
    req.header('X-DEBUG-INJ') !== undefined ||
    req.header('X-DEBUG-READ') !== undefined;

  let agentDomain: any = '';
  let isTestDomain = false;
  let { path, version } = extractAgentVerionsAndPath(req.path);
  if (!version) version = agentVersion;
  if (!agentId) {
    const domain = req.hostname;
    const method = req.method;

    try {
      const result = agentDataConnector?.getAgentIdByDomain?.(domain);
      if (result && typeof result.catch === 'function') {
        agentId = await result.catch(error => {
          console.error(error);
        });
      } else {
        console.error('getAgentIdByDomain method is not available or does not return a promise');
      }
    } catch (error) {
      console.error('Error calling getAgentIdByDomain:', error);
    }
    agentDomain = domain;
    if (agentId && domain.includes(config.env.DEFAULT_AGENT_DOMAIN)) {
      isTestDomain = true;
    }
  }
  if (agentId) {
    if (!isTestDomain && agentId && req.hostname.includes('localhost')) {
      console.log(`Host ${req.hostname} is using debug session. Assuming test domain`);
      isTestDomain = true;
    }
    if (agentDomain && !isTestDomain && !version) {
      //when using a production domain but no version is specified, use latest
      version = 'latest';
    }
    let agentData;
    try {
      const result = agentDataConnector?.getAgentData?.(agentId, version);
      if (result && typeof result.catch === 'function') {
        agentData = await result.catch(error => {
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

    if (isAgentChatRequest && (path.startsWith('/stream') || path.startsWith('/chat-stream'))) {
      // only add default components and connections for file parsing agent on chat requests
      addDefaultComponentsAndConnections(agentData);
    }

    // clean up agent data
    cleanAgentData(agentData);

    // req._agent = agentData.data;
    const agentSettings = new AgentSettings(agentId);
    const agentRequest = new AgentRequest(req);
    req._agent = new Agent(agentId, agentData, agentSettings, agentRequest);
    req._rawAgent = agentData;

    req.socket.on('close', () => {
      // console.log('Client socket closed, killing agent');
      // Handle the cancellation logic
      //req._agent.kill();
    });
    // req._agent.auth is empty for sre-embodiment-server; the actual auth data exists in agentData.data.auth or req._agent.data.auth
    // However, the auth middleware in the sre-agent-server project expects auth data in req._agent.auth,
    // so we need to ensure consistency across implementations.
    req._agent.auth = agentData?.data?.auth || {};

    if (!isTestDomain && req._agent.debugSessionEnabled && debugHeader) {
      console.log(`Host ${req.hostname} is using debug session. Assuming test domain.#2`);
      isTestDomain = true;
    }

    req._agent.usingTestDomain = isTestDomain;
    req._agent.domain = isAgentLLMCall ? 'AgentLLM' : agentDomain || (await getAgentDomainById(agentId));
    // req._agent.version = version;
    req._agentVersion = version;
    //req._data1 = 1;

    console.log(`Loaded Agent:${agentId} v=${version} path=${path} isTestDomain=${isTestDomain} domain=${agentDomain}`);
    return next();
  }

  return res.status(404).send({ error: `${req.path} Not Found` });
}

// clean up agent data
function cleanAgentData(agentData) {
  if (agentData) {
    // remove Note components
    agentData.data.components = agentData.data.components.filter(c => c.name != 'Note');

    // remove templateInfo
    delete agentData.data?.templateInfo;

    // TODO : remove UI attributes
  }
  return agentData;
}
