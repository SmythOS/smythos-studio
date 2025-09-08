import { plugins, PluginTarget, PluginType } from '@src/react/shared/plugins/Plugins';
import config from '../../config';

type MenuItem = {
  name?: string;
  label?: string;
  description?: string;
  icon?: string;
  color?: string;
  children?: MenuItem[];

  attributes?: Record<string, string>; // Key-value pairs for attributes
  externalLink?: string; // Add this new property
};

type DynamicMenuItem = {
  label?: string;
  type?: 'dynamic';
  actionLabel?: string;
};

type Menu = {
  [groupName: string]: MenuItem[] | DynamicMenuItem;
};

const baseMenu: Menu = {
  Base: [
    { name: 'APIEndpoint', label: 'Agent Skill (APIEndpoint)', description: '' },
    { name: 'GenAILLM', description: 'GenAI LLM', label: 'GenAI LLM', icon: '' },
    { name: 'ImageGenerator', description: 'Image Generator', label: 'Image Generator' },
    { name: 'Classifier', description: 'Classifier' },
    { name: 'Note', label: 'Note', description: '' },
    { name: 'APIOutput', label: 'API Output', description: '' },
  ],

  Advanced: [
    { name: 'FSleep', label: 'Sleep', description: '' },
    { name: 'LLMAssistant', description: 'LLM Assistant', label: 'LLM Assistant', icon: '' },
    { name: 'APICall', label: 'APICall' },
    { name: 'FileStore', label: 'File Store', description: '', icon: 'Memory' },
    { name: 'JSONFilter', label: 'JSON Filter', description: '' },
    { name: 'ForEach', label: 'For Each', description: '' },

    { name: 'Async', label: 'Async', description: '' },
    { name: 'Await', label: 'Await', description: '' },
  ],

  Tools: [{ name: 'MCPClient', label: 'MCP Client', description: '', icon: 'MCP' }],
  Memory: [
    { name: 'MemoryWriteInput', label: 'Memory Slot Write', icon: 'Memory' },
    { name: 'MemoryWriteKeyVal', label: 'Memory Key Write', icon: 'Memory' },
    { name: 'MemoryReadOutput', label: 'Memory Slot Read', icon: 'Memory' },
    { name: 'MemoryReadKeyVal', label: 'Memory Key Read', icon: 'Memory' },
    { name: 'MemoryDeleteKey', label: 'Memory Delete Key', icon: 'Memory' },
  ],
  Crypto: [
    { name: 'FHash', label: 'F:Hash', description: '' },
    { name: 'FEncDec', label: 'F:Encode/Decode', description: '' },
    { name: 'FSign', label: 'F:Sign', description: '' },
    { name: 'FTimestamp', label: 'F:Timestamp', description: '' },
  ],
  'RAG Data': [],

  Logic: [
    { name: 'LogicAND', description: 'AND', label: 'And', icon: 'LogicAND' },
    { name: 'LogicOR', description: 'OR', label: 'OR', icon: 'LogicOR' },
    { name: 'LogicXOR', description: 'Exclusive OR', label: 'Exclusive OR', icon: 'LogicXOR' },
    {
      name: 'LogicAtLeast',
      description: 'Minimum set inputs to trigger output ',
      label: 'At least',
      icon: 'LogicAtLeast',
    },
    {
      name: 'LogicAtMost',
      description: 'Maximum set inputs to trigger output',
      label: 'At most',
      icon: 'LogicAtMost',
    },
  ],

  /* Menu item empty means component will be added dynamically */
  GPTPlugin: { label: 'OpenAPI', type: 'dynamic', actionLabel: 'Import' },
  AgentPlugin: { label: 'SmythOS Agents', type: 'dynamic', actionLabel: 'Import' },
  HuggingFace: { label: 'Hugging Face', type: 'dynamic', actionLabel: 'Import' },
  ZapierAction: {
    label: 'Zapier AI Actions (AI alpha)',
    type: 'dynamic',
    actionLabel: 'Manage Actions',
  },
  Legacy: [
    { name: 'PromptGenerator', description: 'LLM Prompt', label: 'LLM Prompt', icon: '' },
    { name: 'MultimodalLLM', description: 'Multimodal LLM', label: 'Multimodal LLM', icon: '' },
    { name: 'VisionLLM', description: 'Vision LLM', label: 'Vision LLM' },
  ],

  Integrations: [],
};

if (config.env.NODE_ENV === 'PROD') {
  //remove memory section
  delete baseMenu.Memory;
}

export const getBuilderSidebarMenu = () => {
  const menuClone = JSON.parse(JSON.stringify(baseMenu));

  const pluginMenuItems = (
    plugins.getPluginsByTarget(PluginTarget.BuilderSidebarComponentItems, PluginType.Config) as {
      config: {
        name: string;
        label: string;
        description: string;
        icon: string;
        section: string;
        externalLink?: string;
      };
    }[]
  )
    .flatMap((item) => item.config)
    .filter(Boolean);

  // loop over each item in pluginMenuItems and add it to the menu section it belongs to
  for (const item of pluginMenuItems) {
    const section = item.section || 'Plugins';
    if (!menuClone[section]) {
      menuClone[section] = [];
    }

    if (item.externalLink) {
      (menuClone[section] as MenuItem[]).push({
        externalLink: item.externalLink,
        label: item.label,
      });
    } else {
      (menuClone[section] as MenuItem[]).push({
        name: item.name,
        label: item.label,
        description: item.description,
      });
    }
  }

  return menuClone;
};

export default baseMenu;
