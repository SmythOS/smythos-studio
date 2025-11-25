import { ConnectorService, JSONModelsProvider, TConnectorService } from '@smythos/sre';

import { SmythNKV } from './SmythOSNKV.class';
import { SmythOSSAccount } from './SmythOSSAccount.class';
import { SmythOSSAgentDataConnector } from './SmythOSSAgentDataConnector.class';

const CONNECTORS = [
  [TConnectorService.AgentData, 'SmythOSSAgentData', SmythOSSAgentDataConnector],
  [TConnectorService.Account, 'SmythOSSAccount', SmythOSSAccount],
  [TConnectorService.ModelsProvider, 'SmythModelsProvider', JSONModelsProvider],
  [TConnectorService.NKV, 'SmythNKV', SmythNKV],
] as const;

/**
 * Register all connectors
 */
export function registerConnectors(): void {
  CONNECTORS.forEach(([serviceType, name, connectorClass]) => {
    ConnectorService.register(serviceType, name, connectorClass);
  });
}
