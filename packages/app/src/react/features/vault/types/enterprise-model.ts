export interface CreateEnterpriseModelStep1 {
  name: string;
  provider: string;
  features: string[];
  contextWindowSize: number;
  completionTokens: number;
  tags: string[];
}

export interface CreateEnterpriseModelStep2 {
  modelName: string;
  customModelName?: string;
  settings: {
    customModel?: string;
    keyId?: string;
    secretKey?: string;
    sessionKey?: string;
    projectId?: string;
    jsonCredentials?: string;
  };
  region: string;
}

export type CreateEnterpriseModelData = CreateEnterpriseModelStep1 & CreateEnterpriseModelStep2;
