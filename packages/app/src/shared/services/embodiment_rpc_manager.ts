/*
 EmbRPCUpdateSender.sendEmbRPCUpdate({
          function: 'attachHeaders',
          args: [{ 'X-MONITOR-ID': monitorId }],
        }, ['chatbot', 'swagger']);
*/

type EmbodimentScope = 'chatbot' | 'swagger' | 'all';

interface RPCMsg {
  function: string;
  args: unknown[];
}

interface ReceivedMessage {
  data: any;
  origin: string;
  source: MessageEventSource | null;
}

type MessageCallback = (msg: ReceivedMessage) => void;

interface CallbackRegistration {
  callback: MessageCallback;
  scope?: EmbodimentScope[];
}

export class EmbodimentRPCManager {
  private static messageListener: ((event: MessageEvent) => void) | null = null;
  private static registeredCallbacks: Set<CallbackRegistration> = new Set();

  /**
   * Sends an RPC message to the specified embodiment scopes
   * @param msg - The RPC message to send (can be string or RPCMsg object)
   * @param scope - Array of scopes to send the message to
   */
  public static send(msg: RPCMsg, scope: EmbodimentScope[]) {
    let _msg = typeof msg === 'string' ? msg : JSON.stringify(msg);

    const sendToAll = scope.includes('all');
    if (sendToAll || scope.includes('chatbot')) {
      this.sendChatbotMsg(_msg);
    }

    if (sendToAll || scope.includes('swagger')) {
      this.sendSwaggerMsg(_msg);
    }
  }

  /**
   * Registers a callback to receive messages from embodiment iframes
   * @param callback - Function to call when a message is received
   * @param scope - Optional array of scopes to filter messages by (if not provided, receives from all scopes)
   * @returns Function to unsubscribe the callback
   */
  public static receive(callback: MessageCallback, scope?: EmbodimentScope[]): () => void {
    // Create callback registration with scope
    const registration: CallbackRegistration = {
      callback,
      scope,
    };

    // Add callback registration to registered callbacks
    this.registeredCallbacks.add(registration);

    // Set up message listener if not already set up
    if (!this.messageListener) {
      this.messageListener = (event: MessageEvent) => {
        // Determine which scope this message came from
        const messageScope = this.determineMessageScope(event);

        // Parse the message data
        let parsedData: string | RPCMsg;
        try {
          parsedData = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        } catch {
          // If parsing fails, use raw data as string
          parsedData = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
        }

        // Create received message object
        const receivedMsg: ReceivedMessage = {
          data: parsedData,
          origin: event.origin,
          source: event.source,
        };

        // Call registered callbacks that match the scope filter
        this.registeredCallbacks.forEach((registration) => {
          // Check if this callback should receive this message based on scope
          const shouldReceive =
            !registration.scope ||
            registration.scope.includes('all') ||
            !messageScope ||
            registration.scope.includes(messageScope);

          if (shouldReceive) {
            try {
              registration.callback(receivedMsg);
            } catch (error) {
              console.error('Error in message callback:', error);
            }
          }
        });
      };

      window.addEventListener('message', this.messageListener);
    }

    // Return unsubscribe function
    return () => {
      // Find and remove the registration
      this.registeredCallbacks.forEach((reg) => {
        if (reg.callback === callback) {
          this.registeredCallbacks.delete(reg);
        }
      });

      // If no more callbacks, remove the listener
      if (this.registeredCallbacks.size === 0 && this.messageListener) {
        window.removeEventListener('message', this.messageListener);
        this.messageListener = null;
      }
    };
  }

  /**
   * Determines which embodiment scope a message originated from based on the event source
   * @param event - The message event
   * @returns The scope if determinable, null otherwise
   */
  private static determineMessageScope(event: MessageEvent): EmbodimentScope | null {
    // Try to determine scope by checking if the source is one of our iframes
    const chatbotIframe = document.querySelector('#chatbot-iframe') as HTMLIFrameElement;
    const swaggerIframe = document.querySelector('#swagger-iframe') as HTMLIFrameElement;

    if (chatbotIframe && event.source === chatbotIframe.contentWindow) {
      return 'chatbot';
    }

    if (swaggerIframe && event.source === swaggerIframe.contentWindow) {
      return 'swagger';
    }

    // If we can't determine, return null (will still be delivered if no scope filter)
    return null;
  }

  /**
   * Sends a message to the chatbot iframe
   * @param msg - The message string to send
   */
  private static sendChatbotMsg(msg: string) {
    const iframe = document.querySelector('#chatbot-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(msg, '*');
    }
  }

  /**
   * Sends a message to the swagger iframe
   * @param msg - The message string to send
   */
  private static sendSwaggerMsg(msg: string) {
    const iframe = document.querySelector('#swagger-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(msg, '*');
    }
  }
}
