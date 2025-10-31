import { llmModelsStore } from '../state_stores/llm-models';
import { LLMModel } from '../types';

/**
 * Class responsible for managing and filtering LLM models
 */
export class LLMRegistry {
  private static readonly MODELS_ORDER_BY_TAG = [
    'enterprise',
    'custom',
    'personal',
    'smythos',
    'default', // Added default tag for models with no special tags
    'legacy',
    'deprecated',
    'retired',
    'removed',
  ];

  private static readonly PROVIDER_ORDER = [
    'openai',
    'anthropic',
    'googleai',
    'perplexity',
    'togetherai',
    'others',
  ];

  // Single source of truth for determining GPT5 models (verbosity + reasoning effort support)
  private static readonly GPT5_MODEL_PATTERN = /gpt-5/i;
  private static readonly O3_AND_O4_MODELS_PATTERN = /o3|o4/i;

  public static getModels(): Record<string, LLMModel> {
    const models = llmModelsStore.getState()?.models || {};
    return models;
  }

  // We use store models to access the latest values, with fallback to window for backward compatibility
  // This ensures consistency across the application

  public static getAllowedContextTokens(model: string) {
    const models = this.getModels();
    return models[model]?.tokens;
  }

  public static getAllowedCompletionTokens(model: string) {
    const models = this.getModels();
    const maxTokens = models[model]?.completionTokens || models[model]?.tokens;
    return maxTokens ?? 1024;
  }

  public static getWebSearchContextTokens(model: string) {
    const models = this.getModels();
    return models[model]?.searchContextTokens;
  }

  public static getMaxReasoningTokens(model: string) {
    const models = this.getModels();
    return models[model]?.maxReasoningTokens || 1024;
  }

  /**
   * Gets the provider for a given model name
   * @param model - The model name
   * @returns The provider name (e.g., 'openai', 'xai', 'anthropic')
   */
  public static getModelProvider(model: string): string {
    // 'Echo' is not included in the models list
    if (model === 'Echo') return 'Echo';

    const models = this.getModels();
    const modelInfo = models[model];

    return modelInfo?.provider || '';
  }

  /**
   * Gets models that support specific feature(s) from specified providers or all providers if none specified.
   * This method is designed to be scalable and can easily accommodate new providers and features.
   *
   * @param features - The feature(s) to filter by. Can be a single feature string or array of features.
   *                  For single feature: exact match required.
   *                  For multiple features: models must support at least one of these features.
   *                  Examples: 'reasoning', ['text', 'image', 'image-generation']
   * @param providers - Optional provider(s) to filter by (case-insensitive).
   *                   Can be a single provider string or array of providers.
   *                   If not provided, returns models from all providers.
   *                   Examples: 'anthropic', ['openai', 'anthropic'], etc.
   * @returns Array of LLMModel objects that support the specified feature(s) (unsorted)
   */
  public static getModelsByFeatures(
    features: string | string[],
    providers?: string | string[],
  ): LLMModel[] {
    const models = this.getModels();
    const targetFeatures = Array.isArray(features) ? features : [features];
    const modelEntries: [string, any][] = [];

    // Normalize provider names to lowercase for case-insensitive comparison
    const normalizedProviders = providers
      ? (Array.isArray(providers) ? providers : [providers]).map((p) => p.toLowerCase())
      : null;

    for (const [key, model] of Object.entries(models)) {
      if (
        model &&
        typeof model === 'object' &&
        'provider' in model &&
        'features' in model &&
        Array.isArray(model.features)
      ) {
        // Check if model supports at least one of the target features
        const hasRequiredFeature = targetFeatures.some((feature) =>
          (model.features as string[]).includes(feature),
        );

        if (!hasRequiredFeature) {
          continue;
        }

        // If no providers specified, include all models with the feature(s)
        if (!normalizedProviders) {
          modelEntries.push([key, model]);
          continue;
        }

        // Check if model's provider is in the requested providers list
        const modelProvider = (model.provider as string).toLowerCase();
        if (normalizedProviders.includes(modelProvider)) {
          modelEntries.push([key, model]);
        }
      }
    }

    // Convert to structured model objects
    return modelEntries.map(([entryId, modelInfo]) => ({
      entryId,
      ...modelInfo,
    }));
  }

