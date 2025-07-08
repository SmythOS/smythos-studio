import {
  FaBezierCurve,
  FaBuildingColumns,
  FaGear,
  FaGears,
  FaHandshakeAngle,
  FaHelmetSafety,
  FaMessage,
  FaPenNib,
  FaRegPenToSquare,
  FaRocket,
  FaSuitcase,
  FaUser,
  FaUserGraduate,
} from 'react-icons/fa6';

export interface ISingleTeam {
  name: string;
  value: string;
  category?: string;
  icon: React.ElementType;
}

export const UserOnboardingTeams: ISingleTeam[] = [
  // category is a legacy property, sent to Hubspot to keep the old data structure
  { name: 'Engineering', icon: FaGear, value: 'engineering', category: 'Developer/IT' },
  { name: 'Marketing', icon: FaRocket, value: 'marketing', category: 'Marketing/Sales' },
  { name: 'HR & Legal', icon: FaSuitcase, value: 'hr_legal', category: 'HR' },
  { name: 'Operations', icon: FaBezierCurve, value: 'operations', category: 'HR' },
  { name: 'Finance', icon: FaBuildingColumns, value: 'finance', category: 'Finance' },
  {
    name: 'Product & Design',
    icon: FaRegPenToSquare,
    value: 'product_design',
    category: 'Developer/IT',
  },
  { name: 'Creative Production', icon: FaPenNib, value: 'creative_production', category: 'Other' },
  {
    name: 'Customer Service',
    icon: FaMessage,
    value: 'customer_service',
    category: 'Student/Other',
  },
  { name: 'IT & Support', icon: FaGears, value: 'it_support', category: 'Developer/IT' },
  {
    name: 'Manufacturing',
    icon: FaHelmetSafety,
    value: 'manufacturing',
    category: 'Student/Other',
  },
  {
    name: 'Sales & Account Management',
    icon: FaHandshakeAngle,
    value: 'sales_account_management',
    category: 'Marketing/Sales',
  },
  { name: 'Other / Personal', icon: FaUser, value: 'other_personal', category: 'Student/Other' },
  { name: 'Student', icon: FaUserGraduate, value: 'student', category: 'Student/Other' },
];

const agentsByJobType = {
  Marketing: [
    'customer-review-analysis-lxxqii7231',
    'email-sender-lu2lt72m98k',
    'mobile-message-sender-lu2mg4z5i4f',
    'product-recommendation-agent-lxx90ja8zki',
    'blog-manager-Shopify',
    'content_keyphrase_analyzer_agent',
    'backlink-analysis-agent-lxnw3jp8qz',
    'content-strategy-generator-luszv3obqx',
    'smt_basic_content_writer',
    'youtube-to-seo-content-maker-lxk52qawtmm',
    'product-description-writer-with-vision',
    'seo-keyword-researcher-lxngosjnsxb',
    'document-summarizer-lxx4fegp1b',
  ],
  'Sales & Account Management': [
    'lead-contacts-scraper',
    'linkedin-leads-builder-lwexzixchw',
    'zendesk-leads-manager-ltinilztfg9',
    'transcript-analyzer-lx581qpwcq',
    'hubspot-contacts-creator-ltf6vxjevaq',
  ],
  'Product & Design': [
    'customer-review-analysis-lxxqii7231',
    'email-sender-lu2lt72m98k',
    'mobile-message-sender-lu2mg4z5i4f',
    'product-recommendation-agent-lxx90ja8zki',
    'transparent-bg-image-generator-ltqbf8r3j47',
  ],
  'Creative Production': [
    'transparent-bg-image-generator-ltqbf8r3j47',
    'midjourney-agent-lv443mu22rd',
    'tutorial__meme_maker',
    'text-translator-with-audio-converter-ltrsknn0vxi',
    'smt_template__multimodal_thinking',
  ],
  Operations: [
    'inflow_inventory_agent',
    'basic-folder-creator-dropbox',
    'content-extractor-url-to-text',
    'document-summarizer-lxx4fegp1b',
    'azure-ai-vision-ocr-ltgkv9ncjh',
  ],
  Engineering: [
    'github-content-manager-ltghaklwrs',
    'email-sender-lu2lt72m98k',
    'content-extractor-url-to-text',
    'document-summarizer-lxx4fegp1b',
    'asana-tasks-manager-lx8ypir4kou',
  ],
  Finance: [
    'inflow_inventory_agent',
    'basic-folder-creator-dropbox',
    'zendesk-leads-manager-ltinilztfg9',
    'transcript-analyzer-lx581qpwcq',
    'hubspot-contacts-creator-ltf6vxjevaq',
  ],
  'HR & Legal': [
    'pdf-to-text-converter-ltq92c1ba38',
    'document-summarizer-lxx4fegp1b',
    'content-extractor-url-to-text',
    'email-sender-lu2lt72m98k',
    'basic-folder-creator-dropbox',
  ],
  'Customer Service': [
    'product-recommendation-agent-lxx90ja8zki',
    'bidirectional-messaging-agent-lvy9xokeesu',
    'tutorial__brand_agent',
    'customer-review-analysis-lxxqii7231',
    'mobile-message-sender-lu2mg4z5i4f',
  ],
  'IT & Support': [
    'bidirectional-messaging-agent-lvy9xokeesu',
    'email-sender-lu2lt72m98k',
    'customer-review-analysis-lxxqii7231',
    'github-content-manager-ltghaklwrs',
    'mobile-message-sender-lu2mg4z5i4f',
  ],
  Manufacturing: [
    'inflow_inventory_agent',
    'basic-folder-creator-dropbox',
    'content-extractor-url-to-text',
    'document-summarizer-lxx4fegp1b',
    'azure-ai-vision-ocr-ltgkv9ncjh',
  ],
  Student: [
    'smt_template__multimodal_thinking',
    'midjourney-agent-lv443mu22rd',
    'tutorial__meme_maker',
    'content-extractor-url-to-text',
    'document-summarizer-lxx4fegp1b',
  ],
  'Other / Personal': [
    'smt_template__multimodal_thinking',
    'midjourney-agent-lv443mu22rd',
    'tutorial__meme_maker',
    'content-extractor-url-to-text',
    'document-summarizer-lxx4fegp1b',
  ],
};

export const getTemplatesForJobRole = (jobRole, templates) => {
  // Get the array of agent titles for the given job role
  const agentTitlesForJobType = agentsByJobType[jobRole] || [];

  // Initialize arrays to hold relevant and other templates
  const relevantTemplates = [];
  const otherTemplates = [];

  // Iterate over the templates and categorize them into relevant and other templates
  templates.forEach((template) => {
    if (agentTitlesForJobType.includes(template.id)) {
      relevantTemplates.push(template);
    } else {
      otherTemplates.push(template);
    }
  });

  // Return an object with relevant and other templates
  return {
    relevantTemplates,
    otherTemplates,
  };
};
