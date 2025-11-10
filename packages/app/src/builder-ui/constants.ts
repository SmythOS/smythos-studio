// TODO: We will move some constants from ./config.ts to this file.

export const BINARY_INPUT_TYPES = ['Image', 'Audio', 'Video', 'Binary'];

export const DEFAULT_RIGHT_SIDEBAR_WIDTH = '520px';

export const JSON_FIELD_CLASS = '_smythos_json_field';

export enum LLM_PROVIDERS {
  OPENAI = 'OpenAI',
  XAI = 'xAI',
  RUNWARE = 'Runware',
  GOOGLEAI = 'GoogleAI',
}

export const COMPONENT_STATE_KEY = 'component:state';

export const REASONING_EFFORTS = [
  {
    // GPT-5-pro only supports 'high' reasoning effort
    pattern: /^(gpt-5-pro|smythos\/gpt-5-pro)/i,
    options: [{ text: 'High', value: 'high' }],
  },
  {
    pattern: /^(gpt|smythos\/gpt)/i,
    options: [
      { text: 'Minimal', value: 'minimal' },
      { text: 'Low', value: 'low' },
      { text: 'Medium', value: 'medium' },
      { text: 'High', value: 'high' },
    ],
  },
  {
    pattern: /^openai/i,
    options: [
      { text: 'Low', value: 'low' },
      { text: 'Medium', value: 'medium' },
      { text: 'High', value: 'high' },
    ],
  },
  {
    pattern: /^qwen/i,
    options: [{ text: 'Default', value: 'default' }],
  },
];
