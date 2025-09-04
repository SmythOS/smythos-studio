import { getOpenAPIJSONForAI } from "@embodiment/helpers/openapi-adapter.helper";
import { Agent, Conversation } from "@smythos/sre";
import axios from "axios";
const SPEAKABLE_FORMAT_PROMPT = "Return the response in speakable format";
const ALEXA_BASE_URL = "https://api.amazonalexa.com";
const ALEXA_SETTINGS_KEY = "alexa";

export async function handleAlexaRequest(
  agent: Agent,
  alexRequest: any,
  model: string,
  isEnabled: boolean
) {
  if (!isEnabled) {
    return buildAlexaResponse("Alexa is not enabled for this agent");
  }
  if (alexRequest.type === "LaunchRequest") {
    return buildAlexaResponse(
      "Hi I am smythos agent. What can I help you with?"
    );
  }
  const searchQuery = alexRequest.slots.searchQuery.heardAs;
  const agentResponse = await processAlexaSearchQuery(
    searchQuery,
    model,
    agent
  );
  const response = buildAlexaResponse(agentResponse);
  return response;
}

export function parseAlexaRequest(alexRequest: any) {
  const type = alexRequest.request.type;
  const intent = alexRequest.request.intent;
  const slots = intent?.slots ? getSlotValues(intent.slots) : {};
  return { type, intent, slots };
}

export function getSlotValues(filledSlots) {
  const slotValues = {};

  Object.keys(filledSlots).forEach((item) => {
    const name = filledSlots[item].name;

    if (
      filledSlots[item] &&
      filledSlots[item].resolutions &&
      filledSlots[item].resolutions.resolutionsPerAuthority[0] &&
      filledSlots[item].resolutions.resolutionsPerAuthority[0].status &&
      filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code
    ) {
      switch (
        filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code
      ) {
        case "ER_SUCCESS_MATCH":
          slotValues[name] = {
            heardAs: filledSlots[item].value,
            resolved:
              filledSlots[item].resolutions.resolutionsPerAuthority[0].values[0]
                .value.name,
            ERstatus: "ER_SUCCESS_MATCH",
          };
          break;
        case "ER_SUCCESS_NO_MATCH":
          slotValues[name] = {
            heardAs: filledSlots[item].value,
            resolved: "",
            ERstatus: "ER_SUCCESS_NO_MATCH",
          };
          break;
        default:
          break;
      }
    } else {
      slotValues[name] = {
        heardAs: filledSlots[item].value || "", // may be null
        resolved: "",
        ERstatus: "",
      };
    }
  }, this);

  return slotValues;
}

export function buildAlexaResponse(
  outputSpeech: string,
  reprompt = "",
  shouldEndSession = false
) {
  return {
    version: "1.0",
    sessionAttributes: {},
    response: {
      outputSpeech: {
        type: "PlainText",
        text: outputSpeech,
      },
      reprompt: {
        outputSpeech: {
          type: "PlainText",
          text: reprompt,
        },
      },
      shouldEndSession: shouldEndSession,
    },
  };
}

export async function createAlexaSkill(
  agentName: string,
  accessToken: string,
  vendorId: string,
  endpoint: string
) {
  try {
    const response = await axios({
      method: "post",
      url: `${ALEXA_BASE_URL}/v1/skills`,
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
      },
      data: {
        vendorId: vendorId,
        manifest: {
          apis: {
            custom: {
              endpoint: {
                sslCertificateType: "Wildcard",
                uri: endpoint,
              },
              interfaces: [],
              locales: {},
            },
          },
          manifestVersion: "1.0",
          publishingInformation: {
            category: "ORGANIZERS_AND_ASSISTANTS",
            locales: {
              "en-US": {
                description: "Smythos agent",
                examplePhrases: ["Alexa open " + agentName],
                keywords: [agentName],
                name: agentName,
                summary: "invoke " + agentName,
              },
            },
          },
        },
      },
    });
    const skillId = response.data.skillId;
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await axios({
      method: "put",
      url: `${ALEXA_BASE_URL}/v1/skills/${skillId}/stages/development/interactionModel/locales/en-US`,
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
      },
      data: {
        interactionModel: {
          languageModel: {
            invocationName: agentName.toLowerCase(),
            intents: [
              {
                name: "AMAZON.CancelIntent",
                samples: [],
              },
              {
                name: "AMAZON.HelpIntent",
                samples: [],
              },
              {
                name: "AMAZON.StopIntent",
                samples: [],
              },
              {
                name: "AMAZON.FallbackIntent",
                samples: [],
              },
              {
                name: "AMAZON.NavigateHomeIntent",
                samples: [],
              },
              {
                name: "SmythosQuery",
                slots: [
                  {
                    name: "searchQuery",
                    type: "AMAZON.SearchQuery",
                  },
                ],
                samples: ["Hi {searchQuery}", "Hello {searchQuery}"],
              },
            ],
            types: [],
          },
        },
      },
    });
    return skillId;
  } catch (error: any) {
    console.error(error?.response?.data);
  }
}

export function processAlexaSearchQuery(
  query: string,
  model: string,
  agent: Agent
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    // const { agentId, agentVersion } = getAgentIdAndVersion(model);
    let result = "";
    const spec = await getOpenAPIJSONForAI(
      agent.domain,
      agent.usingTestDomain ? "" : "latest",
      false
    );

    // Adapt the model based on the user's plan, especially to support certain OpenAI models for legacy users with limited tokens without their own API key.
    const conversation = new Conversation(model, spec, {
      agentId: agent.id,
    });
    conversation.on("error", (error) => {
      console.error("Error in conversation:", error);
      throw `An error occurred. Please try again later or select a different model.`;
    });
    conversation.on("content", (content) => {
      try {
        if (content?.indexOf("}{") >= 0) {
          content = content.replace(/}{/g, "} {");
        }
        result += content;
      } catch (e) {}
    });
    conversation.on("end", () => {
      console.log("streaming: [DONE]");
      resolve(result);
    });
    conversation.streamPrompt(`${query} ${SPEAKABLE_FORMAT_PROMPT}`, {
      "X-AGENT-ID": agent.id,
    });
  });
}

export function isAlexaEnabled(agent: Agent) {
  if (agent.usingTestDomain) {
    return true;
  }
  return agent.agentSettings?.get(ALEXA_SETTINGS_KEY) === "true";
}
