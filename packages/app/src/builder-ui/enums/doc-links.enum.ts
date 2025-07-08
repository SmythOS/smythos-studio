export enum ComponentDocLinks {
  // Base Components
  APIEndpoint = '/agent-studio/components/base/agent-skill',
  APIOutput = '/agent-studio/components/base/api-output',
  Classifier = '/agent-studio/components/base/classifier',
  GenAILLM = '/agent-studio/components/base/gen-ai-llm',
  ImageGenerator = '/agent-studio/components/base/image-generator',
  Note = '/agent-studio/components/base/note',

  // Advanced Components
  APICall = '/agent-studio/components/advanced/api-call',
  Async = '/agent-studio/components/advanced/async',
  Await = '/agent-studio/components/advanced/await',
  Code = '/agent-studio/components/advanced/code',
  ForEach = '/agent-studio/components/advanced/for-each',
  JSONFilter = '/agent-studio/components/advanced/json-filter',
  LLMAssistant = '/agent-studio/components/advanced/llm-assistant',
  FSleep = '/agent-studio/components/advanced/sleep',

  //   Tools
  ComputerUse = '/agent-studio/components/tools/computer-use',
  MCPClient = '/agent-studio/components/tools/mcp-client',
  ServerlessCode = '/agent-studio/components/tools/node-js',
  WebScrape = '/agent-studio/components/tools/web-scrape',
  WebSearch = '/agent-studio/components/tools/web-search',
  
  // Crypto Components
  FEncDec = '/agent-studio/components/crypto/encode-decode',
  FHash = '/agent-studio/components/crypto/hash',
  FSign = '/agent-studio/components/crypto/sign',
  FTimestamp = '/agent-studio/components/crypto/timestamp',

  // RAG Components
  DataSourceCleaner = '/agent-studio/components/rag-data/rag-forget',
  DataSourceIndexer = '/agent-studio/components/rag-data/rag-remember',
  DataSourceLookup = '/agent-studio/components/rag-data/rag-search',

  //Logical Components
  LogicAND = '/agent-studio/components/logic/logical-and',
  LogicOR = '/agent-studio/components/logic/logical-or',
  LogicXOR = '/agent-studio/components/logic/logical-xor',
  LogicAtLeast = '/agent-studio/components/logic/logical-at-least',
  LogicAtMost = '/agent-studio/components/logic/logical-at-most',

  // Legacy Components
  PromptGenerator = '/agent-studio/components/legacy/llm-prompts',
  MultimodalLLM = '/agent-studio/components/legacy/multimodal-llm',
  VisionLLM = '/agent-studio/components/legacy/vision-llm',

  //OpenAPI Integration Component
  GPTPlugin = '/agent-studio/integrations/openapi-integration',

  //SmythOS Agent Integration Component
  AgentPlugin = '/agent-studio/integrations/smythos-agents-integration',

  //HuggingFace Integration Component
  HuggingFace = '/agent-studio/integrations/hugging-face-integration',

  //Zapier Integration Component
  ZapierAction = '/agent-studio/integrations/zapier-integration',
}
