/**
 * Represents an enterprise model in the system
 */
export interface EnterpriseModel {
  /**
   * Unique identifier for the model
   */
  id: string;

  /**
   * Display name of the model
   */
  name: string;

  /**
   * The underlying model name/identifier
   */
  modelName: string;

  /**
   * The custom model name
   */
  customModelName?: string;

  /**
   * The size of the context window in tokens
   */
  contextWindowSize: number;

  /**
   * List of features supported by the model (e.g., 'text', 'image', 'video', 'code', 'tools')
   */
  features: string[];

  /**
   * List of tags associated with the model (e.g., 'Enterprise', 'bedrock', '128k')
   */
  tags: string[];

  /**
   * The provider of the model (e.g., 'OpenAI', 'Anthropic', 'Bedrock')
   */
  provider?: string;

  /**
   * Whether the model is enabled
   */
  enabled?: boolean;

  /**
   * The maximum number of tokens that can be generated in a completion
   */
  completionTokens?: number;

  /**
   * Whether this is a custom LLM
   */
  isCustomLLM?: boolean;

  /**
   * Model-specific settings
   */
  settings?: Record<string, any>;
}

/**
 * Represents an API key with its associated metadata
 */
export interface ApiKey {
  id: string;
  /**
   * The unique API key string
   */
  key: string;

  /**
   * Human-readable name for the API key
   */
  name: string;

  /**
   * The owner of the API key
   */
  owner: string;

  /**
   * The scope of access granted to this API key
   */
  scope: string[];
}

/**
 * Represents a user's profile with their feature access information
 */
export interface UserProfile {
  /**
   * Features and permissions available to the user
   */
  features: {
    /**
     * Whether the user has access to custom user models
     */
    hasUserModels: boolean;

    /**
     * Whether the user has enterprise-level access
     */
    isEnterpriseUser: boolean;
  };
}

/**
 * Represents a built-in AI model available in the system
 */
export interface BuiltInModel {
  /**
   * Unique identifier for the model
   */
  id: string;

  /**
   * Display name of the model
   */
  name: string;

  /**
   * Whether the model is currently enabled
   */
  isEnabled: boolean;

  /**
   * Icon identifier for the model
   */
  icon: string;
}

/**
 * Represents a user's custom AI model configuration
 */
export interface UserModel {
  /**
   * Unique identifier for the model, prefixed with 'user/'
   */
  id: string;

  /**
   * Display name of the model
   */
  name: string;

  /**
   * API key associated with the model
   */
  apiKey: string;

  /**
   * Icon identifier for the model
   */
  icon: string;
}

export interface ApiKeysResponse {
  keys?: ApiKey[];
  error?: string;
}

/**
 * Represents a user custom LLM model in the system
 */
export interface UserCustomModel {
  /**
   * Unique identifier for the model
   */
  id: string;

  /**
   * Display name of the model
   */
  name: string;

  /**
   * The model ID entered by the user
   */
  modelId: string;

  /**
   * Base URL for the user custom model API
   */
  baseURL: string;

  /**
   * Provider / Compatible SDK (e.g., 'OpenAI', 'Ollama')
   */
  provider: string;
  /**
   * Fallback LLM ID from builtin LLMs
   */
  fallbackLLM: string;

  /**
   * List of features supported by the model (e.g., 'text', 'tools')
   */
  features?: string[];
}
