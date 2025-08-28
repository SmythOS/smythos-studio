import express from "express";
import { getOpenAPIJSON } from "../../../helpers/openapi-adapter.helper";
import { Agent } from "@smythos/sre";
import agentLoader from "@embodiment/middlewares/agentLoader.mw";

const router = express.Router();

const openapiJSONHandler = async (req, res) => {
  const agent: Agent = req._agent;
  let domain = req.hostname;
  // const debugSessionEnabled = agent.debugSessionEnabled;
  // const isTestDomain = agent.usingTestDomain;
  //FIXME : use the right version depending on domain [FIXED]
  // const version = isTestDomain ? '' : 'latest';

  const openAPIObj = await getOpenAPIJSON(
    req._rawAgent,
    domain,
    req._agentVersion,
    false
  ).catch((error) => {
    console.error(error);
    return { error: error.message };
  });

  if (openAPIObj?.error) {
    return res.status(500).send({ error: openAPIObj.error });
  }
  //set application type to json
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(openAPIObj, null, 2));
};

const openapiJSON4LLMHandler = async (req, res) => {
  let domain = req.hostname;
  // const debugSessionEnabled = agent.debugSessionEnabled;
  // const isTestDomain = agent.usingTestDomain;
  //FIXME : use the right version depending on domain [FIXED]
  // const version = isTestDomain ? '' : 'latest';

  const openAPIObj = await getOpenAPIJSON(
    req._rawAgent,
    domain,
    req._agentVersion,
    true
  ).catch((error) => {
    console.error(error);
    return { error: error.message };
  });

  if (openAPIObj?.error) {
    return res.status(500).send({ error: openAPIObj.error });
  }
  //set application type to json
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(openAPIObj, null, 2));
};

router.get("/api-docs/openapi.json", agentLoader, openapiJSONHandler);
router.get("/api-docs/openapi-llm.json", agentLoader, openapiJSON4LLMHandler);
//legacy
router.get("/.well-known/openapi.json", agentLoader, openapiJSONHandler);

export { router as apiRouter };
