
export const VAULT_DATA_CACHE_KEY = 'preloaded-vault-data';
export const AGENT_VERSIONS_CACHE_KEY = 'preloaded-agent-versions';
export const MOCK_DATA_CACHE_KEY = 'component:mock_data';

export const AGENT_AUTH_SETTINGS_KEY = 'agent-auth-data';
export const AGENT_MOCK_DATA_SETTINGS_KEY = 'agent-mock-data';

export const PATTERN_VAULT_KEY_NAME = /^[a-zA-Z0-9\s\_\(\)\-\@\.]+$/;

export const V4_ALL_PLANS = [
  'enterprise t1',
  'enterprise t2',
  'enterprise t3',
  'enterprise t4',
  'scaleup',
  'builder',
  'startup',
  'smythos free',
];

export const TRIMMED_PLANS = ['scaleup', 'enterprise', 'startup', 'builder'];

export const ERR_MSG_VAULT_KEY_NAME =
  'Please provide a unique and alphanumeric key name that is under 300 characters [allowed symbols _ . ( ) - @]';

export const GLOBAL_VAULT_KEYS = {
  openai: {
    name: 'OpenAI',
    key: '',
    placeholder:
      'SmythOS provides the Key to get you started. Unlock full access by adding your API key.',
  },
  anthropic: {
    name: 'Anthropic',
    key: '',
    placeholder: 'N/A',
  },
  togetherai: {
    name: 'Together.ai',
    key: '',
    placeholder: 'N/A',
  },
  googleai: {
    name: 'Google AI',
    key: '',
    placeholder: 'N/A',
  },
  groq: {
    name: 'Groq',
    key: '',
    placeholder: 'N/A',
  },
  xai: {
    name: 'xAI',
    key: '',
    placeholder: 'N/A',
  },
};

export const API_CALL_DATA_ENTRIES = [
  'method',
  'url',
  'headers',
  'contentType',
  'body',
  'proxy',
  'oauthService', // Assuming you're keeping track of the selected OAuth service
  'scope',
  'authorizationURL', // OAuth2.0
  'tokenURL', // OAuth2.0
  'clientID', // OAuth2.0
  'clientSecret', // OAuth2.0
  'oauth2CallbackURL', // OAuth2.0
  'requestTokenURL', // OAuth1.0
  'accessTokenURL', // OAuth1.0
  'userAuthorizationURL', // OAuth1.0
  'consumerKey', // OAuth1.0
  'consumerSecret', // OAuth1.0
  'oauth1CallbackURL', //OAuth1.0
  'authenticate',
];

export const ENTERPRISE_COLLECTION_TEMPLATE_NAMES = [
  'Asana Tasks Manager',
  'HubSpot Contacts Manager',
  'LinkedIn Leads Builder',
  'InFlow Inventory Agent',
  'Lead Contacts Scraper',
  'Backlink Analysis Agent',
];

export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024; // 5MB in bytes

export const WEAVER_LIMIT_MESSAGE = 'Sorry, you exceeded your daily limit.';

export const WEAVER_REQUIRE_CREDITS = 'Weaver requires credits';

export const AGENTS_WITH_NEXT_STEPS_SHOWN = 'agentsWithNextStepsShown';

export const VAULT_SCOPE_AGENT_LLM = 'AgentLLM';

type EmbodimentDescription = {
  title: string;
  tooltipTitle: string;
  description: string;
};

export const EMBODIMENT_DESCRIPTIONS: Record<string, EmbodimentDescription> = {
  agent_skill: {
    title: 'Agent Skills',
    tooltipTitle: '',
    description: '',
  },
  chat: {
    title: 'Chatbot',
    tooltipTitle: 'Conversational chatbot UI for live use or embedding.',
    description:
      'Chat with your agent using an interactive chatbot UI. This can be used for live testing or embedded into your website.',
  },
  llm: {
    title: 'LLM API / AgentLLM',
    tooltipTitle: 'OpenAI-compatible LLM for prompt-response workflows.',
    description:
      'Use your agent like an OpenAI-compatible API. Seamlessly integrate it into your applications to send prompts and receive responses using standard OpenAI endpoints, such as /chat/completions. No SDK changes required.',
  },
  api: {
    title: 'API Endpoints',
    tooltipTitle: 'Interactive environment for testing API endpoints.',
    description:
      'Swagger UI for simple API calls and endpoint testing. Use this live interface for making API calls, reviewing input/output formats, and integrating your agent into workflows.',
  },
  chatgpt: {
    title: 'Custom GPT',
    tooltipTitle: 'Export your agent as a custom GPT.',
    description:
      'Deploy your agent as a custom GPT in ChatGPT. Follow step-by-step instructions to set up behavior and connect using the ChatGPT interface.',
  },
  postman: {
    title: 'Postman Integration',
    tooltipTitle: "Export and test your agent's APIs using Postman collections.",
    description:
      'Test your agent using Postman or import Postman collections to your agent workspace. Includes tools for exporting and debugging API calls.',
  },
  agentllm: {
    title: 'LLM',
    tooltipTitle: 'OpenAI-compatible LLM API endpoint',
    description:
      'Use your agent as an OpenAI-compatible API endpoint for seamless integration with existing LLM workflows.',
  },
  alexa: {
    title: 'Alexa Skill',
    tooltipTitle: 'Alexa Skill',
    description:
      'Use your agent as an Alexa Skill for seamless integration with existing Alexa workflows.',
  },
  mcp: {
    title: 'MCP',
    tooltipTitle: 'MCP',
    description: 'Use your agent as an MCP for seamless integration with existing MCP workflows.',
  },
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

/**
 * Set of legacy plan names that are no longer offered but need to be supported
 * for existing customers
 */
export const LEGACY_PLANS = new Set([
  'Early Adopters',
  'SmythOS PRO',
  'SmythOS Free',
  'SmythOS Starter',
  'Premium',
  'Enterprise',
]);

/**
 * Mapping of URL paths to their corresponding page titles
 * Used for displaying the correct page title in the TopbarPrimary component
 */
export const PAGE_TITLE_MAP: Record<string, string> = {
  '/my-plan': 'Manage Subscription',
  '/data': 'Data Pool',
  '/vault': 'Vault',
  '/account': 'Account',
  '/teams/roles': 'Team Roles',
  '/teams/members': 'User Management',
  '/domain': 'Domains',
  '/analytics': 'Analytics',
  '/templates': 'Templates',
  '/agents': 'Team Dashboard', // Base title, will be customized with team name in component
};

export const SMYTHOS_DOCS_URL = `https://smythos.com/docs`;
