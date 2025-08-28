export const DEFAULT_AGENT_MODEL_SETTINGS_KEY = "chatGptModel"; // the key in the agent settings object that contains the model name
export const DEFAULT_AGENT_MODEL = "gpt-4o-mini"; // the default model to use if no model is specified in the agent settings

export const PROD_VERSION_VALUES = ["prod", "production", "stable"];
export const TEST_VERSION_VALUES = [
  "dev",
  "develop",
  "development",
  "test",
  "staging",
];

export enum EMBODIMENT_TYPES {
  ChatBot = "chatBot",
  ChatGPT = "chatGPT",
  FormPreview = "form",
}

export const MODELS_FOR_LEGACY_USERS = [
  "gpt-4o-mini",
  "gpt-4.1-nano",
  "gpt-4.1-mini",
  "gpt-4.1",
  "gpt-4.5-preview",
  "gpt-4o",
  "o4-mini",
  "o3",
  "o3-mini",
  "o1",
  "o1-mini",
  "o1-preview",
  "gpt-4-turbo-latest",
  "gpt-4-turbo",
  "gpt-4-latest",
  "gpt-4",
  "gpt-3.5-turbo-latest",
  "gpt-3.5-turbo",
];

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_FILE_COUNT = 5;

export const AGENT_AUTH_SETTINGS_KEY = "agentAuth";
export const MOCK_DATA_SETTINGS_KEY = "agent-mock-data";
