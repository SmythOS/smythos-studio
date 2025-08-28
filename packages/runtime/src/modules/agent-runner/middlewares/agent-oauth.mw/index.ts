import { NextFunction, Response } from "express";
import BearerMWFactory from "./bearer";
import OIDCMWFactory from "./oidc";

import { getAgentAuthData } from "../../../../core/helpers/agent.helper";
import { createLogger } from "../../../../core/services/logger";

const console = createLogger("___FILENAME___");

//this maps to agent.auth.provider entry, the selected provider is stored in agent.auth.method
const providers = {
  "oauth-oidc": OIDCMWFactory,
  "api-key-bearer": BearerMWFactory,
};

const middleware = async (req: any, res: Response, next: NextFunction) => {
  console.log("Agent Auth Middleware");
  const agent: any = req._agent;

  if (!agent) {
    return res.status(500).send({ error: "Agent not found" });
  }

  if (agent?.auth?.method && agent?.auth?.method != "none") {
    console.log("Using agent-oauth middleware");

    // #region Get auth data from settings
    const authFromSettings = await getAgentAuthData(agent.id);
    const legacyAuthData = agent?.auth || {};
    const authData = authFromSettings?.provider
      ? authFromSettings
      : legacyAuthData;
    // #endregion

    const providerInfo = authData?.provider?.[authData?.method];
    if (!providerInfo) {
      console.warn(`Auth provider ${agent?.auth?.method} not configured`);
      return res.status(401).send({ error: "Auth provider not configured" });
    }

    const authProvider = providers[agent?.auth?.method];
    const middleware = await authProvider(providerInfo, res);

    return middleware(req, res, next);
  }

  next();
};

export default middleware;
