/**
 * Models Configuration
 *
 * This file provides TypeScript types and loads the models configuration
 * from a JSON file for better maintainability.
 */

import modelsData from "./models.json";

export interface ModelConfig {
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

export type ModelsConfig = Record<string, ModelConfig>;

// Load models configuration from JSON file
export const modelsConfig: ModelsConfig = modelsData as ModelsConfig;
