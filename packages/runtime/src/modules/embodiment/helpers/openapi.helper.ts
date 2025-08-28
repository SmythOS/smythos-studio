/**
 * @fileoverview DEPRECATED - This file is deprecated and will be removed in a future version.
 * Use @/helpers/openapi-adapter.helper.ts instead, which integrates with the SRE core AgentDataConnector.
 *
 * Migration complete: All imports have been updated to use the new adapter.
 * The new implementation provides:
 * - Better error handling with JSONContent.tryParse()
 * - Integration with SRE core AgentDataConnector
 * - Identical OpenAPI JSON output
 * - More robust template processing
 */

import fs from "fs";
import url from "url";
import path from "path";
import { Logger } from "@smythos/sre";
import { parseTemplate } from "@core/utils/general.utils";
import {
  getAgentIdByDomain,
  getAgentDataById,
} from "@embodiment/helpers/agent.helper";
import config from "@embodiment/config";
import { addDefaultComponentsAndConnections } from "@core/services/agent-helper";

const console = Logger("[Embodiment] Helper: OpenAPI");

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let chatGPTDataPath = "./data/chatGPT";

// Path to data files differs between server ('./data/chatGPT') and tests ('../data/chatGPT').
if (process.env.TEST_ENV) {
  chatGPTDataPath = "../data/chatGPT";
}

// const aiPluginTemplate = fs.readFileSync(path.resolve(__dirname, `${chatGPTDataPath}/ai-plugin.tpl.json`), 'utf8');

export function getOpenAPIInputType(input_type) {
  switch (input_type.toLowerCase()) {
    case "binary":
    case "string":
    case "any":
    case "date":
    case "datetime":
      return "string";
    case "number":
    case "float":
      return "number";
    case "integer":
      return "integer";
    case "boolean":
      return "boolean";
    case "array":
      return "array";
    case "object":
      return "object";
    default:
      return "string";
  }
}

export function getOpenAPIParameterStyle(input_type) {
  switch (input_type.toLowerCase()) {
    case "array":
      return {
        style: "form",
        explode: false, // results in `ids=1,2,3`
      };
    case "object":
      return {
        style: "deepObject",
        explode: true, // results in `lat=value1&long=value2`
      };
    default:
      return { style: "", explode: false };
  }
}

export function getOpenAPIInputSchema(input_type) {
  switch (input_type?.toLowerCase()) {
    case "binary":
    case "string":
    case "any":
      return { type: "string" };
    case "number":
    case "float":
      return { type: "number" };
    case "integer":
      return { type: "integer" };
    case "boolean":
      return { type: "boolean" };
    case "array":
      return { type: "array", items: {} };
    case "object":
      return { type: "object", additionalProperties: {} };
    default:
      return { type: "string" };
  }
}

/**
 * @deprecated Use getOpenAPIJSON from @/helpers/openapi-adapter.helper instead.
 * This function will be removed in a future version.
 */
