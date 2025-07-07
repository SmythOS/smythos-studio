export interface AgentData {
  version: string;
  components: Component[];
  connections: any[];
  description: string;
  debugSessionEnabled: boolean;
  ui: {
    panzoom: {
      currentPan: {
        x: number;
        y: number;
      };
      currentZoom: number;
    };
  };
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
  type?: 'Any' | 'String' | 'Number' | 'Binary';
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
