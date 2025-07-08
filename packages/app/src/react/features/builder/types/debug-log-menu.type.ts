import { NetworkRequest } from '@src/react/features/builder/contexts/debug-log-menu.context';

/**
 * Available tabs in the request detail panel
 */
export type DetailTab = 'headers' | 'response' | 'timing';

/**
 * Props for detail tab components
 */
export interface DetailTabProps {
  request: NetworkRequest;
}
