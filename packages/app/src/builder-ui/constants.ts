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
    // Claude Opus 4.6 supports 'low', 'medium', 'high', 'max' effort
    // 'max' is only available on Opus 4.6
    // Default is 'high' (same as Anthropic API default)
    pattern: /^(claude-opus-4-6|smythos\/claude-opus-4-6)/i,
    defaultValue: 'high',
    options: [
      { text: 'Low', value: 'low' },
      { text: 'Medium', value: 'medium' },
      { text: 'High', value: 'high' },
      { text: 'Max', value: 'max' },
    ],
  },
  {
    // Claude Opus 4.5 supports 'low', 'medium', 'high' effort
    // Default is 'high' (same as Anthropic API default)
    pattern: /^(claude-opus-4-5|smythos\/claude-opus-4-5)/i,
    defaultValue: 'high',
    options: [
      { text: 'Low', value: 'low' },
      { text: 'Medium', value: 'medium' },
      { text: 'High', value: 'high' },
    ],
  },
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
    defaultValue: 'high',
    options: [{ text: 'High', value: 'high' }],
  },
  {
    // GPT-5.1 models support 'none', 'low', 'medium', 'high' (not 'minimal')
    // 'low' is set as the default (first option)
    pattern: /^(gpt-5\.1|smythos\/gpt-5\.1)/i,
    defaultValue: 'none',
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
    defaultValue: 'none',
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
    defaultValue: 'minimal',
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
