/**
 * Component Documentation Data
 * Contains component descriptions and field tooltips for the UI
 * Based on: https://docs.google.com/document/d/1d6onoVfFS6QHMOlI-ZpbB7OaJuwtCMijpI6x0BC8csA/edit?usp=sharing
 */

export interface ComponentDocumentation {
  description: string;
  docsLink?: string;
}

/**
 * Component documentation mapping
 * Key: Component class name
 * Value: Component documentation data
 */
export const COMPONENT_DOCUMENTATION: Record<string, ComponentDocumentation> = {
  // Base Components
  APIEndpoint: {
    description:
      'Define a reusable skill your agent can call across workflows. Describe what it does, the inputs it needs, and the result it returns so assistants pick it at the right time.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/base/agent-skill/?utm_source=studio&utm_medium=tooltip&utm_campaign=agent-skill&utm_content=component-header',
  },

  APIOutput: {
    description:
      'Set the final return for your workflow as clean JSON. Choose a format and map fields so callers always get the same structure in production.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/base/api-output/?utm_source=studio&utm_medium=tooltip&utm_campaign=api-output&utm_content=component-header#step-2-select-an-output-format',
  },

  Note: {
    description:
      'Add annotations and lightweight docs on the Canvas to explain decisions, label sections, and help teammates move faster.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/base/note/?utm_source=studio&utm_medium=tooltip&utm_campaign=note&utm_content=component-header',
  },

  Classifier: {
    description:
      'Sort unstructured text into clear categories using a simple prompt. Pick a suitable model, define labels, and test edge cases for consistency.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/base/classifier/?utm_source=studio&utm_medium=tooltip&utm_campaign=classifier&utm_content=component-header#step-2-write-or-update-the-prompt',
  },

  ImageGenerator: {
    description:
      'Create or edit images from text with controls for size, quality, and style. Write clear prompts and iterate quickly to refine results.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/base/image-generator/#step-1-select-a-model-and-configure-settings',
  },

  GenAILLM: {
    description:
      'Give your agent the ability to summarize, generate, extract, or classify text by choosing a model, adding a prompt, and tuning length, quality, and cost.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/base/gen-ai-llm/?utm_source=studio&utm_medium=tooltip&utm_campaign=genai-llm&utm_content=component-header',
  },

  // Advanced Components
  FSleep: {
    description:
      'Use Sleep to pause a workflow for a set time so you can respect API rate limits, wait for slow external work, or add natural pacing. Set the delay in seconds, then the flow resumes and passes its input through unchanged.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/advanced/sleep/?utm_source=studio&utm_medium=tooltip&utm_campaign=sleep&utm_content=component-header#best-practices',
  },

  LLMAssistant: {
    description:
      'Build a chat assistant that remembers the conversation and gives coherent replies across turns. Pick a model, set the behaviour, wire the inputs, then choose how replies stream.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/advanced/llm-assistant/?utm_source=studio&utm_medium=tooltip&utm_campaign=llm-assistant&utm_content=component-header',
  },

  Await: {
    description:
      'Use Await to pause your flow until background jobs finish so you can use their results. Set how many jobs to wait for and a time limit so the flow stays responsive.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/advanced/await/?utm_source=studio&utm_medium=tooltip&utm_campaign=await&utm_content=component-header#step-1-set-wait-conditions',
  },

  Async: {
    description:
      'Start long running work in a background branch while the main flow continues; returns a JobID, passes your inputs to that branch, and pairs with Await to get results in the same run.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/advanced/async/?utm_source=studio&utm_medium=tooltip&utm_campaign=async&utm_content=component-header',
  },

  ForEach: {
    description:
      'Use ForEach to loop through a list and run the same steps for each item. It aggregates every run into one result you can pass to the next step.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/advanced/for-each/?utm_source=studio&utm_medium=tooltip&utm_campaign=for-each&utm_content=for-each-header#',
  },

  JSONFilter: {
    description:
      'Use JSON Filter to keep only the parts of a JSON object you need and drop the rest. This trims noisy API responses, speeds later steps, and saves tokens when sending data to an LLM.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/advanced/json-filter/?utm_source=studio&utm_medium=tooltip&utm_campaign=json-filter&utm_content=fields#step-1-define-filter-parameters',
  },

  FileStore: {
    description:
      'Use Filestore to save binary data and get a public link you can share. Name the file as users will download it, then set how long the link should stay valid.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/base/filestore/?utm_source=studio&utm_medium=tooltip&utm_campaign=filestore&utm_content=component-header',
  },

  Code: {
    description:
      'Use the Code component to run JavaScript, transform data, add logic, and return results with _output or errors with _error without any external service.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/advanced/code/?utm_source=studio&utm_medium=tooltip&utm_campaign=code&utm_content=variables',
  },

  APICall: {
    description:
      'Use API Call to connect your flow to any HTTP API. Set the method, URL, headers, body, and auth, then test and reuse the result in later steps.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/advanced/api-call/?utm_source=studio&utm_medium=tooltip&utm_campaign=api-call&utm_content=component-header',
  },

  // Tools Components
  ComputerUse: {
    description:
      'Gives your agent a virtual computer that can browse, click, type, and gather data from the web. Describe the task in plain steps and the result you expect, then the agent runs it and returns structured output.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/tools/computer-use/?utm_source=studio&utm_medium=tooltip&utm_campaign=computer-use&utm_content=header',
  },

  ServerlessCode: {
    description:
      'Run custom JavaScript with NPM packages in a safe, serverless runtime. Use it when built-in steps are not enough and you need full control.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/tools/node-js/?utm_source=studio&utm_medium=tooltip&utm_campaign=nodejs&utm_content=component-header',
  },

  WebSearch: {
    description: 'Search the web for information and return relevant results with citations.',
  },

  WebScrape: {
    description:
      'Pull clean content from webpages into your flow. Choose the format you need and turn on extras for sites that load data with JavaScript or on scroll.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/tools/web-scrape/?utm_source=studio&utm_medium=tooltip&utm_campaign=web-scrape&utm_content=component-header#step-1-configure-scraper-settings',
  },

  MCPClient: {
    description:
      'Connect your agent to an MCP server so it can use external tools through one standard interface. Enter the server URL, write a clear prompt, and choose the model that will call tools.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/tools/mcp-client/?utm_source=studio&utm_medium=tooltip&utm_campaign=mcp-client&utm_content=component-header#step-2-configure-the-connection',
  },

  // Crypto Components
  FHash: {
    description:
      'Create a fixed-size fingerprint of your data for checks and IDs. Pick an algorithm, choose an output encoding, then pass the hash downstream.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/crypto/hash/?utm_source=studio&utm_medium=tooltip&utm_campaign=hash&utm_content=component-header',
  },

  FEncDec: {
    description:
      'Converts data between text and binary encodings for safe storage, transport, and API compatibility. Supports Base64, Base64URL, hex, UTF-8, and Latin-1 with encode or decode actions.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/crypto/encode-decode/?utm_source=studio&utm_medium=tooltip&utm_campaign=encode-decode&utm_content=component-header',
  },

  FSign: {
    description:
      'Generates a digital signature with HMAC or RSA for webhook payloads and API requests. Verifiers must use the same method, key, hash, and encoding to match.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/crypto/sign/?utm_source=studio&utm_medium=tooltip&utm_campaign=sign&utm_content=component-header#step-1-select-a-signature-method-and-settings',
  },

  FTimestamp: {
    description:
      'Emits the server UTC time as a Unix timestamp in milliseconds at execution for logging, timing, and time-based IDs.',
  },

  // RAG Data Components
  DataSourceLookup: {
    description:
      'Retrieves relevant text from indexed knowledge using semantic search. Searches a chosen namespace and returns top matches with optional metadata and scores.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/rag-data/rag-search/?utm_source=studio&utm_medium=tooltip&utm_campaign=rag-search&utm_content=component-header',
  },

  DataSourceIndexer: {
    description:
      'Adds or updates content in the agent’s knowledge base. Stores text and optional metadata in a selected data space with a stable source ID, enabling later search, updates, or deletion.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/rag-data/rag-remember/?utm_source=studio&utm_medium=tooltip&utm_campaign=rag-remember&utm_content=component-header',
  },

  DataSourceCleaner: {
    description:
      'Deletes a specific source from a data space using its exact source identifier. Operation is permanent and intended for data hygiene and compliance workflows.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/rag-data/rag-forget/?utm_source=studio&utm_medium=tooltip&utm_campaign=rag-forget&utm_content=source-identifier',
  },

  // Memory Components
  MemoryWriteObject: {
    description:
      'Save multiple keys in one shot with a flat JSON object. Keep flows tidy and consistent while updating several fields at once.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/memory/memory-write-multi/?utm_source=studio&utm_medium=tooltip&utm_campaign=rag-forget&utm_content=source-identifier',
  },

  MemoryWriteKeyVal: {
    description:
      'Store a single key and value in a named memory. Pick Request or TTL scope to control lifetime and shareability across workflows.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/memory/memory-write/?utm_source=studio&utm_medium=tooltip&utm_campaign=rag-forget&utm_content=source-identifier',
  },

  MemoryReadKeyVal: {
    description:
      'Retrieve a stored value from memory by key. Use it to pass saved state forward in your workflow or reuse data across steps.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/memory/memory-read/?utm_source=studio&utm_medium=tooltip&utm_campaign=rag-forget&utm_content=source-identifier',
  },

  MemoryDeleteKeyVal: {
    description:
      'Remove a specific key from a named memory to prevent stale data. Works for Request and TTL scopes so you can clean up mid run or purge persistent values.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/memory/memory-delete/?utm_source=studio&utm_medium=tooltip&utm_campaign=rag-forget&utm_content=source-identifier',
  },

  // Legacy Components
  PromptGenerator: {
    description:
      'Generates a single, stateless completion from a text prompt using the selected model. Supports templated variables and an optional passthrough of the original input. This is a legacy component; for multi-turn chat or newer controls, see <a href="https://smythos.com/docs/agent-studio/components/advanced/llm-assistant/?utm_source=app&utm_medium=component&utm_campaign=docs&utm_content=llm-prompt-legacy" target="_blank" class="text-blue-600 hover:text-blue-800">LLM Assistant</a> and <a href="https://smythos.com/docs/agent-studio/components/base/gen-ai-llm/?utm_source=app&utm_medium=component&utm_campaign=docs&utm_content=llm-prompt-legacy" target="_blank" class="text-blue-600 hover:text-blue-800">GenAI LLM</a>.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/legacy/llm-prompts/?utm_source=app&utm_medium=tooltip&utm_campaign=docs&utm_content=llm-prompt-overview',
  },

  MultimodalLLM: {
    description:
      'Runs a single completion from mixed inputs like images, video, audio, and text. Supports Google multimodal models, file URLs or Base64, and basic output length control. This is a legacy component; see <a href="https://smythos.com/docs/agent-studio/components/advanced/llm-assistant/?utm_source=app&utm_medium=component&utm_campaign=docs&utm_content=llm-prompt-legacy" target="_blank" class="text-blue-600 hover:text-blue-800">LLM Assistant</a> and <a href="https://smythos.com/docs/agent-studio/components/base/gen-ai-llm/?utm_source=app&utm_medium=component&utm_campaign=docs&utm_content=llm-prompt-legacy" target="_blank" class="text-blue-600 hover:text-blue-800">GenAI LLM</a>.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/legacy/multimodal-llm/?utm_source=app&utm_medium=tooltip&utm_campaign=docs&utm_content=multimodal-llm-overview',
  },

  VisionLLM: {
    description:
      'Processes images with a vision model to extract text, detect objects, or describe scenes. Accepts one or more image inputs and returns a structured result. This is a legacy component; see <a href="https://smythos.com/docs/agent-studio/components/advanced/llm-assistant/?utm_source=app&utm_medium=component&utm_campaign=docs&utm_content=llm-prompt-legacy" target="_blank" class="text-blue-600 hover:text-blue-800">LLM Assistant</a> and <a href="https://smythos.com/docs/agent-studio/components/base/gen-ai-llm/?utm_source=app&utm_medium=component&utm_campaign=docs&utm_content=llm-prompt-legacy" target="_blank" class="text-blue-600 hover:text-blue-800">GenAI LLM</a>.',
    docsLink:
      'https://smythos.com/docs/agent-studio/components/legacy/vision-llm/?utm_source=app&utm_medium=tooltip&utm_campaign=docs&utm_content=vision-llm-overview',
  },
};

/**
 * Check if a component should have tooltips
 * Memory and Logic components are excluded
 */
export function shouldShowComponentTooltips(componentClassName: string): boolean {
  // Exclude Logic components
  if (componentClassName.startsWith('Logic')) {
    return false;
  }

  return true;
}

/**
 * Get component documentation
 */
export function getComponentDocumentation(
  componentClassName: string,
): ComponentDocumentation | null {
  if (!shouldShowComponentTooltips(componentClassName)) {
    return null;
  }

  return COMPONENT_DOCUMENTATION[componentClassName] || null;
}
