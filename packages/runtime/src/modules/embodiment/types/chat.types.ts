export enum EChatMessageRole {
  User = 'user',
  System = 'system',
  Assistant = 'assistant',
}

export interface IMetadataFile {
  id: string;
  label: string;
  summary: string;
  teamId: string;
  agentId: string;
  chunkSize: number;
  lastChunkId: number;
}

export interface IChatMessage {
  content: string;
  timestamp?: number;
  role: EChatMessageRole;
}

export interface IChatStorage {
  exists: (fileName: string) => Promise<boolean>;
  read: (fileName: string) => Promise<string | null>;
  write: (fileName: string, data: string, metadata: Record<any, any>) => Promise<void>;
  setParams: (params: { teamId: string; userId: string; agentId: string; conversationId: string }) => void;
}
