// TODO: We will move some constants from ./config.ts to this file.

export const BINARY_INPUT_TYPES = ['Image', 'Audio', 'Video', 'Binary'];

export const OUT_OF_BOX_TEMPLATES = [
  'linkedin-post-generator-m7ltws9o6z',
  'seo-blog-post-writer-m7mi0bksagu',
  'lead-enrichment-agent-m7md03n6g4a',
  'email-outreach-writer-m7ng6dj21g',
  'competitor-researcher-and-analyzer-m7t0ab0h49g',
  'essay-reviewer-m7t1xpx5utc',
  'founder-research-agent-m82y1ovmv5c',
];

export const JSON_FIELD_CLASS = '_smythos_json_field';

export enum LLM_PROVIDERS {
  OPENAI = 'OpenAI',
  RUNWARE = 'Runware',
  GOOGLEAI = 'GoogleAI',
}

export const COMPONENT_STATE_KEY = 'component:state';
