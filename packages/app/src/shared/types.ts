type VaultMetadataObj = {
  isSynced?: boolean;
  field?: string;
  customLLMEntryId?: string;
  customLLMEntryName?: string;
};

export type VaultKeyObj = {
  id?: string;
  key: string;
  scope: string[];
  team?: string; // team ID
  owner?: string; // user email
  name: string;
  isInvalid?: boolean;
  metadata?: VaultMetadataObj;
  keyMetadata?: Record<string, any>;
};

export enum CustomLLMProviders {
  Bedrock = 'Bedrock',
  VertexAI = 'VertexAI',
}

export interface LLMModel {
  entryId: string;
  modelId: string;
  label: string;
  provider: string;
  tags: string[];
  features: string[];
  tokens: number;
  completionTokens: number;
  default?: boolean;
  hidden?: boolean;
  searchContextTokens?: number;
  maxReasoningTokens?: number;
}
