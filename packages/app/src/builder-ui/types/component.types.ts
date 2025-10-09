export interface Settings {
  [key: string]: {
    type?: string; //input,textarea,select,button, div, span, p
    label?: string;
    value?: any;
    hint?: string;
    html?: string;
    status?: string; // 'error', 'loading'
    source?: () => void;
    options?: string[] | { value: string; text: string }[];
    [key: string]: any;
  };
}

export type ComponentProperties = {
  outputs?: string[];
  inputs?: string[];
  data?: any;
  top?: string;
  left?: string;
  width?: string;
  height?: string;
  title?: string;
  description?: string;
  sender?: any;
  uid?: string;
  defaultOutputs?: string[];
  defaultInputs?: string[];
  outputProps?: any[];
  inputProps?: any[];
  template?: any;
  aiTitle?: string;
  displayName?: string;
  inputTypes?: Record<string, any>;
};
export type DrawSettingsType = {
  displayName?: string;
  cssClass?: string;
  iconCSSClass?: string;
  icon?: string;
  showSettings?: boolean;
  addOutputButton?: string;
  addInputButton?: string;
  addOutputButtonLabel?: string;
  addInputButtonLabel?: string;
  inputMaxConnections?: number;
  outputMaxConnections?: number;
  firendlyName?: string;
  category?: string;
  componentDescription?: string;
  shortDescription: string;
  color: string;
};

export type ExtensionCompNames = 'GPTPlugin' | 'AgentPlugin' | 'HuggingFace';
