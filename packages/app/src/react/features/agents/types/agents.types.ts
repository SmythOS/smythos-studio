export interface Agent {
  id: string;
  name: string;
  description: string | null;
  shortDescription: string | null;
  createdAt: string;
  updatedAt: string;
  __disabled: boolean;
  _count: { AiAgentDeployment: number };
  contributors?: {
    isCreator: boolean;
    user: {
      id: number;
      name: string;
      email: string;
      avatar: string;
    };
  }[];
  isLocked?: boolean;
  aiAgentSettings?: {
    id: number;
    key: string;
    value: string;
    aiAgentId: string;
    createdAt: string;
    updatedAt: string;
  }[];
  avatar?: string;
  status?: string;
  isPublic?: boolean;
  userId?: string;
  teamId?: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  image?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SortOption {
  value: string;
  title: string;
}

export interface AgentsPageState {
  agents: Agent[];
  templates: Template[];
  currentPage: number;
  totalAgents: number;
  searchQuery: string;
  sortCriteria: string;
  sortOrder: 'asc' | 'desc';
  isAgentsLoading: boolean;
  isLoadingMore: boolean;
  isInitialLoading: boolean;
  isLoadingAfterAction: boolean;
  agentsUpdated: boolean;
}

export interface GenerateAgentFormData {
  message: string;
  attachmentFile: File | null;
  isFileUploading: boolean;
}

export enum EAgentSettings {
  AVATAR = 'avatar',
  DISABLED = '__disabled',
}

export type TAgentSettings = {
  [key in EAgentSettings]: string;
};
