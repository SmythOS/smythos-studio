import {
  ConnectorService,
  JSONModelsProvider,
  TConnectorService,
} from "@smythos/sre";
import { SmythOSSAccount } from "./SmythOSSAccount.class";
import { SmythOSSAgentDataConnector } from "./SmythOSSAgentDataConnector.class";
import { SmythOSSVault } from "./SmythOSSVault.class";

const CONNECTORS = [
  [
    TConnectorService.AgentData,
    "SmythOSSAgentData",
    SmythOSSAgentDataConnector,
  ],
  [TConnectorService.Account, "SmythOSSAccount", SmythOSSAccount],
  [TConnectorService.Vault, "SmythOSSVault", SmythOSSVault],
  [TConnectorService.ModelsProvider, "SmythModelsProvider", JSONModelsProvider],
] as const;

/**
 * Register all connectors
 */
export function registerConnectors(): void {
  CONNECTORS.forEach(([serviceType, name, connectorClass]) => {
    ConnectorService.register(serviceType, name, connectorClass);
  });
}
