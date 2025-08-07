import { EventSourceMessage, fetchEventSource } from '@microsoft/fetch-event-source';
import { EmbodimentRPCManager } from '../../shared/services/embodiment_rpc_manager';
import EventEmitter from '../EventEmitter.class';
import { Workspace } from './Workspace.class';

/**
 * Monitor class for handling SSE connections and emitting events
 */
export class Monitor extends EventEmitter {
  private controller: AbortController | null = null;
  private monitorId: string | null = null;
  private workspace: Workspace;

  constructor(workspace: Workspace) {
    super();

    this.workspace = workspace;
  }

  /**
   * Get the current monitor ID
   */
  public get id(): string | null {
    return this.monitorId;
  }

  /**
   * Initialize the monitor connection
   */
  public async init(): Promise<void> {
    try {
      if (!this.workspace?.serverData?.dbgUrl) {
        console.log('Waiting for server data to be loaded');
        // await the server data to be loaded
        await new Promise((resolve) => {
          let listener = () => {
            this.workspace.removeEventListener('ServerDataLoaded', listener);
            resolve(true);
            console.log('Server data loaded so we can initialize the monitor');
          };
          this.workspace.addEventListener('ServerDataLoaded', listener);
        });
      }

      if (!this.workspace?.agent?.id) {
        console.log('Waiting for agent to be loaded');
        // await the agent to be loaded
        await new Promise((resolve) => {
          let listener = () => {
            this.workspace.removeEventListener('AgentLoaded', listener);
            resolve(true);
            console.log('Agent loaded so we can initialize the monitor');
          };
          this.workspace.addEventListener('AgentLoaded', listener);
        });
      }

      this.controller = await this.setupMonitor();
    } catch (error) {
      console.error('Failed to initialize monitor:', error);
      this.emit('error', error);
    }
  }

  /**
   * Close the monitor connection
   */
  public close(): void {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
      this.monitorId = null;
    }
  }

  /**
   * Set up the monitor connection using fetch-event-source
   */
  private async setupMonitor(): Promise<AbortController> {
    const controller = new AbortController();
    let url = `${this.workspace.serverData.dbgUrl}/sse/agent/${this.workspace.agent.id}/monitor`;
    let headers = {
      'X-AGENT-ID': this.workspace.agent.id,
    };

    fetchEventSource(url, {
      signal: controller.signal,
      headers: headers,
      async onopen(response) {
        if (!response.ok) {
          throw new Error(`Failed to open monitor connection: ${response.status}`);
        }
        console.log('Monitor connection opened');
      },
      onmessage: (event: EventSourceMessage) => {
        this.processEvent(event);
      },
      onclose: () => {
        console.log('Monitor connection closed');
        this.emit('closed');
        this.monitorId = null;
        this.controller = null;
        // Retry connection
        setTimeout(() => this.init(), 1000);
      },
      onerror: (err) => {
        console.error('Monitor connection error:', err);
        this.emit('error', err);
      },
      openWhenHidden: true,
    });

    return controller;
  }

  private processEvent(event: any): any {
    // add a preprocessor if u need to do extra actions before the event is processed, or if u want to not make it forwarded
    const preProcessors: Record<string, (data: any) => boolean> = {
      init: (data: any) => {
        const monitorId = data;
        console.log('Monitor initialized:', monitorId);
        this.monitorId = monitorId;
        // Expose monitorId globally for vanilla JS agent runner
        (window as any).currentMonitorId = monitorId;
        this.emit('initialized', { monitorId });

        EmbodimentRPCManager.send(
          {
            function: 'attachHeaders',
            args: [{ 'X-MONITOR-ID': monitorId }],
          },
          ['all'],
        );

        return false;
      },

      agent: (data: any) => {
        (window as any).debugCurrentRunningAgentTimestamp = data.endTime
          ? undefined
          : data.startTime;

        return true;
      },
    };

    try {
      const preProcessor = preProcessors[event.event] || (() => true);
      let shouldForward = preProcessor(event.data);
      if (!shouldForward) return;
      const data = JSON.parse(event.data);
      //FIXME : event type "llm/passthrough/content" will fail because it's returning raw text instead of a JSON object
      // we need to handle this case differently, as content comes back token by token
      this.emit(event.event, {
        type: event.event,
        timestamp: new Date().toISOString(),
        data,
      });
    } catch (error) {
      //console.error('Error parsing event:', error);
      this.emit('error', error);
    }
  }
}
