import { createLockBadge } from '../ui/badges';

// ! DEPRECATED: This entire file will be removed

// ! DEPRECATED function in favor of src/builder-ui/helpers/LLMRegistry.helper.ts, will be replaced by LLMRegistry
// Function to calculate the allowed maximum tokens for a given model
export function getAllowedContextTokens(model: string) {
  // Use window models directly to ensure we always have the latest values
  return window['__LLM_MODELS__']?.[model]?.tokens;
}

// ! DEPRECATED function in favor of src/builder-ui/helpers/LLMRegistry.helper.ts, will be replaced by LLMRegistry
export const getAllowedCompletionTokens = (model) => {
  // Use window models directly to ensure we always have the latest values
  const modelInfo = window['__LLM_MODELS__']?.[model];
  const maxTokens = modelInfo?.completionTokens || modelInfo?.tokens;

  return maxTokens ?? 1024;
};

// Assign weights to tags
const TAGS_WEIGHTS = {
  legacy: 2,
  deprecated: 3,
  removed: 1,
  default: 0,
};

const llmProviders = ['openai', 'anthropic', 'togetherai', 'googleai', 'groq', 'xai'];

// ! DEPRECATED: We move this function to UI Backend src/backend/services/LLMHelper/index.ts
export function getTokenTag(contextWindow) {
  if (!contextWindow) return '';

  if (contextWindow >= 1000000) {
    return `${Math.floor(contextWindow / 1000000)}M`;
  } else {
    return `${Math.floor(contextWindow / 1000)}K`;
  }
}

function sortModels(models) {
  return models.sort((a, b) => {
    const aWeight = a.tags.some((tag) => TAGS_WEIGHTS[tag])
      ? Math.max(...a.tags.map((tag) => TAGS_WEIGHTS[tag] || TAGS_WEIGHTS.default))
      : TAGS_WEIGHTS.default;
    const bWeight = b.tags.some((tag) => TAGS_WEIGHTS[tag])
      ? Math.max(...b.tags.map((tag) => TAGS_WEIGHTS[tag] || TAGS_WEIGHTS.default))
      : TAGS_WEIGHTS.default;

    return aWeight - bWeight;
  });
}

function handleLockedModels(lockedModels) {
  return lockedModels.map((modelKey) => {
    const model = window['__LLM_MODELS__'][modelKey];
    return {
      text: model.text,
      value: model.value,
      badge: createLockBadge(),
      tags: ['locked'],
    };
  });
}
