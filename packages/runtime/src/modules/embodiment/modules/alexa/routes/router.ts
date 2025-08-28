import express from "express";
import agentLoader from "@embodiment/middlewares/agentLoader.mw";
import { Agent } from "@smythos/sre";
import {
  createAlexaSkill,
  handleAlexaRequest,
  isAlexaEnabled,
} from "../services/alexa.service";
import { parseAlexaRequest } from "../services/alexa.service";
import {
  DEFAULT_AGENT_MODEL,
  DEFAULT_AGENT_MODEL_SETTINGS_KEY,
} from "@embodiment/constants";
const router = express.Router();

router.post("/", agentLoader, async (req: any, res) => {
  try {
    const agent: Agent = req._agent;
    await agent.agentSettings?.ready();
    const isEnabled = isAlexaEnabled(agent);
    // wait for agent embodiments to be ready
    await agent.agentSettings?.embodiments?.ready();

    const alexRequest = parseAlexaRequest(req.body);
    const model =
      agent.agentSettings?.get(DEFAULT_AGENT_MODEL_SETTINGS_KEY) ||
      DEFAULT_AGENT_MODEL;

    const response = await handleAlexaRequest(
      agent,
      alexRequest,
      model,
      isEnabled
    );

    res.json(response);
  } catch (error: any) {
    console.error(error);
    return res.status(500).send({ error: error.message });
  }
});

router.post("/publish", agentLoader, async (req: any, res) => {
  try {
    const agent: Agent = req._agent;
    const agentName = agent.name;
    const agentDomain = agent.domain;
    let accessToken = req.body.accessToken;
    let vendorId = req.body.vendorId;
    const scheme = agentDomain.includes(":") ? "http" : "https";
    let endpoint = `${scheme}://${agentDomain}/alexa`;

    await createAlexaSkill(agentName, accessToken, vendorId, endpoint);

    return res.json({
      success: true,
      message: "Agent published to Alexa successfully",
    });
  } catch (error: any) {
    console.error("Error publishing to Alexa:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export { router as alexaRouter };
