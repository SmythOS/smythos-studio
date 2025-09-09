/**
 * Models Configuration
 *
 * This file provides TypeScript types and loads the models configuration
 * from a JSON file for better maintainability.
 */

import modelsData from '@data/models.json';

// Base interface with all possible fields for non-Echo models
interface BaseModelConfig {
  label: string;
  modelId: string;
  provider: string;
  features: string[];
  tags: string[];
  tokens: number;
  completionTokens: number;
  enabled: boolean;
  keyOptions: {
    tokens: number;
    completionTokens: number;
    maxReasoningTokens?: number;
    enabled: boolean;
  };
  credentials: string;
  interface?: string;
  default?: boolean;
}

// Echo model configuration (only requires provider)
interface EchoModelConfig {
  provider: 'Echo';
}

// Conditional type: if provider is "Echo", use EchoModelConfig, otherwise use BaseModelConfig
type ModelConfig = EchoModelConfig | BaseModelConfig;

type ModelsConfig = Record<string, ModelConfig>;

// Load models configuration from JSON file
export const modelsConfig: ModelsConfig = modelsData as ModelsConfig;
