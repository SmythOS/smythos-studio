export interface CreateRoleRequest {
  canManageTeam: boolean;
  name: string;
  acl: object;
}

export interface UpdateRoleRequest {
  canManageTeam: boolean;
  name: string;
  acl: object;
  roleId: string;
}

export interface InviteTeamMemberRequest {
  email: string;
  teamId?: string;
  spaceId?: string;
  agentId?: string;
  agentName?: string;
  roleId: number;
}
export interface InviteTeamMemberWithSubteamRequest {
  email: string;
  organizationId: string;
  spaceId: string;
  roleId: number;
}

export interface ShareAgentWithTeamMemberRequest {
  email: string;
  agentId: string;
  agentName?: string;
}

export interface UpdateTeamMemberRoleRequest {
  roleId: number;
}

export interface PostDomainRequest {
  name: string;
}
export interface SaveCustomVectorStorage {
  projectUrl: string;
  apiKey: string;
  indexName: string;
  environment: string;
}

/*
{
  "jobType": "AGENT_SCHEDULE",
  "name": "Send Message",
  "data": {
    "componentId": "component_1",
    "agentId": "clpc800ik9ti44wpjpitt",
    "body": {
      "foo": "bar"
    }
  },
  "options": {
    "repeat": {
      "patternDetails": {
        "daysOfWeek": [
          0,
          1,
          2,
          3,
          4,
          5,
          6
        ],
        "repeatEveryUnit": "hour",
        "repeatEvery": 1
      },
      "limit": 10,
      "startDate": "2021-01-01T00:00:00.000Z",
      "endDate": "2021-01-01T00:00:00.000Z"
    }
  }
}
*/
export interface CreateAgentScheduledJobRequest {
  jobType: 'AGENT_SCHEDULE';
  name?: string;
  data: {
    componentId: string;
    agentId: string;
    body: object;
  };
  options: {
    repeat?: {
      patternDetails?: {
        daysOfWeek: number[];
        repeatEveryUnit: 'min' | 'hour' | 'week';
        repeatEvery: number;
      };
      limit?: number;
      startDate?: string;
      endDate?: string;
    };
    delay?: number;
  };
}

export interface FetchAgentListRequest {
  page?: number;
  limit?: number;
  search?: string;
  sortField?: string;
  order?: string;
}

export interface FetchChatListRequest {
  isOwner?: boolean;
  page?: number;
  limit?: number;
  sortField?: string;
  order?: string;
}

export interface CreateChatRequest {
  conversation: {
    label: string;
    summary: string;
    aiAgentId: string;
    chunkSize: number;
    lastChunkID: string;
  };
}

export interface UpdateChatRequest {
  conversationId: string;
  conversation: {
    label: string;
    summary: string;
  };
}

export interface DeleteChatRequest {
  chatId: string;
}

export interface FetchChatMessagesRequest {
  chatId: string;
  agentId: string;
  page?: number;
  limit?: number;
}
