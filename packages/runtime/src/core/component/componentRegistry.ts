import { AccessCandidate, ComponentConnector, ConnectorService } from '@smythos/sre';

import { Code } from './Code.class';

const COMPONENTS = [['Code', Code]] as const;

/**
 * Register all components
 */
export function registerComponents(): void {
  const componentConnector = ConnectorService.getComponentConnector() as ComponentConnector;
  const requester = componentConnector.requester(AccessCandidate.user('system'));

  COMPONENTS.forEach(([name, componentClass]) => {
    requester.register(name, new componentClass());
  });
}