  /**
   * Gets models that support specific feature(s) and returns them sorted by priority.
   * This is a convenience method that combines getModelsByFeatures with sortModels.
   *
   * @param features - The feature(s) to filter by. Can be a single feature string or array of features.
   * @param providers - Optional provider(s) to filter by (case-insensitive).
   *                   Can be a single provider string or array of providers.
   * @returns Sorted array of LLMModel objects that support the specified feature(s)
   */
  public static getSortedModelsByFeatures(
    features: string | string[],
    providers?: string | string[],
  ): LLMModel[] {
    const models = this.getModelsByFeatures(features, providers);
    return this.sortModels(models);
  }

  /**
   * Sorts an array of LLM models using a multi-level sorting strategy.
   *
   * Sorting priority (in order):
   * 1. Exclusion group: Non-excluded models come first, then Legacy, Deprecated, Retired, Removed
   * 2. Regular tag priority: Enterprise → Custom → Personal → SmythOS → Default (maintained within each exclusion group)
   * 3. Provider order: OpenAI → Anthropic → GoogleAI → Perplexity → TogetherAI → Others
   * 4. Alphabetically by label (tie-breaker)
   *
   * Example order:
   * - Personal GPT-4 (non-excluded)
   * - SmythOS Claude (non-excluded)
   * - Personal GPT-3 (Legacy)
   * - SmythOS GPT-3.5 (Legacy)
   * - Personal GPT-1 (Deprecated)
   * - SmythOS GPT-2 (Deprecated)
   *
   * @param models - Array of LLMModel objects to sort
   * @returns New sorted array of models (does not mutate the original array)
   */
  public static sortModels(models: LLMModel[]): LLMModel[] {
    // Create a copy to avoid mutating the original array
    const modelsCopy = [...models];

    const excludedTags = new Set(['legacy', 'deprecated', 'retired', 'removed']);

    const hasExcludedTag = (tags: string[]): boolean => {
      return tags.some((tag) => excludedTags.has(tag.toLowerCase()));
    };

    /**
     * Gets the excluded tag with the lowest priority (highest index in MODELS_ORDER_BY_TAG).
     * Returns -1 if no excluded tags are found.
     */
    const getLowestPriorityExcludedTag = (tags: string[]): number => {
      const normalizedTags = tags.map((tag) => tag.toLowerCase());
      const modelExcludedTags = normalizedTags.filter((tag) => excludedTags.has(tag));

      if (modelExcludedTags.length === 0) {
        return -1;
      }

      // Find the excluded tag with the lowest priority (highest index)
      let lowestPriorityIndex = -1;
      for (const tag of modelExcludedTags) {
        const index = this.MODELS_ORDER_BY_TAG.indexOf(tag);
        if (index > lowestPriorityIndex) {
          lowestPriorityIndex = index;
        }
      }
      return lowestPriorityIndex;
    };

    /**
     * Gets the highest priority regular tag (non-excluded).
     * This is used for sorting within exclusion groups.
     */
    const getHighestPriorityRegularTag = (tags: string[]): number => {
      const normalizedTags = tags.map((tag) => tag.toLowerCase());
      // Filter out excluded tags and find the highest priority regular tag
      const regularTags = normalizedTags.filter((tag) => !excludedTags.has(tag));

      const index = this.MODELS_ORDER_BY_TAG.findIndex((tag) =>
        regularTags.includes(tag.toLowerCase()),
      );
      // Return index of 'default' if no matching tag is found
      return index !== -1 ? index : this.MODELS_ORDER_BY_TAG.indexOf('default');
    };

    const getProviderPriority = (provider: string): number => {
      const normalizedProvider = provider.toLowerCase();
      const index = this.PROVIDER_ORDER.findIndex((p) => p === normalizedProvider);
      // Return high number for unknown providers to sort them to the end
      return index !== -1 ? index : this.PROVIDER_ORDER.length;
    };

    return modelsCopy.sort((a, b) => {
      // First level: Sort by excluded tag priority (non-excluded → legacy → deprecated → retired → removed)
      const aExcludedTagWeight = getLowestPriorityExcludedTag(a.tags);
      const bExcludedTagWeight = getLowestPriorityExcludedTag(b.tags);

      // If one has excluded tags and the other doesn't, non-excluded comes first
      if ((aExcludedTagWeight === -1) !== (bExcludedTagWeight === -1)) {
        return aExcludedTagWeight === -1 ? -1 : 1;
      }

      // If both have excluded tags, sort by excluded tag priority
      if (aExcludedTagWeight !== -1 && bExcludedTagWeight !== -1) {
        if (aExcludedTagWeight !== bExcludedTagWeight) {
          return aExcludedTagWeight - bExcludedTagWeight;
        }
      }

      // Second level: Within the same exclusion group, sort by regular tag priority
      // (Enterprise → Custom → Personal → SmythOS → Default)
      const aRegularTagWeight = getHighestPriorityRegularTag(a.tags);
      const bRegularTagWeight = getHighestPriorityRegularTag(b.tags);

      if (aRegularTagWeight !== bRegularTagWeight) {
        return aRegularTagWeight - bRegularTagWeight;
      }

      // Third level: Within the same tag group, sort by provider order
      const aProviderWeight = getProviderPriority(a.provider);
      const bProviderWeight = getProviderPriority(b.provider);

      if (aProviderWeight !== bProviderWeight) {
        return aProviderWeight - bProviderWeight;
      }

      // Fourth level: If same tag and provider, sort alphabetically by label as a tie-breaker
      return a.label.localeCompare(b.label);
    });
  }

