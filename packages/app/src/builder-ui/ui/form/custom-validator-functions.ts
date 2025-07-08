import { PATTERN_VAULT_KEY_NAME } from '../../../shared/constants/general';
import {
  CUSTOM_LLM_PROVIDERS,
  BEDROCK_REGIONS,
  VERTEX_AI_REGIONS,
} from '../../../shared/constants/custom-llm.constants';
import { customModels } from '../../../shared/custom-models';
import { CustomLLMProviders } from '../../../shared/types';
export const importRegex =
  /^import\s+((\*\s+as\s+\w+)|(\w+)|(\{[^}]+\})|(\w+,\s*\{[^}]+\}))?\s*from\s*['"][^'"]+['"];?$|^import\s+['"][^'"]+['"];?$/;

const urlRegExp = new RegExp(
  /^https?:\/\/(?:w{1,3}\.)?[^\s.]+(?:\.[a-z]+)*(?::\d+)?(?![^<]*(?:<\/\w+>|\/?>))/i,
);

const validateURL = (url: string) => {
  return urlRegExp.test(url.trim());
};

window['isUrlValid'] = (val) => {
  // Function to check if a variable in the format {{var}} exists and is non-empty
  const containsNonEmptyVariable = (str) => {
    const varStart = str.indexOf('{{');
    const varEnd = str.indexOf('}}', varStart + 2);
    return varStart !== -1 && varEnd !== -1 && varEnd > varStart + 2;
  };

  // Extract the domain and the part after the domain
  const protocolIndex = val.indexOf('://');
  if (protocolIndex !== -1) {
    const domainEndIndex = val.indexOf('/', protocolIndex + 3);
    const domain = val.substring(0, domainEndIndex !== -1 ? domainEndIndex : val.length);

    // Check for non-empty variables before the domain or inside the domain
    if (containsNonEmptyVariable(val)) {
      return true; // Skip validation if a non-empty variable is found
    }

    // In cases where the variable is after the domain, use URL validation
    return validateURL(val);
  }

  // For URLs without a protocol, check for non-empty variables
  if (containsNonEmptyVariable(val)) {
    return true; // Skip validation if a non-empty variable is found
  }

  // Use URL validation for all other cases
  return validateURL(val);
};

window['isValidImageDimension'] = (val: string): boolean => {
  const num = Number(val);
  // Check if it's a valid positive integer and divisible by 64
  return Number.isInteger(num) && num > 0 && num % 64 === 0;
};

window['isValidInteger'] = (val) => {
  const num = Number(val);
  return Number.isInteger(num) && num >= 0;
};

window['isValidEndpoint'] = (val) => {
  // trim val and replace all spaces with '_'
  val = val.trim().replace(/\s+/g, '_');
  const pattern = /^[a-zA-Z0-9]+([-_][a-zA-Z0-9]+)*$/;
  return pattern.test(val);
};

window['isValidInputName'] = (val) => {
  const pattern = /^[a-zA-Z0-9_]+$/;
  return pattern.test(val);
};

window['isValidImports'] = (val) => {
  const lines = val.split('\n');
  return lines.every((line) => line.trim() === '' || importRegex.test(line));
};

/**
 * Validates output name allowing JSON path notation
 * Allows:
 * - Alphanumeric characters and underscore
 * - Hyphens (only in the middle, not at the end)
 * - Dots for object property access (e.g., 'response.text')
 * - Square brackets for array/property access (e.g., 'items[0]' or 'data["key"]')
 * @param val - The output name to validate
 * @returns boolean indicating if the name is valid
 */
window['isValidOutputName'] = (val: string): boolean => {
  const pattern =
    /^[a-zA-Z_](?:[\w-]*[a-zA-Z0-9_])?(?:\.[\w-]*[a-zA-Z0-9_]|\[\d+\]|\[["'][^"']+["']\])*$/;
  return pattern.test(val);
};

window['isValidCustomLLMName'] = (val) => {
  const pattern = /^[a-zA-Z0-9-_\s]+$/;
  return pattern.test(val);
};

window['isValidCustomLLMProvider'] = (val) => {
  return CUSTOM_LLM_PROVIDERS.map((provider) => provider.value).includes(val);
};

window['isValidBedrockModel'] = (val: string): boolean => {
  // Check if the provided value matches any Bedrock model key
  return Object.entries(customModels).some(
    ([key, model]) => model.llm === CustomLLMProviders.Bedrock && key === val,
  );
};