export async function getOpenAPIJSON(
  agent: any,
  domain: string,
  version: string,
  aiOnly: boolean = false
) {
  console.warn(
    "DEPRECATED: getOpenAPIJSON from openapi.helper.ts is deprecated. Use openapi-adapter.helper.ts instead."
  );
  const apiBasePath =
    version && version != "latest" ? `/v${version}/api` : "/api";
  const name = agent.name;

  let description = aiOnly ? agent.data.behavior : agent.data.shortDescription;
  if (!description) description = agent.data.description; //data.description is deprecated, we just use it as a fallback for now

  const _version = agent.data.version || "1.0.0";
  //replace all non printable characters with spaces
  //description = description.replace(/[^\x20-\x7E]+/g, ' ');
  //const version = '1.0.0';

  const server_url_scheme =
    config.env.NODE_ENV === "DEV" &&
    config.env.AGENT_DOMAIN_PORT &&
    domain.includes(config.env.AGENT_DOMAIN)
      ? "http"
      : "https";
  const server_url_port =
    config.env.NODE_ENV === "DEV" &&
    config.env.AGENT_DOMAIN_PORT &&
    domain.includes(config.env.AGENT_DOMAIN)
      ? `:${config.env.AGENT_DOMAIN_PORT}`
      : "";
  const server_url = `${server_url_scheme}://${domain}${server_url_port}`;
  const openapiTemplate = fs.readFileSync(
    path.resolve(__dirname, `${chatGPTDataPath}/openapi.tpl.json`),
    "utf8"
  );
  const openAPIObj = JSON.parse(
    parseTemplate(openapiTemplate, {
      model_name: name,
      model_description: description,
      server_url,
      version: _version,
    })
  );

  const components = agent.data.components.filter(
    (component: any) => component.name === "APIEndpoint"
  );
  for (let component of components) {
    const ai_exposed =
      component.data.ai_exposed ||
      typeof component.data.ai_exposed === "undefined";
    if (aiOnly && !ai_exposed) continue;
    let method = (component.data.method || "post").toLowerCase();
    let summary = aiOnly
      ? component.data.description || component.data.doc
      : component.data.doc || component.data.description;
    const openapiEndpointTemplate = fs.readFileSync(
      path.resolve(__dirname, `${chatGPTDataPath}/openapi-endpoint.tpl.json`),
      "utf8"
    );

    const openAPIEntry = JSON.parse(
      parseTemplate(openapiEndpointTemplate, {
        summary,
        operationId: component.data.endpoint,
      })
    );
    if (!openAPIObj.paths[apiBasePath + "/" + component.data.endpoint])
      openAPIObj.paths[apiBasePath + "/" + component.data.endpoint] = {};
    //const componentsSchemas = openAPIObj.components.schemas;

    openAPIObj.paths[apiBasePath + "/" + component.data.endpoint][method] =
      openAPIEntry;

    if (component.inputs.length > 0) {
      if (method === "get") {
        delete openAPIEntry.requestBody;

        openAPIEntry.parameters = [];

        for (let input of component.inputs) {
          const parameter: {
            name: string;
            in: string;
            description: string;
            required: boolean;
            schema: { type: string };
            style?: string;
            explode?: boolean;
          } = {
            name: input.name,
            in: "query",
            description: input.description,
            required: !input.optional,
            schema: getOpenAPIInputSchema(input.type),
          };

          // for array and object types
          const { style, explode } = getOpenAPIParameterStyle(input.type);
          if (style) {
            parameter.style = style;
            parameter.explode = explode;
          }

          openAPIEntry.parameters.push(parameter);
        }
      } else {
        const requiredProps: any = [];

        const hasBinaryType =
          !aiOnly &&
          component.inputs.some(
            (input) => input.type.toLowerCase().trim() === "binary"
          );
        //if it's an AI format, we force application/json format, becauwe we want to receive binary data as a url
        const mimetype = hasBinaryType
          ? "multipart/form-data"
          : "application/json";
        openAPIEntry.requestBody.content[mimetype] = {};
        for (let input of component.inputs) {
          if (!input.optional) requiredProps.push(input.name);

          if (!openAPIEntry.requestBody.content[mimetype].schema)
            openAPIEntry.requestBody.content[mimetype].schema = {
              type: "object",
            };

          const schema: any = openAPIEntry.requestBody.content[mimetype]
            .schema || {
            type: "object",
          };

          if (!schema.properties) schema.properties = {};
          schema.properties[input.name] = {
            ...getOpenAPIInputSchema(input.type),
            format:
              !aiOnly && input.type.toLowerCase().trim() === "binary"
                ? "binary"
                : undefined,
            description: input.description,
            default: input.defaultVal, // without explicit default value; models from 'Anthropic' (Claude) trying to guess and supply dummy data.
          };
          schema.required = requiredProps;

          if (!openAPIEntry.requestBody.content[mimetype].schema)
            openAPIEntry.requestBody.content["application/json"].schema =
              schema;
        }
      }
    } else {
      delete openAPIEntry.requestBody;
    }
  }

  return openAPIObj;
}

/**
 * @deprecated Use getOpenAPIJSONById from @/helpers/openapi-adapter.helper instead.
 * This function will be removed in a future version.
 */