  /**
   * Get all GPT5 models that support both verbosity and reasoning effort parameters
   *
   * @returns Array of model IDs that are GPT5 models
   */
  public static getGpt5ReasoningModels(): string[] {
    const models = this.getModels();
    return Object.keys(models).filter((modelId) => this.isGpt5ReasoningModels(modelId));
  }

  /**
   * Check if a model is a GPT5 model (supports both verbosity and reasoning effort).
   *
   * @param modelId - The model ID to check
   * @returns True if the model is a GPT5 model
   */
  public static isGpt5ReasoningModels(modelId: string): boolean {
    const models = this.getModels();
    return Boolean(
      modelId &&
        this.GPT5_MODEL_PATTERN.test(modelId) &&
        models?.[modelId]?.features?.includes('reasoning'),
    );
  }

  /**
   * Get all GPT5 models based on model name pattern matching
   *
   * @returns Array of model IDs that match the GPT5 pattern (case-insensitive)
   */
  public static getGpt5Models(): string[] {
    const models = this.getModels();
    return Object.keys(models).filter((modelId) => this.isGpt5Models(modelId));
  }

  /**
   * Check if a model is a GPT5 model based on its name pattern
   *
   * @param modelId - The model ID to check
   * @returns True if the model ID matches the GPT5 pattern (case-insensitive), false otherwise
   */
  public static isGpt5Models(modelId: string): boolean {
    return Boolean(modelId && this.GPT5_MODEL_PATTERN.test(modelId));
  }

  /**
   * Get all O3 and O4 models based on model name pattern matching
   *
   * @returns Array of model IDs that match the O3 and O4 pattern (case-insensitive)
   */
  public static getO3andO4Models(): string[] {
    const models = this.getModels();
    return Object.keys(models).filter((modelId) => this.isO3andO4Models(modelId));
  }

  /**
   * Check if a model is an O3 or O4 model based on its name pattern
   *
   * @param modelId - The model ID to check
   * @returns True if the model ID matches the O3 or O4 pattern (case-insensitive), false otherwise
   */
  public static isO3andO4Models(modelId: string): boolean {
    return Boolean(modelId && this.O3_AND_O4_MODELS_PATTERN.test(modelId));
  }
}