window['isValidVertexAIModel'] = (val: string): boolean => {
  // Check if the provided value matches any VertexAI model key
  return Object.entries(customModels).some(
    ([key, model]) => model.llm === CustomLLMProviders.VertexAI && key === val,
  );
};

window['isValidBedrockRegion'] = (val) => {
  return BEDROCK_REGIONS.map((region) => region.value).includes(val);
};

window['isValidVertexAIRegion'] = (val) => {
  return VERTEX_AI_REGIONS.map((region) => region.value).includes(val);
};

window['isValidJson'] = (val) => {
  if (val === '{}' || val === '') return true;
  const jsonString = val;
  let jsonObject = null;
  try {
    jsonObject = JSON.parse(jsonString);
  } catch (error) {
    return false; // Invalid JSON format
  }

  for (const key in jsonObject) {
    if (jsonObject.hasOwnProperty(key)) {
      if (key.trim() === '') {
        return false; // Key or value is empty
      }
    }
  }
  return true; // Valid JSON with non-empty keys and values
};

// In the HuggingFace component, empty values are not allowed for any field.
window['isValidJsonWithoutEmptyField'] = (val) => {
  if (val === '{}' || val === '') return true;
  const jsonString = val;
  let jsonObject = null;
  try {
    jsonObject = JSON.parse(jsonString);
  } catch (error) {
    return false; // Invalid JSON format
  }

  for (const key in jsonObject) {
    if (jsonObject.hasOwnProperty(key)) {
      const value = `${jsonObject[key]}`; // Sometimes the value is a number
      if (key.trim() === '' || value.trim() === '') {
        return false; // Key or value is empty
      }
    }
  }
  return true; // Valid JSON with non-empty keys and values
};

window['isValidId'] = (val) => {
  if (val === '') return true;
  // Check for {{sometext}} structures and split the string
  const parts = val.split(/(\{\{[^}]+\}\})/).filter(Boolean);

  for (const part of parts) {
    if (part.startsWith('{{') && part.endsWith('}}')) {
      // Check if the content inside {{...}} is not empty
      const innerContent = part.slice(2, -2).trim();
      if (innerContent === '') {
        return false; // Empty content inside {{...}}
      }
    } else {
      // Check for valid characters outside of {{...}}
      if (!/^[a-zA-Z0-9\-_.]+$/.test(part)) {
        return false; // Invalid characters found
      }
    }
  }

  return true;
};

window['isValidSemVer'] = (val) => {
  //accepted formet: 1.2.3
  const regex = /^\d+\.\d+\.\d+$/;
  return regex.test(val);
};

window['validVaultKeyName'] = (val) => {
  return PATTERN_VAULT_KEY_NAME.test(val);
};

window['isUniqueVaultKeyName'] = async (value: string): Promise<boolean> => {
  try {
    const fetchKey = await fetch(`/api/page/vault/keys?keyName=${value}&fields=name`).then((res) =>
      res.json(),
    );

    if (!fetchKey?.success) {
      throw new Error('Something went wrong. Please try again or contact support.');
    }

    const keyObj = fetchKey?.data || {};

    const isUnique = !Object.keys(keyObj)?.length;

    return isUnique;
  } catch {
    throw new Error('Something went wrong. Please try again or contact support.');
  }
};

window['isUniqueCustomModelName'] = async (
  value: string,
  elm: HTMLInputElement,
): Promise<boolean> => {
  try {
    const trimmedValue = value.trim();
    const entryId = elm?.getAttribute('data-entry-id');

    const fetchModel = await fetch(`/api/page/builder/custom-llm/${trimmedValue}`).then((res) =>
      res.json(),
    );

    if (!fetchModel?.success) {
      throw new Error('Something went wrong. Please try again or contact support.');
    }

    const modelInfo = fetchModel?.data || {};

    const isUnique = Object.keys(modelInfo).length === 0 || (entryId && entryId === modelInfo?.id);

    return isUnique;
  } catch (error) {
    console.error('Error checking custom model name uniqueness:', error);
    throw new Error('Something went wrong. Please try again or contact support.');
  }
};

window['isValidS3FileName'] = (val) => {
  // Allow empty string or validate against pattern
  const pattern = /^$|^[a-zA-Z0-9-_.{}]+$/;
  return pattern.test(val);
};
