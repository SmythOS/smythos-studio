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
    // Claude Opus/Sonnet/Haiku version >= 4.6 supports 'low', 'medium', 'high', 'max' effort
    // Dynamically matches all current and future versions (4-6, 4-7, 5, 5-1, 6, 6-1, 10-3, etc.)
    // Default is 'high' (same as Anthropic API default)
    pattern:
      /^(smythos\/)?claude-(opus|sonnet|haiku)-(4-([6-9]|[1-9]\d+)|([5-9]|[1-9]\d+)(-\d+)?)/i,
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
    pattern: /^(smythos\/)?claude-opus-4-5/i,
    defaultValue: 'high',
    options: [
      { text: 'Low', value: 'low' },
      { text: 'Medium', value: 'medium' },
      { text: 'High', value: 'high' },
    ],
  },
  {
    // Gemini 3+ models support 'low' and 'high' reasoning effort
    // Matches gemini-3, gemini-3.1-flash, gemini-4-pro, gemini-5-flash, etc.
    pattern: /^(smythos\/)?gemini-([3-9]|[1-9]\d+)([.\-].*)?$/i,
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
    // GPT 5.2+ pro and all future major version pro models support 'medium', 'high', 'xhigh' only (no none/low)
    // Must come before the non-pro catch-alls to avoid being matched by broader patterns
    pattern: /^(smythos\/)?gpt-(5\.([2-9]|\d{2,})|([6-9]|[1-9]\d+)(\.\d+)?)-pro/i,
    defaultValue: 'medium',
    options: [
      { text: 'Medium', value: 'medium' },
      { text: 'High', value: 'high' },
      { text: 'XHigh', value: 'xhigh' },
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
    // GPT-5.4 supports 'none', 'low', 'medium', 'high', 'xhigh'
    // Must come before the 5.3+ catch-all to avoid being matched by the broader pattern
    pattern: /^(smythos\/)?gpt-5\.4/i,
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
    // GPT 5.3+ and all future major versions (6, 6.x, 7, 7.x, ...) support 'none', 'low', 'medium', 'high', 'xhigh'
    // Dynamically matches all current and future versions beyond 5.4 (5.4 has its own pattern above)
    // Minor version is optional to cover models like gpt-6, gpt-6-turbo, smythos/gpt-5.5, etc.
    // Default is 'none' (per OpenAI API default)
    pattern: /^(smythos\/)?gpt-(5\.([3-9]|\d{2,})|([6-9]|[1-9]\d+)(\.\d+)?)/i,
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
