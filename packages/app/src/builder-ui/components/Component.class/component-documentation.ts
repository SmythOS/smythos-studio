/**
 * Component Documentation Data
 * Contains component descriptions and field tooltips for the UI
 * Based on: https://docs.google.com/document/d/1d6onoVfFS6QHMOlI-ZpbB7OaJuwtCMijpI6x0BC8csA/edit?usp=sharing
 */

export interface ComponentFieldTooltip {
  tooltip: string;
  docsLink?: string;
}

export interface ComponentDocumentation {
  description: string;
  docsLink?: string;
  fieldTooltips: Record<string, ComponentFieldTooltip>;
}

/**
 * Component documentation mapping
 * Key: Component class name
 * Value: Component documentation data
 */
export const COMPONENT_DOCUMENTATION: Record<string, ComponentDocumentation> = {
  // Base Components
  APIEndpoint: {
    description: 'Define a reusable skill your agent can call across workflows. Describe what it does, the inputs it needs, and the result it returns so assistants pick it at the right time. For patterns, naming, and step-by-step builds, see the skill guidelines.',
    docsLink: 'https://smythos.com/docs/agent-studio/components/base/agent-skill/?utm_source=studio&utm_medium=tooltip&utm_campaign=agent-skill&utm_content=component-header',
    fieldTooltips: {
      skillName: {
        tooltip: 'Give the skill a unique, valid name using letters, numbers, hyphens, or underscores for workflows to call on.',
      },
      name: {
        tooltip: 'Give the skill a unique, valid name using letters, numbers, hyphens, or underscores for workflows to call on.',
      },
      instructions: {
        tooltip: 'Define when to run the skill, what inputs it needs, and the results it should return. See skill guidelines',
        docsLink: 'https://smythos.com/docs/agent-studio/components/base/agent-skill/#step-1-define-the-skills-core-details',
      },
      exposeToAI: {
        tooltip: 'Make the skill available for autonomous use by chat agents.',
      },
      description: {
        tooltip: 'Provide a short overview for teammates and AI to understand the skill\'s purpose.',
      },
      advancedRequestParts: {
        tooltip: 'Lock this skill into a fixed API-style request with details like headers, methods, and body. See details',
        docsLink: 'https://smythos.com/docs/agent-studio/components/base/agent-skill/#step-3-configure-advanced-options',
      },
    },
  },

  APIOutput: {
    description: 'Set the final return for your workflow as clean JSON. Choose a format and map fields so callers always get the same structure in production. For examples, see the output guide.',
    docsLink: 'https://smythos.com/docs/agent-studio/components/base/api-output/?utm_source=studio&utm_medium=tooltip&utm_campaign=api-output&utm_content=component-header#step-2-select-an-output-format',
    fieldTooltips: {
      outputFormat: {
        tooltip: 'Choose the response shape: Full adds metadata; Minimal returns mapped fields; Raw passes the source. See response examples',
        docsLink: 'https://smythos.com/docs/agent-studio/components/base/api-output/#step-2-select-an-output-format',
      },
    },
  },

  Note: {
    description: 'Add annotations and lightweight docs on the Canvas to explain decisions, label sections, and help teammates move faster. For quick tips and examples, see the Note guide.',
    docsLink: 'https://smythos.com/docs/agent-studio/components/base/note/?utm_source=studio&utm_medium=tooltip&utm_campaign=note&utm_content=component-header',
    fieldTooltips: {
      description: {
        tooltip: 'Store note content for context, decisions, and next steps.',
      },
      textColor: {
        tooltip: 'Set text color for readability and clear grouping.',
      },
      backgroundColor: {
        tooltip: 'Pick a background color to label or highlight sections.',
      },
      enableMarkdown: {
        tooltip: 'Turn on headings, lists, links, and code formatting. Processes content in Markdown format for notes, headings, lists, and styled text instead of plain text.',
      },
      markdownContent: {
        tooltip: 'Renders Markdown in the note. See Markdown tips',
        docsLink: 'https://smythos.com/docs/agent-studio/components/base/note/?utm_source=studio&utm_medium=tooltip&utm_campaign=note&utm_content=enable-markdown#formatting-mode',
      },
    },
  },

  Classifier: {
    description: 'Sort unstructured text into clear categories using a simple prompt. Pick a suitable model, define labels, and test edge cases for consistency. For examples, see the Classification guide.',
    docsLink: 'https://smythos.com/docs/agent-studio/components/base/classifier/?utm_source=studio&utm_medium=tooltip&utm_campaign=classifier&utm_content=component-header#step-2-write-or-update-the-prompt',
    fieldTooltips: {
      model: {
        tooltip: 'Choose a model that applies labels and fits your context size.',
      },
      prompt: {
        tooltip: 'Explain how text should be classified and what labels to return. See prompt tips',
        docsLink: 'https://smythos.com/docs/agent-studio/components/base/classifier/?utm_source=studio&utm_medium=tooltip&utm_campaign=classifier&utm_content=prompt#step-2---write-or-update-the-prompt',
      },
    },
  },

  ImageGenerator: {
    description: 'Create images from text or edit existing ones with model controls for size, quality, and style. Write specific prompts and iterate quickly using the image generation guide.',
    docsLink: 'https://smythos.com/docs/agent-studio/components/base/image-generator/#step-1-select-a-model-and-configure-settings',
    fieldTooltips: {
      model: {
        tooltip: 'Choose a model that matches your style and detail needs.',
      },
      prompt: {
        tooltip: 'Describe what to generate by describing the subject, style, and constraints. See prompt tips',
        docsLink: 'https://smythos.com/docs/agent-studio/components/base/image-generator/?utm_source=studio&utm_medium=tooltip&utm_campaign=image-generator&utm_content=prompt#step-2-define-inputs',
      },
      aspectRatio: {
        tooltip: 'Set the shape of the image, like square (1:1) or widescreen (16:9).',
      },
      personGeneration: {
        tooltip: 'Control if people can appear and which age groups are included. See policy rules',
        docsLink: 'https://smythos.com/docs/agent-studio/components/base/image-generator/?utm_source=studio&utm_medium=tooltip&utm_campaign=image-generator&utm_content=person-generation#model-verification-and-troubleshooting',
      },
      quality: {
        tooltip: 'Decide how detailed the output is, trading off speed and cost.',
      },
      outputFormat: {
        tooltip: 'Set the file type you\'ll get back, like JPEG for photos, PNG for transparency, or WebP for web use.',
      },
      strength: {
        tooltip: 'Control how much an input image influences the final result (higher = closer match).',
      },
      negativePrompt: {
        tooltip: 'Block unwanted elements, styles, or colors from appearing in the image.',
      },
    },
  },

  GenAILLM: {
    description: 'Give your agent language skills for summarising, generating, extracting, and classifying text. Pick a model, write a clear prompt, connect inputs, then tune settings for length, quality, and cost. For proven prompts, model tips, and steps, see the GenAI LLM guide.',
    docsLink: 'https://smythos.com/docs/agent-studio/components/base/gen-ai-llm/?utm_source=studio&utm_medium=tooltip&utm_campaign=genai-llm&utm_content=component-header',
    fieldTooltips: {
      model: {
        tooltip: 'Choose the model that will generate and interpret text.',
        docsLink: 'https://smythos.com/docs/agent-studio/components/base/gen-ai-llm/?utm_source=studio&utm_medium=tooltip&utm_campaign=genai-llm&utm_content=model#step-1-choose-a-model',
      },
      prompt: {
        tooltip: 'Write clear instructions with placeholders (e.g., {{input}}) and state the expected format.',
        docsLink: 'https://smythos.com/docs/agent-studio/components/base/gen-ai-llm/?utm_source=studio&utm_medium=tooltip&utm_campaign=genai-llm&utm_content=prompt#step-2-write-your-prompt',
      },
      contextWindowSize: {
        tooltip: 'Set a token budget for prompt and reply to fit within model limits. See context guidelines',
        docsLink: 'https://smythos.com/docs/agent-studio/components/base/gen-ai-llm/?utm_source=studio&utm_medium=tooltip&utm_campaign=genai-llm&utm_content=stop-sequence#step-4-configure-advanced-settings',
      },
      maximumOutputTokens: {
        tooltip: 'Limit reply length to manage cost and avoid cutoffs. See token limits',
        docsLink: 'https://smythos.com/docs/agent-studio/components/base/gen-ai-llm/?utm_source=studio&utm_medium=tooltip&utm_campaign=genai-llm&utm_content=context-window-size#step-4-configure-advanced-settings',
      },
      maxTokens: {
        tooltip: 'Limit reply length to manage cost and avoid cutoffs. See token limits',
        docsLink: 'https://smythos.com/docs/agent-studio/components/base/gen-ai-llm/?utm_source=studio&utm_medium=tooltip&utm_campaign=genai-llm&utm_content=context-window-size#step-4-configure-advanced-settings',
      },
      stopSequence: {
        tooltip: 'End output when any of the stop strings (sequence of up to 4 strings) appear. See stopping examples',
        docsLink: 'https://smythos.com/docs/agent-studio/components/base/gen-ai-llm/?utm_source=studio&utm_medium=tooltip&utm_campaign=genai-llm&utm_content=stop-sequence#step-4-configure-advanced-settings',
      },
      stopSequences: {
        tooltip: 'End output when any of the stop strings (sequence of up to 4 strings) appear. See stopping examples',
        docsLink: 'https://smythos.com/docs/agent-studio/components/base/gen-ai-llm/?utm_source=studio&utm_medium=tooltip&utm_campaign=genai-llm&utm_content=stop-sequence#step-4-configure-advanced-settings',
      },
      frequencyPenalty: {
        tooltip: 'Reduce repeats by penalising words already used in the reply.',
      },
      presencePenalty: {
        tooltip: 'Encourage new topics by penalising words seen in the input.',
      },
      verbosity: {
        tooltip: 'Control how much reasoning detail appears in the response.',
      },
      passthrough: {
        tooltip: 'Stream the response live to chat, or turn off for batch runs. See passthrough details',
        docsLink: 'https://smythos.com/docs/agent-studio/components/base/gen-ai-llm/?utm_source=studio&utm_medium=tooltip&utm_campaign=genai-llm&utm_content=passthrough#step-4-configure-advanced-settings',
      },
      useAgentSystemPrompt: {
        tooltip: 'Apply the agent\'s rules and tone to this call for consistency.',
      },
      useContextWindow: {
        tooltip: 'Include recent chat history when responses depend on prior turns.',
      },
      reasoningEffort: {
        tooltip: 'Set how deeply the model reasons; higher is slower but more accurate.',
      },
      useWebSearch: {
        tooltip: 'Allow the model to fetch fresh, real-time information.',
      },
      useReasoning: {
        tooltip: 'Enable step-by-step reasoning for complex or multi-step tasks.',
      },
      topP: {
        tooltip: 'Control variety by sampling from the smallest set of likely words that reach probability P.',
      },
      topK: {
        tooltip: 'Restrict generation to the top K most likely words to reduce randomness.',
      },
    },
  },

  // Advanced Components
  Sleep: {
    description: 'Use Sleep to pause a workflow for a set time so you can respect API rate limits, wait for slow external work, or add natural pacing. Set the delay in seconds, then the flow resumes and passes its input through unchanged. If you need examples, see delay tips and best practices.',
    docsLink: 'https://smythos.com/docs/agent-studio/components/advanced/sleep/?utm_source=studio&utm_medium=tooltip&utm_campaign=sleep&utm_content=component-header#best-practices',
    fieldTooltips: {
      delay: {
        tooltip: 'Pause for the set seconds, then continue; input passes through unchanged. See dynamic delays and limits',
        docsLink: 'https://smythos.com/docs/agent-studio/components/advanced/sleep/?utm_source=studio&utm_medium=tooltip&utm_campaign=sleep&utm_content=component-header#step-1-set-the-delay-duration',
      },
    },
  },

  LLMAssistant: {
    description: 'Build a chat assistant that remembers the conversation and gives coherent replies across turns. Pick a model, set the behaviour, wire the inputs, then choose how replies stream. For help in understanding, see the LLM Assistant guide.',
    docsLink: 'https://smythos.com/docs/agent-studio/components/advanced/llm-assistant/?utm_source=studio&utm_medium=tooltip&utm_campaign=llm-assistant&utm_content=component-header',
    fieldTooltips: {
      model: {
        tooltip: 'Choose the chat model for this assistant; balance speed, cost, and context.',
      },
      behavior: {
        tooltip: 'Set the assistant\'s tone, rules, and actions so replies fit the intended use case. See behaviour examples',
        docsLink: 'https://smythos.com/docs/agent-studio/components/advanced/llm-assistant/?utm_source=studio&utm_medium=tooltip&utm_campaign=llm-assistant&utm_content=behavior#step-2-define-the-behavior',
      },
      passthrough: {
        tooltip: 'Send raw replies into the workflow for filtering or transformation before display. See passthrough control',
        docsLink: 'https://smythos.com/docs/agent-studio/components/advanced/llm-assistant/?utm_source=studio&utm_medium=tooltip&utm_campaign=llm-assistant&utm_content=passthrough#step-4-configure-advanced-settings',
      },
    },
  },

  Await: {
    description: 'Use Await to pause your flow until background jobs finish so you can use their results. Set how many jobs to wait for and a time limit so the flow stays responsive. For examples, race rules, and partial results, see wait conditions and timeouts.',
    docsLink: 'https://smythos.com/docs/agent-studio/components/advanced/await/?utm_source=studio&utm_medium=tooltip&utm_campaign=await&utm_content=component-header#step-1-set-wait-conditions',
    fieldTooltips: {
      minimumJobsCount: {
        tooltip: 'Resume when at least this many async jobs finish; set 1 to continue on the first result.',
      },
      maximumWaitTimeInSeconds: {
        tooltip: 'Stop waiting after this many seconds and continue with any finished jobs.',
      },
    },
  },

  ForEach: {
    description: 'Use ForEach to loop through a list and run the same steps for each item. It aggregates every run into one result you can pass to the next step. For steps and output response details, see the For Each guide.',
    docsLink: 'https://smythos.com/docs/agent-studio/components/advanced/for-each/?utm_source=studio&utm_medium=tooltip&utm_campaign=for-each&utm_content=for-each-header#',
    fieldTooltips: {
      outputFormat: {
        tooltip: 'Choose Full for item plus metadata, Minimal for the last step\'s output only, or Array of Results for a simple list. See format examples',
        docsLink: 'https://smythos.com/docs/agent-studio/components/advanced/for-each/?utm_source=studio&utm_medium=tooltip&utm_campaign=for-each&utm_content=output-format#step-3-select-an-output-format',
      },
    },
  },

  JSONFilter: {
    description: 'Use JSON Filter to keep only the parts of a JSON object you need and drop the rest. This trims noisy API responses, speeds later steps, and saves tokens when sending data to an LLM. For path syntax, nested keys, and arrays, see examples.',
    docsLink: 'https://smythos.com/docs/agent-studio/components/advanced/json-filter/?utm_source=studio&utm_medium=tooltip&utm_campaign=json-filter&utm_content=fields#step-1-define-filter-parameters',
    fieldTooltips: {
      fields: {
        tooltip: 'List the paths to keep, like user.email, id, or items[0].name; anything not listed is removed. See path rules and nested keys',
        docsLink: 'https://smythos.com/docs/agent-studio/components/advanced/json-filter/?utm_source=studio&utm_medium=tooltip&utm_campaign=json-filter&utm_content=fields#step-1-define-filter-parameters',
      },
    },
  },

  FileStore: {
    description: 'Use Filestore to save binary data and get a public link you can share. Name the file as users will download it, then set how long the link should stay valid. For input rules, file naming, and TTL limits, see Filestore inputs and TTL.',
    docsLink: 'https://smythos.com/docs/agent-studio/components/base/filestore/?utm_source=studio&utm_medium=tooltip&utm_campaign=filestore&utm_content=component-header',
    fieldTooltips: {
      fileName: {
        tooltip: 'Name the download and include an extension like .json or .png for easy use. See naming tips',
        docsLink: 'https://smythos.com/docs/agent-studio/components/base/filestore/?utm_source=studio&utm_medium=tooltip&utm_campaign=filestore&utm_content=file-name#step-1-define-inputs',
      },
      ttl: {
        tooltip: 'Set how long the public link stays valid before it expires. See TTL options',
        docsLink: 'https://smythos.com/docs/agent-studio/components/base/filestore/?utm_source=studio&utm_medium=tooltip&utm_campaign=filestore&utm_content=ttl#step-1-define-inputs',
      },
    },
  },

  Code: {
    description: 'Use the Code component to run JavaScript inside your workflow. Transform inputs, validate data, and add custom logic without an external service. Set _output to pass results and use _error for safe failures. If you want to understand the code template and variable rules, see the Code guide.',
    docsLink: 'https://smythos.com/docs/agent-studio/components/advanced/code/?utm_source=studio&utm_medium=tooltip&utm_campaign=code&utm_content=variables',
    fieldTooltips: {
      code_vars: {
        tooltip: 'Define variables to store and reuse values in your script. See input and output variables',
        docsLink: 'https://smythos.com/docs/agent-studio/components/advanced/code/?utm_source=studio&utm_medium=tooltip&utm_campaign=code&utm_content=variables#step-1-understand-inputs-and-outputs',
      },
      code_body: {
        tooltip: 'Write JavaScript that reads inputs and sets _output for the next step. See code guidelines',
        docsLink: 'https://smythos.com/docs/agent-studio/components/advanced/code/?utm_source=studio&utm_medium=tooltip&utm_campaign=code&utm_content=variables#step-2-write-your-code',
      },
    },
  },

  APICall: {
    description: 'Use API Call to connect your flow to any HTTP API. Set the method, URL, headers, body, and auth, then test and reuse the result in later steps. For step-by-step setup with examples, see the API Call guide.',
    docsLink: 'https://smythos.com/docs/agent-studio/components/advanced/api-call/?utm_source=studio&utm_medium=tooltip&utm_campaign=api-call&utm_content=component-header',
    fieldTooltips: {
      method: {
        tooltip: 'Choose the HTTP method to read, create, update, or delete data.',
      },
      url: {
        tooltip: 'Enter the website address and add any path or query parts. See URL patterns',
        docsLink: 'https://smythos.com/docs/agent-studio/components/advanced/api-call/?utm_source=studio&utm_medium=tooltip&utm_campaign=api-call&utm_content=url#step-1-choose-method-and-url',
      },
      headers: {
        tooltip: 'Add keys the service needs, like Authorization or Content-Type. See header usage',
        docsLink: 'https://smythos.com/docs/agent-studio/components/advanced/api-call/?utm_source=studio&utm_medium=tooltip&utm_campaign=api-call&utm_content=url#step-2-add-headers-and-body',
      },
      contentType: {
        tooltip: 'Tell the server what kind of body you are sending, like JSON or form data.',
      },
      body: {
        tooltip: 'Write what you want to send and use variables from earlier steps.',
      },
      oauth: {
        tooltip: 'Sign in once and let tokens attach to your calls automatically. See OAuth setup',
        docsLink: 'https://smythos.com/docs/agent-studio/components/advanced/api-call/?utm_source=studio&utm_medium=tooltip&utm_campaign=api-call&utm_content=url#step-3-add-authentication',
      },
      proxyUrls: {
        tooltip: 'Send calls through a proxy if your network or vendor asks for it.',
      },
    },
  },

  // Tools Components
  ComputerUse: {
    description: 'Gives your agent a virtual computer that can browse, click, type, and gather data from the web. Describe the task in plain steps and the result you expect, then the agent runs it and returns structured output. For prompt tips and real examples, see the Computer Use guide.',
    docsLink: 'https://smythos.com/docs/agent-studio/components/tools/computer-use/?utm_source=studio&utm_medium=tooltip&utm_campaign=computer-use&utm_content=header',
    fieldTooltips: {
      prompt: {
        tooltip: 'Describe the on-screen task with clear steps, needed URLs, and what success looks like.',
        docsLink: 'https://smythos.com/docs/agent-studio/components/tools/computer-use/?utm_source=studio&utm_medium=tooltip&utm_campaign=computer-use&utm_content=header#step-2-define-the-task-prompt',
      },
    },
  },

  ServerlessCode: {
    description: 'Run custom JavaScript with NPM packages in a safe, serverless runtime. Use it when built-in steps are not enough and you need full control. For code structure, inputs, and package tips, see the NodeJS guide.',
    docsLink: 'https://smythos.com/docs/agent-studio/components/tools/node-js/?utm_source=studio&utm_medium=tooltip&utm_campaign=nodejs&utm_content=component-header',
    fieldTooltips: {
      code_imports: {
        tooltip: 'Write Node.js that runs in a managed serverless runtime and returns an Output value.',
        docsLink: 'https://smythos.com/docs/agent-studio/components/tools/node-js/?utm_source=studio&utm_medium=tooltip&utm_campaign=nodejs&utm_content=component-header#step-1-write-your-nodejs-code',
      },
      use_own_keys: {
        tooltip: 'Run with your AWS credentials to reach VPC or private services.',
      },
      accessKeyId: {
        tooltip: 'Enter the AWS Access Key ID used when runs use your account.',
      },
      secretAccessKey: {
        tooltip: 'Paste the matching AWS Secret Access Key; it is stored encrypted.',
      },
      region: {
        tooltip: 'Choose the AWS Region for execution to reduce latency and keep related services together.',
      },
    },
  },

  WebSearch: {
    description: 'Search the web for information and return relevant results with citations.',
    fieldTooltips: {
      sourcesLimit: {
        tooltip: 'Choose how many results to fetch, up to 20; start with 3 to 5 for speed.',
      },
      searchTopic: {
        tooltip: 'Pick General for evergreen pages or News for recent reporting.',
      },
      includeQAs: {
        tooltip: 'Add a short AI answer with citations from the top sources.',
      },
      includeImages: {
        tooltip: 'Return image results with titles and links for quick preview.',
      },
      timeRange: {
        tooltip: 'Limit results to the last 24 hours, 7 days, 30 days, or a year.',
      },
      includeRawContent: {
        tooltip: 'Return the page text for each result for RAG or summaries.',
        docsLink: 'https://smythos.com/docs/agent-studio/components/tools/web-search/?utm_source=studio&utm_medium=tooltip&utm_campaign=web-search&utm_content=raw-content',
      },
      excludeDomains: {
        tooltip: 'Filter out sites you do not want, one domain per line.',
      },
    },
  },

  WebScrape: {
    description: 'Pull clean content from webpages into your flow. Choose the format you need and turn on extras for sites that load data with JavaScript or on scroll. For setup tips and examples, see Web Scrape guide.',
    docsLink: 'https://smythos.com/docs/agent-studio/components/tools/web-scrape/?utm_source=studio&utm_medium=tooltip&utm_campaign=web-scrape&utm_content=component-header#step-1-configure-scraper-settings',
    fieldTooltips: {
      format: {
        tooltip: 'Choose Markdown for readability, HTML or text for raw content, or JSON for structured parsing later.',
      },
      antiScrapingProtection: {
        tooltip: 'Use a managed browser for sites with bot checks when you have rights.',
        docsLink: 'https://smythos.com/docs/agent-studio/components/tools/web-scrape/?utm_source=studio&utm_medium=tooltip&utm_campaign=web-scrape&utm_content=anti-bot#step-1-configure-scraper-settings',
      },
      javascriptRendering: {
        tooltip: 'Render the page with a headless browser to load dynamic content.',
        docsLink: 'https://smythos.com/docs/agent-studio/components/tools/web-scrape/?utm_source=studio&utm_medium=tooltip&utm_campaign=web-scrape&utm_content=js-rendering#step-1-configure-scraper-settings',
      },
      autoScroll: {
        tooltip: 'Scroll the page to load more items before scraping; set sensible limits for long feeds.',
      },
    },
  },

  MCPClient: {
    description: 'Connect your agent to an MCP server so it can use external tools through one standard interface. Enter the server URL, write a clear prompt, and choose the model that will call tools. For URL format and setup steps, see MCP setup.',
    docsLink: 'https://smythos.com/docs/agent-studio/components/tools/mcp-client/?utm_source=studio&utm_medium=tooltip&utm_campaign=mcp-client&utm_content=component-header#step-2-configure-the-connection',
    fieldTooltips: {
      mcpUrl: {
        tooltip: 'Enter the MCP server URL so the client can list the tools it offers.',
      },
      prompt: {
        tooltip: 'Tell the tool what to do and what to return; name the tool and key parameters. See prompt patterns',
        docsLink: 'https://smythos.com/docs/agent-studio/components/tools/mcp-client/?utm_source=studio&utm_medium=tooltip&utm_campaign=mcp-client&utm_content=prompt#step-3-provide-inputs',
      },
      model: {
        tooltip: 'Choose the model that will plan and call tools; larger models help with long or multi step tasks.',
      },
      systemPrompt: {
        tooltip: 'Set rules for all calls, like allowed tools, tone, and required output format.',
      },
    },
  },

  // Crypto Components
  FHash: {
    description: 'Create a fixed-size fingerprint of your data for checks and IDs. Pick an algorithm, choose an output encoding, then pass the hash downstream. For quick picks and examples, see F:Hash guide.',
    docsLink: 'https://smythos.com/docs/agent-studio/components/crypto/hash/?utm_source=studio&utm_medium=tooltip&utm_campaign=hash&utm_content=component-header',
    fieldTooltips: {
      hashAlgorithm: {
        tooltip: 'Choose the hash function, like SHA-256 for integrity; avoid MD5 for security.',
        docsLink: 'https://smythos.com/docs/agent-studio/components/crypto/hash/?utm_source=studio&utm_medium=tooltip&utm_campaign=hash&utm_content=hash-algorithm#step-1-select-an-algorithm-and-encoding',
      },
      outputEncoding: {
        tooltip: 'Choose how the hash is returned: hex for readability or Base64 for compact size.',
      },
    },
  },

  FEncDec: {
    description: 'Converts data between text and binary encodings for safe storage, transport, and API compatibility. Supports Base64, Base64URL, hex, UTF-8, and Latin-1 with encode or decode actions. For quick picks and examples, see encoding basics.',
    docsLink: 'https://smythos.com/docs/agent-studio/components/crypto/encode-decode/?utm_source=studio&utm_medium=tooltip&utm_campaign=encode-decode&utm_content=component-header',
    fieldTooltips: {
      action: {
        tooltip: 'Select Encode to produce a formatted string, or Decode to read one.',
      },
      encoding: {
        tooltip: 'Choose the scheme: Base64 for binary, hex for hashes, UTF-8 for text.',
        docsLink: 'https://smythos.com/docs/agent-studio/components/crypto/encode-decode/?utm_source=studio&utm_medium=tooltip&utm_campaign=encode-decode&utm_content=encoding#step-1-select-an-action-and-encoding-method',
      },
    },
  },

  FSign: {
    description: 'Generates a digital signature with HMAC or RSA for webhook payloads and API requests. Verifiers must use the same method, key, hash, and encoding to match. For method tradeoffs and examples, see signing basics.',
    docsLink: 'https://smythos.com/docs/agent-studio/components/crypto/sign/?utm_source=studio&utm_medium=tooltip&utm_campaign=sign&utm_content=component-header#step-1-select-a-signature-method-and-settings',
    fieldTooltips: {
      signatureMethod: {
        tooltip: 'Choose HMAC with a shared secret or RSA with a private key.',
      },
      dataTransform: {
        tooltip: 'Prepare the data to sign: raw bytes, JSON stringify, or a canonical form.',
        docsLink: 'https://smythos.com/docs/agent-studio/components/crypto/sign/?utm_source=studio&utm_medium=tooltip&utm_campaign=sign&utm_content=data-transform#data-canonicalization',
      },
      keySecret: {
        tooltip: 'Provide the signing secret or private key; store in Vault, not in code.',
      },
      hashType: {
        tooltip: 'Select the digest used inside the method, for example SHA-256.',
      },
      outputEncoding: {
        tooltip: 'Choose how the signature is returned: hex, Base64, or Base64URL.',
      },
    },
  },

  FTimestamp: {
    description: 'Generate timestamps for your workflow.',
    fieldTooltips: {},
  },

  // RAG Data Components
  DataSourceLookup: {
    description: 'Retrieves relevant text from indexed knowledge using semantic search. Searches a chosen namespace and returns top matches with optional metadata and scores. For setup and tuning, see RAG Search guide.',
    docsLink: 'https://smythos.com/docs/agent-studio/components/rag-data/rag-search/?utm_source=studio&utm_medium=tooltip&utm_campaign=rag-search&utm_content=component-header',
    fieldTooltips: {
      namespace: {
        tooltip: 'Select the memory bucket to search, matching the namespace used when indexing.',
        docsLink: 'https://smythos.com/docs/agent-studio/components/rag-data/rag-search/?utm_source=studio&utm_medium=tooltip&utm_campaign=rag-search&utm_content=namespace#step-1-define-the-search-scope',
      },
      topK: {
        tooltip: 'Choose how many top matches to return; more can raise cost.',
      },
      includeMetadata: {
        tooltip: 'Return stored fields like title, URL, tags, and timestamps with each result.',
      },
      scoreThreshold: {
        tooltip: 'Hide items below this 0–1 relevance score; higher keeps only strong matches.',
        docsLink: 'https://smythos.com/docs/agent-studio/components/rag-data/rag-search/?utm_source=studio&utm_medium=tooltip&utm_campaign=rag-search&utm_content=score-threshold#step-2-filter-and-format-the-output',
      },
      includeScore: {
        tooltip: 'Add the similarity score to each item for sorting and debugging.',
      },
    },
  },

  DataSourceIndexer: {
    description: 'Adds or updates content in the agent\'s knowledge base. Stores text and optional metadata in a selected namespace with a stable source ID, enabling later search, updates, or deletion. Designed for incremental, traceable knowledge updates. For quick tips, see RAG Remember guide.',
    docsLink: 'https://smythos.com/docs/agent-studio/components/rag-data/rag-remember/?utm_source=studio&utm_medium=tooltip&utm_campaign=rag-remember&utm_content=component-header',
    fieldTooltips: {
      namespace: {
        tooltip: 'Select the memory bucket where this source is stored; keep staging and production separate.',
      },
      id: {
        tooltip: 'Stable unique ID for this source; allowed: a–z, A–Z, 0–9, -, _, .; reusing updates the existing entry.',
        docsLink: 'https://smythos.com/docs/agent-studio/components/rag-data/rag-remember/?utm_source=studio&utm_medium=tooltip&utm_campaign=rag-remember&utm_content=source-identifier#step-1-define-the-namespace-and-source-details',
      },
      name: {
        tooltip: 'Human-readable name shown in dashboards and logs.',
      },
      metadata: {
        tooltip: 'Optional JSON or text with author, tags, and timestamps to improve search and filtering.',
      },
    },
  },

  DataSourceCleaner: {
    description: 'Deletes a specific source from a selected namespace using its exact source identifier. Operation is permanent and intended for data hygiene and compliance workflows. For quick tips, see RAG Forget guide.',
    docsLink: 'https://smythos.com/docs/agent-studio/components/rag-data/rag-forget/?utm_source=studio&utm_medium=tooltip&utm_campaign=rag-forget&utm_content=source-identifier',
    fieldTooltips: {
      namespaceId: {
        tooltip: 'Select the namespace that contains the source to remove.',
      },
      id: {
        tooltip: 'Enter the exact ID used during indexing (a–z, A–Z, 0–9, -, _, .).',
        docsLink: 'https://smythos.com/docs/agent-studio/components/rag-data/rag-forget/?utm_source=studio&utm_medium=tooltip&utm_campaign=rag-forget&utm_content=source-identifier#step-1-specify-the-target-data',
      },
    },
  },

  // Memory Components
  MemoryWriteInput: {
    description: 'Write to memory by slot name for storing data that can be accessed later.',
    fieldTooltips: {
      name: {
        tooltip: 'Give this slot a unique name other nodes can read. <a href="#" target="_blank" class="text-blue-600 hover:text-blue-800">Go to Docs</a>',
      },
      scope: {
        tooltip: 'Choose scope: session, user, or project/global. <a href="#" target="_blank" class="text-blue-600 hover:text-blue-800">Go to Docs</a>',
      },
    },
  },

  MemoryWriteKeyVal: {
    description: 'Store key-value pairs in memory for later retrieval.',
    fieldTooltips: {
      memoryName: {
        tooltip: 'Select the key-value store to write into (e.g., \'crm_cache\'). <a href="#" target="_blank" class="text-blue-600 hover:text-blue-800">Go to Docs</a>',
      },
      key: {
        tooltip: 'Key for the value; supports dynamic inputs like {{user.id}}. <a href="#" target="_blank" class="text-blue-600 hover:text-blue-800">Go to Docs</a>',
      },
      value: {
        tooltip: 'Data to save: string, number, or JSON. <a href="#" target="_blank" class="text-blue-600 hover:text-blue-800">Go to Docs</a>',
      },
      scope: {
        tooltip: 'Pick persistence: session, user, or project. <a href="#" target="_blank" class="text-blue-600 hover:text-blue-800">Go to Docs</a>',
      },
    },
  },

  MemoryReadOutput: {
    description: 'Read data from memory slots by name.',
    fieldTooltips: {
      name: {
        tooltip: 'Name of the memory slot to read; must match the write. <a href="#" target="_blank" class="text-blue-600 hover:text-blue-800">Go to Docs</a>',
      },
      scope: {
        tooltip: 'Scope to read: session, user, or project. <a href="#" target="_blank" class="text-blue-600 hover:text-blue-800">Go to Docs</a>',
      },
    },
  },

  MemoryReadKeyVal: {
    description: 'Read key-value data from memory stores.',
    fieldTooltips: {
      name: {
        tooltip: 'Select the key-value store to query (e.g., \'crm_cache\'). <a href="#" target="_blank" class="text-blue-600 hover:text-blue-800">Go to Docs</a>',
      },
      scope: {
        tooltip: 'Choose session, user, or project for the lookup. <a href="#" target="_blank" class="text-blue-600 hover:text-blue-800">Go to Docs</a>',
      },
    },
  },

  MemoryDeleteKey: {
    description: 'Delete keys from memory stores.',
    fieldTooltips: {
      name: {
        tooltip: 'Select the key-value store containing the key to delete. <a href="#" target="_blank" class="text-blue-600 hover:text-blue-800">Go to Docs</a>',
      },
      scope: {
        tooltip: 'Choose the scope where the key should be removed. <a href="#" target="_blank" class="text-blue-600 hover:text-blue-800">Go to Docs</a>',
      },
    },
  },

  // Legacy Components
  LLMPrompt: {
    description: 'Generates a single, stateless completion from a text prompt using the selected model. Supports templated variables and an optional passthrough of the original input. This is a legacy component; for multi-turn chat or newer controls, see LLM Assistant and GenAI LLM.',
    fieldTooltips: {
      model: {
        tooltip: 'Select the language model that generates the response; larger models handle longer or harder tasks.',
      },
      prompt: {
        tooltip: 'Write clear instructions with placeholders (e.g., {{input}}) and state the expected format.',
        docsLink: 'https://smythos.com/docs/agent-studio/components/advanced/llm-assistant/?utm_source=app&utm_medium=component&utm_campaign=docs&utm_content=llm-prompt-legacy#step-2-define-the-behavior',
      },
    },
  },

  MultimodalLLM: {
    description: 'Runs a single-turn prompt on a multimodal model that reads text plus images, audio, or video. Accepts media inputs and returns a result ready for downstream steps. See setup, limits, and file types.',
    docsLink: 'https://smythos.com/docs/agent-studio/components/legacy/multimodal-llm/?utm_source=app&utm_medium=tooltip&utm_campaign=docs&utm_content=multimodal-llm-overview',
    fieldTooltips: {
      model: {
        tooltip: 'Select a multimodal model for text plus images, audio, or video.',
        docsLink: 'https://smythos.com/docs/agent-studio/components/legacy/multimodal-llm/?utm_source=app&utm_medium=tooltip&utm_campaign=docs&utm_content=multimodal-llm',
      },
      prompt: {
        tooltip: 'Describe the task and how the attached media is used (e.g., extract, compare, caption).',
      },
    },
  },

  VisionLLM: {
    description: 'Processes images with a vision model to extract text, detect objects, or describe scenes. Accepts one or more image inputs and returns a structured result. See supported formats and steps.',
    docsLink: 'https://smythos.com/docs/agent-studio/components/legacy/vision-llm/?utm_source=app&utm_medium=tooltip&utm_campaign=docs&utm_content=vision-llm-overview',
    fieldTooltips: {
      model: {
        tooltip: 'Choose a vision model for image understanding.',
        docsLink: 'https://smythos.com/docs/agent-studio/components/legacy/vision-llm/?utm_source=app&utm_medium=tooltip&utm_campaign=docs&utm_content=vision-llm-model#step-1-select-a-model',
      },
      prompt: {
        tooltip: 'Explain what to extract or describe from the images (for example, detection, OCR, quality check).',
      },
    },
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
export function getComponentDocumentation(componentClassName: string): ComponentDocumentation | null {
  if (!shouldShowComponentTooltips(componentClassName)) {
    return null;
  }

  return COMPONENT_DOCUMENTATION[componentClassName] || null;
}

/**
 * Get field tooltip for a specific component and field
 */
export function getFieldTooltip(componentClassName: string, fieldName: string): ComponentFieldTooltip | null {
  const componentDoc = getComponentDocumentation(componentClassName);
  if (!componentDoc || !componentDoc.fieldTooltips[fieldName]) {
    return null;
  }

  return componentDoc.fieldTooltips[fieldName];
}