import config from '../../config';
import { getIntegrations } from '../router.utils';

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

const menu: Menu = {
  Base: [
    { name: 'APIEndpoint', label: 'Agent Skill (APIEndpoint)', description: '' },
    { name: 'GenAILLM', description: 'GenAI LLM', label: 'GenAI LLM', icon: '' },
    { name: 'ImageGenerator', description: 'Image Generator', label: 'Image Generator' },
    { name: 'Classifier', description: 'Classifier' },
    { name: 'Note', label: 'Note', description: '' },
    { name: 'APIOutput', label: 'API Output', description: '' },
    /* { name: 'POST_APIEndpoint', label: 'API Endpoint [POST only]', description: '' }, */
    //{ name: 'Redirect', label: 'Redirect', description: '' },
    //{ name: 'SchedulerEndpoint', label: 'Scheduler Endpoint', description: '' },

    /*
        { name: 'GmailSender', description: 'Gmail sender', label: 'Gmail Sender' },
        { name: 'Memory', description: 'Memory' },
        /*
        { name: 'DBInsert', label: 'DB Insert' },
        { name: 'FormParser', label: 'Form Parser' },
        */
  ],

  Advanced: [
    { name: 'FSleep', label: 'Sleep', description: '' },
    { name: 'LLMAssistant', description: 'LLM Assistant', label: 'LLM Assistant', icon: '' },
    { name: 'APICall', label: 'Call API' },
    { name: 'Code', description: 'Code', label: 'Code', icon: '' },
    { name: 'FileStore', label: 'File Store', description: '', icon: 'Memory' },
    { name: 'JSONFilter', label: 'JSON Filter', description: '' },
    { name: 'ForEach', label: 'For Each', description: '' },

    { name: 'Async', label: 'Async', description: '' },
    { name: 'Await', label: 'Await', description: '' },
  ],

  // ! TEMPORARY DISABLED FOR PRODUCTION RELEASE
  // Image: [
  //   { name: 'TextToImage', description: 'Text To Image', label: 'Text To Image' },
  //   { name: 'ImageToImage', description: 'Image To Image', label: 'Image To Image' },
  //   { name: 'ImageToText', description: 'Image To Text', label: 'Image To Text' },
  //   // { name: 'BackgroundRemoval', description: 'Background Removal', label: 'Background Removal' },
  //   { name: 'ImageUpscaling', description: 'Image Upscaling', label: 'Image Upscaling' },
  //   {
  //     name: 'RestyleControlNet',
  //     description: 'Restyle (ControlNet)',
  //     label: 'Restyle (ControlNet)',
  //   },
  //   // {
  //   //   name: 'RestyleIPAdapter',
  //   //   description: 'Restyle (IP-Adapter)',
  //   //   label: 'Restyle (IP-Adapter)',
  //   // },
  //   { name: 'Inpainting', description: 'Inpainting', label: 'Inpainting' },
  //   { name: 'Outpainting', description: 'Outpainting', label: 'Outpainting' },
  // ],
  Tools: [
    { name: 'ServerlessCode', label: 'NodeJS', description: '', icon: 'Code' },

    { name: 'WebSearch', label: 'Web Search', description: '' },
    { name: 'WebScrape', label: 'Web Scrape', description: '' },

    {
      name: 'ComputerUse',
      label: 'Computer Use (Beta)',
      description: '',
    },

    { name: 'MCPClient', label: 'MCP Client', description: '', icon: 'MCP' },
  ],
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
  'RAG Data': [
    {
      label: 'Manage My Vector DB',
      externalLink: '/data',
    },
    { name: 'DataSourceLookup', label: 'RAG Search', description: '' },
    { name: 'DataSourceIndexer', label: 'RAG Remember', description: '' },
    { name: 'DataSourceCleaner', label: 'RAG Forget', description: '' },
  ],

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
  /*
    Skills: [
        { name: 'DataSourceLookup', label: 'Data Lookup', description: '' },

        { name: 'Base64Encoder', label: 'Base64 Encoder', description: '' },

        { name: 'FileExporter', label: 'PDF Export', attributes: { 'smt-format': 'pdf' } },
        { name: 'FileExporter', label: 'Docx Export', attributes: { 'smt-format': 'docx' } },
        { name: 'FileExporter', label: 'Html Export', attributes: { 'smt-format': 'html' } },
        { name: 'FileExporter', label: 'Markdown Export', attributes: { 'smt-format': 'md' } },
        { name: 'GoogleSheet', label: 'Google Sheet', description: '' },

    ],
    */
  /*'Email & Notifications': [*/
  /*{ name: 'GmailReader', description: 'Gmail reader', label: 'Gmail Reader' },*/
  /*{ name: 'GmailSender', description: 'Gmail sender', label: 'Gmail Sender' },*/
  /* { name: 'SMSSender', label: 'SMS Sender', description: '' },*/
  /*],*/
  /*
    TTS: [
        { name: 'ElevenTTS', label: '', description: '' },
        { name: 'GoogleTTS', label: '', description: '' },
        { name: 'AzureTTS', label: '', description: '' },
        { name: 'AWSTTS', label: '', description: '' },
    ],
    */
  // Social: [
  //     { name: 'Twitter', label: '', description: '' },
  //     { name: 'LinkedIn', label: '', description: '' },
  // ],

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
  /*: [
        {
            name: 'Gmail',
            label: 'Gmail',
            description: '',
            icon: 'fa-regular fa-envelope',
            color: '#ee0000',
            children: [
                { name: 'GmailReader', description: 'Gmail reader', label: 'Gmail Reader' },
                { name: 'GmailSender', description: 'Gmail sender', label: 'Gmail Sender' },
            ],
        },
    ]*/
};
if (config.env.NODE_ENV === 'PROD') {
  // Hide Serverless Code in PROD
  const fileStoreIndex = (menu.Advanced as any[]).findIndex((p) => p.name === 'FileStore');
  if (fileStoreIndex > -1) {
    (menu.Advanced as any[]).splice(fileStoreIndex, 1);
  }

  // const webSearchIndex = (menu.Tools as any[]).findIndex((p) => p.name === 'WebSearch');
  // if (webSearchIndex > -1) {
  //   (menu.Tools as any[]).splice(webSearchIndex, 1);
  // }

  // //remove async component
  // const asyncIndex = (menu.Advanced as any[]).findIndex((p) => p.name === 'Async');
  // if (asyncIndex > -1) {
  //     (menu.Advanced as any[]).splice(asyncIndex, 1);
  // }

  // //remove await component
  // const awaitIndex = (menu.Advanced as any[]).findIndex((p) => p.name === 'Await');
  // if (awaitIndex > -1) {
  //     (menu.Advanced as any[]).splice(awaitIndex, 1);
  // }

  //remove multi modal llm
  // const multimodalIndex = (menu.Base as any[]).findIndex((p) => p.name === 'MultimodalLLM');
  // if (multimodalIndex > -1) {
  //     (menu.Base as any[]).splice(multimodalIndex, 1);
  // }

  //remove memory section
  delete menu.Memory;
}

/**
 * Refreshes the menu with integration data and schedules periodic updates.
 * @returns {Promise<void>}
 */
export async function refreshMenu(): Promise<void> {
  try {
    const data = await getIntegrations();
    menu.Integrations = data.sort((a, b) => a.name.localeCompare(b.name));

    // Check if menu.Integrations is null, undefined, or empty
    if (!menu.Integrations || menu.Integrations.length === 0) {
      console.warn('No integrations found during menu refresh');
    }
  } catch (error) {
    console.error('Error refreshing menu:', error);
  }

  // Schedule the next refresh after 5 minutes
  setTimeout(
    () => {
      refreshMenu();
    },
    5 * 60 * 1000,
  ); // 5 minutes in milliseconds
}

refreshMenu();
export default menu;
