import { SMYTHOS_DOCS_URL } from './general';

export const weaverActionButtons = [
  {
    text: '<span style="font-weight: 600">Test:</span> Run to see how your agent works',
    url: `${SMYTHOS_DOCS_URL}/agent-studio/build-agents/debugging`,
    icon: '<i class="fas fa-vial me-2"></i>',
    event: 'test_agent',
    arcadeUrl: 'https://app.arcade.software/PrdsapFqKhiJSljwjKtR',
  },
  {
    text: '<span style="font-weight: 600">Enhance:</span> Add new skills or customize functions',
    url: `${SMYTHOS_DOCS_URL}/agent-studio/components`,
    icon: '<i class="fas fa-graduation-cap me-2"></i>',
    event: 'enhance_agent',
  },
  {
    text: '<span style="font-weight: 600">Learn More:</span> Explore components and features',
    url: `${SMYTHOS_DOCS_URL}/agent-studio/quickstart`,
    icon: '<i class="fas fa-compass me-2"></i>',
    event: 'learn_more',
  },
];

export const weaverLimitButtons = [
  {
    text: 'Subscribe to unlock all SmythOS features',
    url: '/plans',
    icon: '<i class="fas fa-lock me-2"></i>',
    event: 'upgrade',
  },
  {
    text: '<span style="font-weight: 600">Test and Debug:</span> Run to see how it works',
    url: `${SMYTHOS_DOCS_URL}/agent-studio/build-agents/debugging`,
    icon: '<i class="fas fa-vial me-2"></i>',
    event: 'test_debug',
    arcadeUrl: 'https://app.arcade.software/PrdsapFqKhiJSljwjKtR',
  },
  {
    text: '<span style="font-weight: 600">Deploy:</span> Start using agents in your workflow',
    url: `${SMYTHOS_DOCS_URL}/agent-deployments/overview/`,
    icon: '<i class="fas fa-rocket me-2"></i>',
    event: 'deploy',
    arcadeUrl: 'https://app.arcade.software/ACmdplG8UBjjaelaLx7c',
  },
];
