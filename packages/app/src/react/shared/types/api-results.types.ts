import { Agent } from '@react/shared/types/agent-data.types';
import { CombinedAclRules } from '@shared/constants/acl.constant';

export interface TeamRole {
  isOwnerRole: boolean;
  canManageTeam: boolean;
  name: string;
  acl: CombinedAclRules | null;
  id: number;
}
export interface TeamRoleWithMembers {
  isOwnerRole: boolean;
  canManageTeam: boolean;
  name: string;
  acl: CombinedAclRules | null;
  id: string;

  userTeamRole: { user: Pick<TeamMemberWithRole, 'id' | 'name' | 'email' | 'avatar'> }[];
}

export interface TeamMemberWithRole {
  id: number;
  name: string | null;
  email: string;
  createdAt: string;
  avatar: string | null;
  userTeamRole: { userSpecificAcl: object; isTeamInitiator: boolean; sharedTeamRole: TeamRole };
}

export interface Invitation {
  id: number;
  email: string;
  status: 'ACCEPTED' | 'PENDING' | 'REJECTED';
  expiresAt: string;
  teamRole: TeamRole;
}

// should not be here
export interface SmythAPIError {
  error: { code: string; message: string; errKey?: string };
  status?: number;
}

/**
 * @deprecated use `Domain` instead because this is inaccurate in terms of the data it represents
 */
export interface Domains {
  name: string;
  aiAgent: object;
  aiAgentEndpoint: [];
}

export interface Domain {
  aiAgent: { id: string; name: string };
  aiAgentEndpoint: [];
  createdAt: string;
  id: string;
  lastStatus: null;
  name: string;
  updatedAt: string;
  verified: boolean;
}

export interface Deployment {
  aiAgent: { name: string };
  aiAgentId: string;

  id: string;
  createdAt: string;
  majorVersion: number;
  minorVersion: number;
  releaseNotes: string;

  version: string;
}

export interface DeploymentWithAgentSnapshot extends Deployment {
  aiAgentData: Agent['data'];
  aiAgent: { name: string; domain: { name: string; id: string }[] };
}

export interface ChatbotEmbodimentData {
  name: string;
  introMessage: string;
  chatGptModel: string;
  syntaxHighlightTheme: string;
  personality: string;
  icon: string | null;
  allowedDomains: string[];
  isFullScreen?: boolean;
  allowFileAttachments?: boolean;

  colors: {
    botBubbleColors: {
      textColor: string;
      backgroundColorStart: string;
      backgroundColorEnd: string;
    };
    humanBubbleColors: {
      textColor: string;
      backgroundColorStart: string;
      backgroundColorEnd: string;
    };
    chatWindowColors: {
      backgroundColor: string;
      headerBackgroundColor: string;
      footerBackgroundColor: string;
    };
    chatTogglerColors: { backgroundColor: string; textColor: string };
    sendButtonColors: { backgroundColor: string; textColor: string };
  };
}

export type Embodiment =
  | {
      createdAt: string;
      id: string;
      type: 'chatbot';
      properties: ChatbotEmbodimentData;
      aiAgentId: string;
    }
  | {
      createdAt: string;
      id: string;
      type: 'chatgpt' | string;
      properties: { [key: string]: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
      aiAgentId: string;
    };

export interface AgentScheduledJob {
  id: string;
  createdAt: string;
  name: string;
  aiAgentId: string;
  data: {
    componentId: string;
    agentId: string;
    method: 'POST' | 'GET';
    body: object;
    teamId: string;
  };
  lastRunAt: string | null;
  componentId: string;
  status: 'DELETED' | 'ACTIVE' | 'PAUSED' | 'DONE';
  jobLogs: AgentScheduledJobLog[] | null;
  options: {
    repeat?: {
      pattern: string;
      every?: string;
      limit?: number;
      startDate?: string;
      endDate?: string;
    };
    delay?: string;
  };

  updatedAt: string;
  nextRunAt?: string | null;
}

export type AgentScheduledJobLog = {
  timestamp: string;
  status: number;
  isSuccessful: boolean;
  result: object;
  logs: string[];
  sessionTag?: string;
} | null;

export interface BulkAgentCallJob {
  data: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  completedIds?: string;
  failedMsg?: string;
  agentId: string;
  componentId: string;
  teamId: string;
}

export interface CreateChatsResponse {
  id: string;
  aiAgentId: string;
  chunkSize: number;
  lastChunkID: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  summary: string;
  teamId: string;
}

export interface SingleResponseConversation {
  id: string;
  aiAgentId: string;
  chunkSize: number;
  lastChunkID: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  summary: string;
  teamId: string;
  firstQuery?: string;
}

export interface FetchChatListResponse {
  data: { conversations: SingleResponseConversation[]; total: number };
}

export interface DeleteChatResponse {
  message: string;
}

export interface UpdateChatResponse {
  message: string;
}
