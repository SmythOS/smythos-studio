import { EventSourceMessage, fetchEventSource } from '@microsoft/fetch-event-source';
import { Workspace } from '@src/builder-ui/workspace/Workspace.class';
import {
  createContext,
  Dispatch,
  FC,
  ReactNode,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

/**
 * Enum for available debug menu tabs
 */
export enum DebugMenuTab {
  LOGS = 'logs',
  SOURCE = 'source',
  NETWORK = 'network',
}

/**
 * Types for monitor events
 */

interface AgentEvent {
  id: string;
  name: string;
  startTime: string;
  endTime?: string;
  duration?: number;
}

interface MonitorState {
  monitorId: string | null;
  controller: AbortController | null;
}

// Add these types for network requests
export interface NetworkRequest {
  eventId: string;
  componentId: string;
  componentName: string;
  componentTitle: string;
  method: string;
  url: string;
  status: number;
  startTime: number;
  endTime?: number;
  duration?: number;
  requestHeaders?: Record<string, string>;
  requestBody?: any;
  responseHeaders?: Record<string, string>;
  responseBody?: any;
  cost?: Array<{
    sourceId: string;
    units: number;
  }>;
  state: 'pending' | 'complete' | 'error';
}

/**
 * Type definitions for the Debug Log Menu context
 */
interface DebugLogMenuContextType {
  workspace?: Workspace;
  /**
   * Currently active tab in the debug menu
   */
  activeTab: DebugMenuTab | null;
  /**
   * Function to change the active tab
   */
  setActiveTab: (tab: DebugMenuTab | null) => void;
  isExpanded: boolean;
  toggleExpanded: () => void;
  monitorState: MonitorState;
  logs: Array<{
    type: 'agent' | 'component';
    timestamp: string;
    message: string;
    data: any;
  }>;
  setLogs: Dispatch<SetStateAction<DebugLogMenuContextType['logs']>>;
  unreadLogsCount: number;
  markLogsAsRead: () => void;
  networkRequests: Record<string, NetworkRequest>;
  networkRequestsArray: NetworkRequest[];
  clearNetworkRequests: () => void;
  isNetworkRecording: boolean;
  toggleNetworkRecording: () => void;
  /**
   * UI state for network tab
   */
  networkUIState: {
    showWaterfall: boolean;
    filters: {
      componentNames: string[];
      selectedComponentNames: string[];
    };
  };
  /**
   * Update network UI state
   */
  updateNetworkUIState: (updates: Partial<DebugLogMenuContextType['networkUIState']>) => void;
}

export const getTabHeight = (activeTab: DebugMenuTab) => {
  if (activeTab === DebugMenuTab.LOGS) {
    return '400px';
  } else if (activeTab === DebugMenuTab.SOURCE) {
    return '400px';
  } else if (activeTab === DebugMenuTab.NETWORK) {
    return '450px';
  }
};

/**
 * Initial state for the Debug Log Menu context
 */
const initialState: DebugLogMenuContextType = {
  workspace: undefined,
  activeTab: null,
  setActiveTab: () => undefined,
  isExpanded: false,
  toggleExpanded: () => undefined,
  monitorState: { monitorId: null, controller: null },
  logs: [],
  setLogs: () => {},
  unreadLogsCount: 0,
  markLogsAsRead: () => {},
  networkRequests: {},
  networkRequestsArray: [],
  clearNetworkRequests: () => {},
  isNetworkRecording: true,
  toggleNetworkRecording: () => {},
  networkUIState: {
    showWaterfall: true,
    filters: {
      componentNames: [],
      selectedComponentNames: [],
    },
  },
  updateNetworkUIState: () => {},
};

/**
 * Context for managing Debug Log Menu state and operations
 */
const DebugLogMenuContext = createContext<DebugLogMenuContextType | null>(null);

interface DebugLogMenuProviderProps {
  children: ReactNode;
  workspace: Workspace;
}

/**
 * Creates and sets up a monitor connection using fetch-event-source
 */
async function setupMonitor(
  url: string,
  headers: Record<string, string>,
  onInit: (monitorId: string) => void,
  onEvent: (event: EventSourceMessage) => void,
  onClose: () => void,
): Promise<AbortController> {
  const controller = new AbortController();

  fetchEventSource(url, {
    signal: controller.signal,
    headers,
    async onopen(response) {
      if (!response.ok) {
        throw new Error(`Failed to open monitor connection: ${response.status}`);
      }
      console.log('Monitor connection opened');
    },
    onmessage(event) {
      if (event.event === 'init') {
        const monitorId = event.data;
        console.log('Monitor initialized:', monitorId);
        // Expose monitorId globally for vanilla JS agent runner
        (window as any).currentMonitorId = monitorId;
        onInit(monitorId);
      } else {
        onEvent(event);
      }
    },
    onclose() {
      console.log('Monitor connection closed');
      onClose();
    },
    onerror(err) {
      console.error('Monitor connection error:', err);
    },
    openWhenHidden: true,
  });

  return controller;
}

/**
 * Provider component for Debug Log Menu context
 */
export const DebugLogMenuProvider: FC<DebugLogMenuProviderProps> = ({ children, workspace }) => {
  const [activeTab, setActiveTab] = useState<DebugMenuTab | null>(DebugMenuTab.LOGS);
  const [isExpanded, setIsExpanded] = useState(false);
  const [monitorState, setMonitorState] = useState<MonitorState>({
    monitorId: null,
    controller: null,
  });
  const [logs, setLogs] = useState<DebugLogMenuContextType['logs']>([]);
  const [unreadLogsCount, setUnreadLogsCount] = useState(0);
  const [networkRequests, setNetworkRequests] = useState<Record<string, NetworkRequest>>({});
  const [isNetworkRecording, setIsNetworkRecording] = useState(true);

  // Network UI state
  const [networkUIState, setNetworkUIState] = useState<DebugLogMenuContextType['networkUIState']>({
    showWaterfall: true,
    filters: {
      componentNames: [],
      selectedComponentNames: [],
    },
  });

  // Create a ref to track the current recording state
  const isNetworkRecordingRef = useRef(true);

  // Derived state for UI rendering
  const networkRequestsArray = useMemo(
    () => Object.values(networkRequests).sort((a, b) => a.startTime - b.startTime),
    [networkRequests],
  );

  // Extract unique component names from network requests
  useEffect(() => {
    const uniqueComponentNames = Array.from(
      new Set(networkRequestsArray.map((req) => req.componentName)),
    ).sort();

    setNetworkUIState((prev) => {
      // If we have new component names, update the filters
      if (JSON.stringify(uniqueComponentNames) !== JSON.stringify(prev.filters.componentNames)) {
        // Add any new component names to the selected list
        const newSelectedNames = [...prev.filters.selectedComponentNames];
        uniqueComponentNames.forEach((name) => {
          if (!prev.filters.componentNames.includes(name)) {
            newSelectedNames.push(name);
          }
        });

        return {
          ...prev,
          filters: {
            componentNames: uniqueComponentNames,
            selectedComponentNames: newSelectedNames,
          },
        };
      }
      return prev;
    });
  }, [networkRequestsArray]);

  // Separate function to handle network events
  const handleNetworkEvent = useCallback((data: any) => {
    if (!data.eventId) return;

    setNetworkRequests((prev) => {
      if (data.action === 'callStart') {
        // Create a new network request entry
        const newRequest: NetworkRequest = {
          eventId: data.eventId,
          componentId: data.id,
          componentName: data.name,
          componentTitle: data.title,
          method: 'POST',
          url: `/api/component/${data.name}`,
          status: 0,
          startTime: data.startTime,
          requestBody: data.input,
          state: 'pending',
        };

        // Update state with new request using hashmap approach
        return {
          ...prev,
          [data.eventId]: newRequest,
        };
      } else if (data.action === 'callStop') {
        // Update existing request using hashmap approach
        const existingRequest = prev[data.eventId];

        if (!existingRequest) {
          // Handle out-of-order events - create a complete request if start wasn't seen
          return {
            ...prev,
            [data.eventId]: {
              eventId: data.eventId,
              componentId: data.id,
              componentName: data.name,
              componentTitle: data.title,
              method: 'POST',
              url: `/api/component/${data.name}`,
              status: data.status ? data.status : data.output?._error ? 400 : 200,
              startTime: data.startTime - (data.duration || 0),
              endTime: data.endTime,
              duration: data.duration,
              requestBody: {},
              responseBody: data.output,
              responseHeaders: data.output?.headers || {},
              state: 'complete',
            },
          };
        }

        // Normal case - update existing request
        return {
          ...prev,
          [data.eventId]: {
            ...existingRequest,
            endTime: data.endTime,
            duration: data.duration,
            status: data.status ? data.status : data.output?._error ? 400 : 200,
            responseHeaders: data.output?.headers || {},
            responseBody: data.output,
            state: 'complete',
          },
        };
      } else if (data.action === 'usage') {
        // Update existing request with cost information
        const existingRequest = prev[data.eventId];

        if (!existingRequest) {
          // If somehow we got usage data without an existing request, we can't do much
          return prev;
        }

        // Add cost information to the existing request
        return {
          ...prev,
          [data.eventId]: {
            ...existingRequest,
            cost: data.cost,
          },
        };
      }

      return prev;
    });
  }, []);

  // Listen to workspace monitor events
  useEffect(() => {
    console.log('EFFECT: running');
    if (!workspace) return;

    const setupMonitorListeners = () => {
      const handleComponentEvent = (event: any) => {
        // Only process network events if recording is enabled
        if (!isNetworkRecordingRef.current) return;

        handleNetworkEvent(event.data);

        let message = '';

        if (event.data.action === 'callStart') {
          message = `[Running Component] ${event.data.name}:${event.data.title}`;
        } else if (event.data.action === 'callStop' && event.data.duration) {
          message = `[Completed Component] ${event.data.name}:${event.data.title} (${event.data.duration / 1000}s)`;
        } else if (event.data.action === 'log') {
          message = `[Component Log] ${event.data.name}:${event.data.title}`;
        } else if (event.data.action === 'usage') {
          const totalCost = event.data.cost.reduce((sum, item) => sum + item.units, 0).toFixed(8);
          message = `[Cost] ${event.data.name || 'Component'} - $${totalCost}`;
        }

        // Only add to logs if we have a message
        if (message) {
          // Handle logs
          setLogs((prev) => [
            ...prev,
            {
              type: 'component',
              timestamp: event.timestamp,
              message: message,
              data: event.data,
            },
          ]);

          // Handle unread count
          if (activeTab !== DebugMenuTab.LOGS) {
            setUnreadLogsCount((prev) => prev + 1);
          } else if (activeTab === DebugMenuTab.LOGS && unreadLogsCount > 0) {
            setUnreadLogsCount(0);
          }
        }
      };

      const handleAgentEvent = (event: any) => {
        setLogs((prev) => [
          ...prev,
          {
            type: 'agent',
            timestamp: event.timestamp,
            message: event.data.duration
              ? `[Completed Agent] ${event.data.id}:${event.data.name} (${event.data.duration / 1000}s)`
              : `[Running Agent] ${event.data.id}:${event.data.name}`,
            data: event.data,
          },
        ]);

        if (activeTab !== DebugMenuTab.LOGS) {
          setUnreadLogsCount((prev) => prev + 1);
        }
      };

      const handleMonitorError = (error: Error) => {
        console.error('Monitor error:', error);
        // setLogs(prev => [...prev, {
        //   type: 'agent',
        //   timestamp: new Date().toISOString(),
        //   message: `[Monitor Error] ${error.message}`,
        //   data: { error }
        // }]);
      };

      // Subscribe to monitor events
      workspace.monitor.addEventListener('component', handleComponentEvent);
      workspace.monitor.addEventListener('agent', handleAgentEvent);
      workspace.monitor.addEventListener('error', handleMonitorError);

      // Update monitor state when initialized
      workspace.monitor.addEventListener('initialized', ({ monitorId }) => {
        setMonitorState({ monitorId, controller: null });
      });

      workspace.monitor.addEventListener('closed', () => {
        setMonitorState({ monitorId: null, controller: null });
      });

      // Return cleanup function
      return () => {
        if (workspace.monitor) {
          workspace.monitor.removeEventListener('component', handleComponentEvent);
          workspace.monitor.removeEventListener('agent', handleAgentEvent);
          workspace.monitor.removeEventListener('error', handleMonitorError);
          workspace.monitor.removeEventListener('initialized', handleMonitorError);
          workspace.monitor.removeEventListener('closed', handleMonitorError);
        }
      };
    };

    setupMonitorListeners();
  }, [workspace, activeTab, unreadLogsCount, handleNetworkEvent, isNetworkRecordingRef]);

  // Remove the old monitor initialization code
  useEffect(() => {
    // listen to workspace
    workspace.addEventListener('AgentLoaded', () => {
      console.log('Agent loaded');
    });

    return () => {
      workspace.removeEventListener('AgentLoaded', () => {});
    };
  }, [workspace]);

  // Keep the ref in sync with the state
  useEffect(() => {
    isNetworkRecordingRef.current = isNetworkRecording;
  }, [isNetworkRecording]);

  // Add effect to toggle class on studio element
  useEffect(() => {
    const studioElement = document.getElementById('studio');
    const activeTabHeight = getTabHeight(activeTab);
    if (studioElement) {
      if (activeTab !== null) {
        // remove the rest of the debug-log-menu-opened-* classes
        const classes = studioElement.classList;
        classes.forEach((cls) => {
          if (cls.startsWith('debug-log-menu-opened-')) {
            classes.remove(cls);
          }
        });
        studioElement.classList.add(`debug-log-menu-opened-${activeTabHeight}`);
      } else {
        // remove all debug-log-menu-opened-* classes
        const classes = studioElement.classList;
        classes.forEach((cls) => {
          if (cls.startsWith('debug-log-menu-opened-')) {
            classes.remove(cls);
          }
        });
      }
    }
  }, [activeTab]);

  const toggleExpanded = () => {
    // if (!isExpanded) {
    //   // Just expand without forcing LOGS tab
    //   setIsExpanded(true);
    // } else {
    //   setIsExpanded(false);
    //   // When collapsing, clear the active tab
    // }
  };

  const markLogsAsRead = useCallback(() => {
    setUnreadLogsCount(0);
  }, []);

  const clearNetworkRequests = useCallback(() => {
    setNetworkRequests({});
  }, []);

  // Toggle network recording
  const toggleNetworkRecording = useCallback(() => {
    setIsNetworkRecording((prev) => {
      const newValue = !prev;
      console.log('Network recording toggled from', prev, 'to', newValue);
      // Update the ref to match the new state
      isNetworkRecordingRef.current = newValue;
      return newValue;
    });
  }, []);

  // Update network UI state
  const updateNetworkUIState = useCallback(
    (updates: Partial<DebugLogMenuContextType['networkUIState']>) => {
      setNetworkUIState((prev) => ({
        ...prev,
        ...updates,
      }));
    },
    [],
  );

  return (
    <DebugLogMenuContext.Provider
      value={{
        workspace,
        activeTab,
        setActiveTab,
        isExpanded,
        toggleExpanded,
        monitorState,
        logs,
        setLogs,
        unreadLogsCount,
        markLogsAsRead,
        networkRequests,
        networkRequestsArray,
        clearNetworkRequests,
        isNetworkRecording,
        toggleNetworkRecording,
        networkUIState,
        updateNetworkUIState,
      }}
    >
      {children}
    </DebugLogMenuContext.Provider>
  );
};

/**
 * Custom hook for accessing Debug Log Menu context
 * @throws {Error} If used outside of DebugLogMenuProvider
 */
export const useDebugLogMenuCtx = (): DebugLogMenuContextType => {
  const context = useContext(DebugLogMenuContext);
  if (!context) {
    throw new Error('useDebugLogMenuCtx must be used within a DebugLogMenuProvider');
  }
  return context;
};