export async function getOpenAPIJSONById(
  agentId,
  domain,
  version,
  aiOnly: boolean = false,
  addDefaultFileParsingAgent: boolean = false
) {
  console.warn(
    "DEPRECATED: getOpenAPIJSONById from openapi.helper.ts is deprecated. Use openapi-adapter.helper.ts instead."
  );
  if (!agentId) {
    throw new Error("Agent not found");
  }
  const apiBasePath =
    version && version != "latest" ? `/v${version}/api` : "/api";
  //@Ahmed : this should use SRE AgentDataConnector to get the agent data,
  const agentData = await getAgentDataById(agentId, version).catch((error) => {
    console.error(error);
    return { error };
  });
  if (agentData?.error) {
    throw new Error(agentData.error);
  }
  const name = agentData.name;

  let description = aiOnly
    ? agentData.data.behavior
    : agentData.data.shortDescription;
  if (!description) description = agentData.data.description; //data.description is deprecated, we just use it as a fallback for now

  const _version = agentData.data.version || "1.0.0";
  //replace all non printable characters with spaces
  //description = description.replace(/[^\x20-\x7E]+/g, ' ');
  //const version = '1.0.0';

  const server_url_scheme =
    config.env.NODE_ENV === "DEV" &&
    config.env.AGENT_DOMAIN_PORT &&
    domain.includes(config.env.AGENT_DOMAIN)
      ? "http"
      : "https";
  const server_url_port =
    config.env.NODE_ENV === "DEV" &&
    config.env.AGENT_DOMAIN_PORT &&
    domain.includes(config.env.AGENT_DOMAIN)
      ? `:${config.env.AGENT_DOMAIN_PORT}`
      : "";
  const server_url = `${server_url_scheme}://${domain}${server_url_port}`;
  const openapiTemplate = fs.readFileSync(
    path.resolve(__dirname, `${chatGPTDataPath}/openapi.tpl.json`),
    "utf8"
  );
  const openAPIObj = JSON.parse(
    parseTemplate(openapiTemplate, {
      model_name: name,
      model_description: description,
      server_url,
      version: _version,
    })
  );

  if (addDefaultFileParsingAgent) {
    addDefaultComponentsAndConnections(agentData);
  }

  const components = agentData.data.components.filter(
    (component: any) => component.name === "APIEndpoint"
  );
  for (let component of components) {
    const ai_exposed =
      component.data.ai_exposed ||
      typeof component.data.ai_exposed === "undefined";
    if (aiOnly && !ai_exposed) continue;
    let method = (component.data.method || "post").toLowerCase();
    let summary = aiOnly
      ? component.data.description || component.data.doc
      : component.data.doc || component.data.description;
    const openapiEndpointTemplate = fs.readFileSync(
      path.resolve(__dirname, `${chatGPTDataPath}/openapi-endpoint.tpl.json`),
      "utf8"
    );

    const openAPIEntry = JSON.parse(
      parseTemplate(openapiEndpointTemplate, {
        summary,
        operationId: component.data.endpoint,
      })
    );
    if (!openAPIObj.paths[apiBasePath + "/" + component.data.endpoint])
      openAPIObj.paths[apiBasePath + "/" + component.data.endpoint] = {};
    //const componentsSchemas = openAPIObj.components.schemas;

    openAPIObj.paths[apiBasePath + "/" + component.data.endpoint][method] =
      openAPIEntry;

    if (component.inputs.length > 0) {
      if (method === "get") {
        delete openAPIEntry.requestBody;

        openAPIEntry.parameters = [];

        for (let input of component.inputs) {
          const parameter: {
            name: string;
            in: string;
            description: string;
            required: boolean;
            schema: { type: string };
            style?: string;
            explode?: boolean;
          } = {
            name: input.name,
            in: "query",
            description: input.description,
            required: !input.optional,
            schema: getOpenAPIInputSchema(input.type),
          };

          // for array and object types
          const { style, explode } = getOpenAPIParameterStyle(input.type);
          if (style) {
            parameter.style = style;
            parameter.explode = explode;
          }

          openAPIEntry.parameters.push(parameter);
        }
      } else {
        const requiredProps: any = [];

        const hasBinaryType =
          !aiOnly &&
          component.inputs.some(
            (input) => input.type.toLowerCase().trim() === "binary"
          );
        //if it's an AI format, we force application/json format, becauwe we want to receive binary data as a url
        const mimetype = hasBinaryType
          ? "multipart/form-data"
          : "application/json";
        openAPIEntry.requestBody.content[mimetype] = {};
        for (let input of component.inputs) {
          if (!input.optional) requiredProps.push(input.name);

          if (!openAPIEntry.requestBody.content[mimetype].schema)
            openAPIEntry.requestBody.content[mimetype].schema = {
              type: "object",
            };

          const schema: any = openAPIEntry.requestBody.content[mimetype]
            .schema || {
            type: "object",
          };

          if (!schema.properties) schema.properties = {};
          schema.properties[input.name] = {
            ...getOpenAPIInputSchema(input.type),
            format:
              !aiOnly && input.type.toLowerCase().trim() === "binary"
                ? "binary"
                : undefined,
            description: input.description,
            default: input.defaultVal, // without explicit default value; models from 'Anthropic' (Claude) trying to guess and supply dummy data.
          };
          schema.required = requiredProps;

          if (!openAPIEntry.requestBody.content[mimetype].schema)
            openAPIEntry.requestBody.content["application/json"].schema =
              schema;
        }
      }
    } else {
      delete openAPIEntry.requestBody;
    }
  }

  return openAPIObj;
}

/**
 * @deprecated Use getOpenAPIJSONForAI from @/helpers/openapi-adapter.helper instead.
 * This function will be removed in a future version.
 */
export async function getOpenAPIJSONForAI(
  domain,
  version: string,
  addDefaultFileParsingAgent: boolean = false
) {
  console.warn(
    "DEPRECATED: getOpenAPIJSONForAI from openapi.helper.ts is deprecated. Use openapi-adapter.helper.ts instead."
  );
  const agentId = await getAgentIdByDomain(domain);
  if (!agentId) {
    throw new Error("Agent not found");
  }

  return getOpenAPIJSONById(
    agentId,
    domain,
    version,
    true,
    addDefaultFileParsingAgent
  );
}
