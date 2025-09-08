export interface AgentSettings {
  id: number;
  key: string;
  value: string;
  avatar: string;
  chatGptModel: string;
  lastConversationId: string;
  aiAgentId: string;
  createdAt: string;
  updatedAt: string;
}
interface Domain {
  name: string;
}
interface Connection {
  sourceId: string;
  sourceIndex: number;
  targetId: string;
  targetIndex: number;
}
export interface AgentData {
  version: string;
  components: Component[];
  connections: Connection[];
  description: string;
  behavior?: string;
  debugSessionEnabled: boolean;
  shortDescription: string;
  ui: { panzoom: { currentPan: { x: number; y: number }; currentZoom: number } };
}
export interface Agent {
  id: string;
  name?: string;
  updatedAt?: string;
  contributors?: {
    isCreator: boolean;
    user: {
      id: number;
      name: string;
      email: string;
      avatar: string;
    };
  }[];
  changeActivity?: {
    name: string;
    type: string;
    createdAt: string;
    user: {
      name: string;
      avatar: string;
      email: string;
    };
  }[];
  data?: {
    version: string;
    components: Component[];
    connections: Connection[];
    description: string;
    behavior?: string;
    debugSessionEnabled: boolean;
    shortDescription: string;
    ui: {
      panzoom: {
        currentPan: {
          x: number;
          y: number;
        };
        currentZoom: number;
      };
    };
  };
  aiAgentSettings?: AgentSettings[];
  domain?: Domain[];
  isLocked?: boolean;
  _count?: {
    AiAgentDeployment: number;
  };
  description?: string | null;
  shortDescription?: string | null;
  __disabled?: boolean;
  createdAt?: string;
  isPinned?: boolean;
}

export interface Component {
  id: string;
  name: string;
  outputs: Output[];
  inputs: Input[];
  data: ComponentData;
  top: string;
  left: string;
  width: string;
  height: string;
  displayName: string;
  title: string;
  description: string;
}

export interface Output {
  name: string;
  color: string;
  index: number;
  default: boolean;
}

export interface Input {
  name: string;
  color: string;
  optional: boolean;
  index: number;
  default: boolean;
  type?: 'Any' | 'String' | 'Number' | 'Binary' | 'Image' | 'Text' | 'Audio' | 'Video';
}

export interface ComponentData {
  model?: string;
  prompt?: string;
  maxTokens?: string;
  temperature?: string;
  stopSequences?: string;
  topP?: string;
  topK?: string;
  frequencyPenalty?: string;
  presencePenalty?: string;
  endpoint?: string;
  description?: string;
  ai_exposed?: boolean;
  method?: string;
  openAiModel?: string;
  specUrl?: string;
  descForModel?: string;
  logoUrl?: string;
}

export interface AgentDataResponse {
  message: string;
  agents: AgentDetails[];
  total: number;
}

export interface AgentDetails {
  id: string;
  name: string;
  description: string;
  aiAgentSettings: AgentSettings;
  contributors: Contributor[];
  createdAt: string;
  updatedAt: string;
  changeActivity: ChangeActivity[];
  domain: Domain[];
  lockAt: string;
  _count: { AiAgentDeployment: number };
  isLocked: boolean;
}

export interface Contributor {
  isCreator: boolean;
  user: {
    id: number;
    name: string;
    avatar: string;
    email: string;
  };
}

export interface ChangeActivity {
  name: string;
  type: string;
  createdAt: string;
  user: {
    name: string;
    avatar: string;
    email: string;
  };
}
