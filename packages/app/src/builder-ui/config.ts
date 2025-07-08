const isLocalhost = window.location.hostname === 'localhost';
const isDev = isLocalhost || /.dev$/.test(window.location.hostname);

const config = {
  env: {
    API_SERVER: '',
    UI_SERVER: '',
    IS_LOCALHOST: window.location.hostname === 'localhost',
    IS_DEV: isDev,
  },
};

// TODO: need to move all constants to a separate file like constants.ts
export const EXTENSION_COMP_NAMES = {
  gptPlugin: 'GPTPlugin',
  agentPlugin: 'AgentPlugin',
  huggingFaceModel: 'HuggingFace',
  zapierAction: 'ZapierAction',
};

export const COMP_NAMES = {
  apiCall: 'APICall',
  code: 'Code',
  llmPrompt: 'PromptGenerator',
  visionLLM: 'VisionLLM',
  llmAssistant: 'LLMAssistant',
  imageGenerator: 'ImageGenerator',
  agentPlugin: 'AgentPlugin',
  apiEndpoint: 'APIEndpoint',
  genAILLM: 'GenAILLM',
  multimodalLLM: 'MultimodalLLM',
  classifier: 'Classifier',
  openapi: 'GPTPlugin',
  chatbot: 'Chatbot',
};

export const API_PAGES = {
  openai: 'https://beta.openai.com/docs/',
  anthropic: 'https://www.anthropic.com/product',
  togetherai: 'https://docs.together.ai/',
  googleai: 'https://cloud.google.com/ai-platform/docs',
  groq: 'https://www.groq.com/docs',
  xai: 'https://docs.x.ai/docs/quickstart#creating-an-api-key',
};

export default config;
