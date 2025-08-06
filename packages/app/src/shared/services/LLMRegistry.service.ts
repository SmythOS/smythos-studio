import { llmModelsStore } from '../state_stores/llm-models';
import { LLMModel } from '../types';

/**
 * Class responsible for managing and filtering LLM models
 */
export class LLMRegistry {
  private static readonly MODELS_ORDER_BY_TAG = [
    'enterprise',
    'personal',
    'smythos',
    'default', // Added default tag for models with no special tags
    'legacy',
    'deprecated',
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
   * Sorts an array of LLM models based on their tags and provider.
   * Models are grouped first by tag priority, then by provider order within each tag group.
   * Provider order: OpenAI, Anthropic, GoogleAI, Perplexity, TogetherAI, Others
   * Tag order: Enterprise, Personal, SmythOS, Default, then Legacy/Deprecated/Removed at the end
   *
   * @param models - Array of LLMModel objects to sort
   * @returns New sorted array of models grouped by tags and sorted by provider (does not mutate the original array)
   */
  public static sortModels(models: LLMModel[]): LLMModel[] {
    // Create a copy to avoid mutating the original array
    const modelsCopy = [...models];

    const excludedTags = new Set(['legacy', 'deprecated', 'removed']);

    const hasExcludedTag = (tags: string[]): boolean => {
      return tags.some((tag) => excludedTags.has(tag.toLowerCase()));
    };

    const getHighestPriorityTag = (tags: string[]): number => {
      const normalizedTags = tags.map((tag) => tag.toLowerCase());
      const index = this.MODELS_ORDER_BY_TAG.findIndex((tag) =>
        normalizedTags.includes(tag.toLowerCase()),
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
      // First, separate excluded models (legacy, deprecated, removed) from regular models
      const aExcluded = hasExcludedTag(a.tags);
      const bExcluded = hasExcludedTag(b.tags);

      // If one is excluded and the other is not, excluded goes to the end
      if (aExcluded !== bExcluded) {
        return aExcluded ? 1 : -1;
      }

      // Within the same exclusion group, sort by tag priority
      const aTagWeight = getHighestPriorityTag(a.tags);
      const bTagWeight = getHighestPriorityTag(b.tags);

      if (aTagWeight !== bTagWeight) {
        return aTagWeight - bTagWeight;
      }

      // Within the same tag group, sort by provider order
      const aProviderWeight = getProviderPriority(a.provider);
      const bProviderWeight = getProviderPriority(b.provider);

      if (aProviderWeight !== bProviderWeight) {
        return aProviderWeight - bProviderWeight;
      }

      // If same tag and provider, sort alphabetically by label as a tie-breaker
      return a.label.localeCompare(b.label);
    });
  }
}
