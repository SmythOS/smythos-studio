/*
 EmbRPCUpdateSender.sendEmbRPCUpdate({
          function: 'attachHeaders',
          args: [{ 'X-MONITOR-ID': monitorId }],
        }, ['chatbot', 'swagger']);
*/

type EmbodimentScope = 'chatbot' | 'swagger' | 'all';

interface RPCMsg {
  function: string;
  args: any[];
}

export class EmbodimentRPCManager {
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

  private static sendChatbotMsg(msg: string) {
    const iframe = document.querySelector('#chatbot-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.contentWindow.postMessage(msg, '*');
    }
  }

  private static sendSwaggerMsg(msg: string) {
    const iframe = document.querySelector('#swagger-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.contentWindow.postMessage(msg, '*');
    }
  }
}
