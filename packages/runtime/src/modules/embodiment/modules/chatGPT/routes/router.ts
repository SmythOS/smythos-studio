import { getChatGPTManifest } from '@embodiment/helpers/chatgpt.helper';
import { getOpenAPIJSON } from '@embodiment/helpers/openapi-adapter.helper';
import agentLoader from '@embodiment/middlewares/agentLoader.mw';
import express from 'express';

const router = express.Router();

router.get('/.well-known/ai-plugin.json', agentLoader, async (req: any, res) => {
  let domain = req.hostname;

  const manifest = await getChatGPTManifest(req._rawAgent, domain).catch(error => {
    console.error(error);
    return { error: error.message };
  });

  if ('error' in manifest && manifest.error) {
    return res.status(500).send({ error: manifest.error });
  }

  console.log(`Manifest requested from domain ${domain} = ` + JSON.stringify(manifest, null, 2));
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(manifest, null, 2));
  //res.json(manifest);
});

router.get('/api-docs/openapi-gpt.json', agentLoader, async (req: any, res) => {
  let domain = req.hostname;

  const openAPIObj = await getOpenAPIJSON(req._rawAgent, domain, req._agentVersion, true).catch(error => {
    console.error(error);
    return { error: error.message };
  });

  if (openAPIObj?.error) {
    return res.status(500).send({ error: openAPIObj.error });
  }

  // Transform from 3.0.1 to 3.1.0 format for GPT compatibility
  const transformedSpec = transformOpenAPI301to310(openAPIObj);

  //console.log(`openAPI requested from domain ${domain} = ` + JSON.stringify(transformedSpec, null, 2));
  //FIXME : should use a more robust solution for limiting the function description length
  //ChatGPT function description is limited to 300 characters max, but SmythOS are not
  if ('paths' in transformedSpec) {
    for (let path in transformedSpec.paths) {
      const entry = transformedSpec.paths[path];
      for (let method in entry) {
        if (!entry[method].summary) continue;
        // * Improvement: Instead of truncating the summary, we can rephrase it using an LLM.
        entry[method].summary = splitOnSeparator(entry[method].summary, 300, '.');
      }
    }
  }
  //set application type to json
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(transformedSpec, null, 2));
});

export { router as chatGPTRouter };

/**
 * Transforms OpenAPI 3.0.1 specification to 3.1.0 format
 *
 * Key transformations:
 * - Updates version number to '3.1.0'
 * - Converts `nullable: true` to union types with 'null'
 * - Handles binary format by converting to base64 string with `contentEncoding`
 * - Fixes empty array items by defaulting to string type
 * - Transforms empty `additionalProperties` objects to `true`
 * - Recursively processes all schemas in paths, components, request bodies, responses, and parameters
 * - Handles nested schema structures (allOf, oneOf, anyOf, not)
 *
 * @param spec - The OpenAPI 3.0.1 specification object
 * @returns The transformed OpenAPI 3.1.0 specification
 */
function transformOpenAPI301to310(spec: any): any {
  // Deep clone to avoid mutating original
  const transformed = JSON.parse(JSON.stringify(spec));

  // Update version
  transformed.openapi = '3.1.0';

  // Transform schemas recursively
  function transformSchema(schema: any): any {
    if (!schema || typeof schema !== 'object') return schema;

    // Handle array schemas - ensure items is properly defined
    if (schema.type === 'array') {
      if (!schema.items || Object.keys(schema.items).length === 0) {
        schema.items = { type: 'string' }; // Default to string items
      } else {
        schema.items = transformSchema(schema.items);
      }
    }

    // Handle object schemas - fix empty additionalProperties
    if (schema.type === 'object') {
      if (
        schema.additionalProperties !== undefined &&
        typeof schema.additionalProperties === 'object' &&
        Object.keys(schema.additionalProperties).length === 0
      ) {
        schema.additionalProperties = true; // Allow any additional properties
      }

      // Transform nested properties
      if (schema.properties) {
        for (const [key, prop] of Object.entries(schema.properties)) {
          schema.properties[key] = transformSchema(prop);
        }
      }
    }

    // Handle binary format - convert to string with contentEncoding
    if (schema.format === 'binary') {
      delete schema.format;
      schema.type = 'string';
      schema.contentEncoding = 'base64';
    }

    // Handle nullable fields (3.0.1 -> 3.1.0)
    if (schema.nullable === true) {
      delete schema.nullable;
      // Convert to union type with null
      if (schema.type) {
        schema.type = Array.isArray(schema.type) ? [...schema.type, 'null'] : [schema.type, 'null'];
      }
    }

    // Recursively transform nested schemas
    if (schema.allOf) schema.allOf = schema.allOf.map(transformSchema);
    if (schema.oneOf) schema.oneOf = schema.oneOf.map(transformSchema);
    if (schema.anyOf) schema.anyOf = schema.anyOf.map(transformSchema);
    if (schema.not) schema.not = transformSchema(schema.not);

    return schema;
  }

  // Transform request/response schemas in paths
  if (transformed.paths) {
    for (const pathItem of Object.values(transformed.paths)) {
      for (const operation of Object.values(pathItem as any)) {
        if (typeof operation !== 'object' || !operation) continue;

        const op = operation as any;

        // Transform request body schemas
        if (op.requestBody?.content) {
          for (const mediaObj of Object.values(op.requestBody.content)) {
            if ((mediaObj as any).schema) {
              (mediaObj as any).schema = transformSchema((mediaObj as any).schema);
            }
          }
        }

        // Transform response schemas
        if (op.responses) {
          for (const response of Object.values(op.responses)) {
            if ((response as any).content) {
              for (const mediaObj of Object.values((response as any).content)) {
                if ((mediaObj as any).schema) {
                  (mediaObj as any).schema = transformSchema((mediaObj as any).schema);
                }
              }
            }
          }
        }

        // Transform parameter schemas
        if (op.parameters) {
          op.parameters = op.parameters.map((param: any) => {
            if (param.schema) {
              param.schema = transformSchema(param.schema);
            }
            return param;
          });
        }
      }
    }
  }

  // Transform component schemas
  if (transformed.components?.schemas) {
    for (const [name, schema] of Object.entries(transformed.components.schemas)) {
      transformed.components.schemas[name] = transformSchema(schema);
    }
  }

  return transformed;
}

function splitOnSeparator(str = '', maxLen: number, separator = ' .') {
  if (str.length <= maxLen) {
    return str;
  }

  // Find the last occurrence of the separator before maxLen
  let idx = str.lastIndexOf(separator, maxLen);

  // If the separator is not found, return the substring up to maxLen
  if (idx === -1) {
    return str.substring(0, maxLen);
  }

  // Return the substring from the start of the string to the last occurrence of the separator
  return str.substring(0, idx);
}
