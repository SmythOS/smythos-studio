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
    // Gemini 3 models support 'low' and 'high' reasoning effort
    // 'medium' is coming soon but not available at launch
    pattern: /^(gemini-3|smythos\/gemini-3)/i,
    options: [
      { text: 'Low', value: 'low' },
      // { text: 'Medium', value: 'medium' }, // Coming soon, will be enabled when released
      { text: 'High', value: 'high' },
    ],
  },
  {
    // GPT-5-pro only supports 'high' reasoning effort
    pattern: /^(gpt-5-pro|smythos\/gpt-5-pro)/i,
    options: [{ text: 'High', value: 'high' }],
  },
  {
    // GPT-5.1 models support 'none', 'low', 'medium', 'high' (not 'minimal')
    // 'low' is set as the default (first option)
    pattern: /^(gpt-5\.1|smythos\/gpt-5\.1)/i,
    options: [
      { text: 'None', value: 'none' },
      { text: 'Low', value: 'low' },
      { text: 'Medium', value: 'medium' },
      { text: 'High', value: 'high' },
    ],
  },
  {
    // GPT-5.2 models support 'none', 'low', 'medium', 'high', 'xhigh'
    // 'low' is set as the default (first option)
    pattern: /^(gpt-5\.2|smythos\/gpt-5\.2)/i,
    options: [
      { text: 'None', value: 'none' },
      { text: 'Low', value: 'low' },
      { text: 'Medium', value: 'medium' },
      { text: 'High', value: 'high' },
      { text: 'XHigh', value: 'xhigh' },
    ],
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
