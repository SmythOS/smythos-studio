// TODO: We will move some constants from ./config.ts to this file.

export const BINARY_INPUT_TYPES = ['Image', 'Audio', 'Video', 'Binary'];

export const JSON_FIELD_CLASS = '_smythos_json_field';

export enum LLM_PROVIDERS {
  OPENAI = 'OpenAI',
  RUNWARE = 'Runware',
  GOOGLEAI = 'GoogleAI',
}

export const COMPONENT_STATE_KEY = 'component:state';

export const REASONING_EFFORTS = [
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
