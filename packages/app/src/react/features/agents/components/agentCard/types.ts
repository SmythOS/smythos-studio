export interface AgentUser {
  id: number;
  name: string;
  email: string;
  avatar: string;
}

export interface AgentContributor {
  isCreator: boolean;
  user: AgentUser;
}

export interface AgentSetting {
  id: number;
  key: string;
  value: string;
  aiAgentId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentCount {
  AiAgentDeployment: number;
}

export interface IAgent {
  id: string;
  name: string;
  description: string | null;
  shortDescription: string | null;
  createdAt: string;
  updatedAt: string;
  __disabled: boolean;
  _count: AgentCount;
  contributors?: AgentContributor[];
  isLocked?: boolean;
  aiAgentSettings?: AgentSetting[];
  avatar?: string;
  status?: string;
  isPublic?: boolean;
  userId?: string;
  teamId?: string;
  isPinned?: boolean;
}

export interface AgentActivity {
  name: string;
  type: string;
  createdAt: string;
  user: AgentUser;
}

export interface AgentCardState {
  isDeleted: boolean;
  isDeleting: boolean;
  isDuplicating: boolean;
  isPinning: boolean;
  showTooltip: boolean;
  tooltipPosition: 'top' | 'bottom';
  isActionDropdownVisible: boolean;
  isButtonTooltipVisible: boolean;
  hoverTimeout: NodeJS.Timeout | null;
}

export interface AgentPermissions {
  canEdit: boolean;
  canRead: boolean;
  canDelete: boolean;
  canDuplicate: boolean;
}

export interface AgentCardCallbacks {
  onAgentClick: (agentId: string) => void;
  onAgentDeleted?: () => void;
  onAgentDuplicated?: () => void;
  onLoadAgents: (page: number, isInitialLoad?: boolean) => void;
}

export interface DuplicateAgentResponse {
  success: boolean;
  message: string;
  agentId?: string;
}

export interface UseAgentDataResult {
  avatarImage: string;
  agentOwner: AgentContributor | undefined;
  userName: string;
  description: string;
  permissions: AgentPermissions;
  isAvailable: boolean;
  isPrivilegedUser: boolean;
  flatSettings: Record<string, string>;
}

export type TooltipPosition = 'top' | 'bottom';
export type AgentStatus = 'online' | 'offline' | 'error';
export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl' | '3lg';
