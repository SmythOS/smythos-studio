import { jsonrepair } from 'jsonrepair';
import { Workspace } from 'src/frontend/workspace/Workspace.class';
import EventEmitter from '../../../EventEmitter.class';

const delay = (ms) => new Promise((resolve) => setTimeout(() => resolve(true), ms));
const nextTick = () => new Promise((resolve) => setTimeout(() => resolve(true), 0));
//const nextTick = () => new Promise((resolve) => queueMicrotask(() => resolve(true)));
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(true)));

export class WeaverAPI {
  private _conv_messages = [];
  private workspace: Workspace;

  private pendingSaveAgent = false;
  private interrupted = false;
  private processing = false;

  private bufferContent = '';
  private bufferIndex = 0;
  private buffering = false;

  private bufferLines = [];
  private controller: AbortController;
  private inCodeBlock = false;
  private blockProps: any = {};

  constructor(workspace: Workspace) {
    this.workspace = workspace;
    if (window['_conv_messages'] && this._conv_messages.length == 0) {
      this._conv_messages = window['_conv_messages'];
    }
    //console.log('[DBG]', 'WeaverAPI constructor', this._conv_messages);
  }

  private repairJson(content) {
    try {
      return JSON.parse(jsonrepair(content));
    } catch (err) {}

    return content;
  }

  public getConvMessages() {
    return this._conv_messages;
  }

  public ensureSaveAgent(handler?) {
    if (this.pendingSaveAgent) return;
    this.pendingSaveAgent = true;
    setTimeout(async () => {
      if (typeof handler == 'function') handler();
      const result = await this.workspace.saveAgent();
      this.pendingSaveAgent = false;
      if (!result) {
        //retry

        this.ensureSaveAgent(handler);
      } else {
        //console.log('saveAgent success');
      }
    }, 200);
  }

  public async refreshChat() {
    this._conv_messages = [];
    window['_conv_messages'] = this._conv_messages;
    const response = await fetch('/api/page/builder/chat/' + this.workspace.agent.id + '/refresh', {
      method: 'POST',
    });
    if (response.status == 200) {
      return true;
    }
    return false;
  }

  public async sendFeedback(feedback) {
    const response = await fetch(
      '/api/page/builder/chat/' + this.workspace.agent.id + '/feedback',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedback),
      },
    ).then((res) => res.json());
    return response;
  }

  public async fetchChat(
    message,
    attachmentFile = null,
    attachmentUrl = null,
    callback = (data?) => {},
  ) {
    //console.log('[DBG]', 'fetchChat');
    this._conv_messages.push({ role: 'user', message });
    let currentLine = '';
    this.buffering = true;
    //console.log('[DBG]', 'fetchChat set buffering', this.buffering);
    try {
      if (this.controller) {
        this.controller.abort();
      }

      await this.workspace.saveAgent();

      const selection = [...document.querySelectorAll('.component.selected')].map((e) => e.id);
      const formData = new FormData();
      formData.append('message', message);
      formData.append('selection', JSON.stringify(selection));

      if (attachmentFile) {
        formData.append('attachments', attachmentFile);
      }
      if (attachmentUrl) {
        formData.append('attachmentUrl', attachmentUrl);
      }
      this.controller = new AbortController(); // create a controller
      const signal = this.controller.signal; // get the signal

      const fetchResponse = await fetch('/api/page/builder/chat/' + this.workspace.agent.id, {
        method: 'POST',
        // headers: {
        //   'Content-Type': 'application/json',
        // },
        body: formData, //JSON.stringify({ message, selection }),
        signal,
      });

      //console.log('[DBG]', 'fetchChat response', fetchResponse);

      const reader = fetchResponse.body.getReader();
      const decoder = new TextDecoder('utf-8');

      // Read the stream
      while (true) {
        if (this.interrupted) {
          console.warn('Weaver Interrupted');

          break;
        }
        const { done, value } = await reader.read();
        if (done) {
          //console.log('[DBG]', 'fetchChat done');
          break;
        }
        // Convert the Uint8Array to string and process it
        const raw = decoder.decode(value, { stream: true });

        await this.processBuffer(callback);
        let chunks = raw.split('}¨');
        for (let chunk of chunks) {
          let jsonStr = `${chunk.startsWith('{') ? chunk : '{' + chunk}${
            chunk.endsWith('}') ? '' : '}'
          }`;

          let data;

          try {
            data = JSON.parse(jsonStr);
          } catch (error) {
            console.warn('Failed to parse chunk', raw);
            continue;
          }
          if (data._type == 'status' || data._type == 'info' || data._type == 'error') {
            callback(data);
            await this.processBuffer(callback);
            continue;
          }

          const content = data.content || '';

          if (content.indexOf('\n') > -1) {
            const lines = content.split('\n');
            for (let i = 0; i < lines.length - 1; i++) {
              const line = lines[i];
              if (currentLine) {
                currentLine += line;
                //console.log('currentLine', currentLine);
                if (currentLine.indexOf('```smyth') > -1) {
                  const parts = currentLine.split('```smyth');
                  this.bufferLines.push(parts[0] + '\n');
                  this.bufferLines.push('```smyth' + parts[1] + '\n');
                  console.warn('fixed code block', currentLine);
                } else {
                  this.bufferLines.push(currentLine + '\n');
                }
                currentLine = '';
                await this.processBuffer(callback);
                continue;
              }
              //console.log('line', line);

              if (line.indexOf('```smyth') > -1) {
                const parts = line.split('```smyth');
                this.bufferLines.push(parts[0] + '\n');
                this.bufferLines.push('```smyth' + parts[1] + '\n');
                console.warn('fixed code block', line);
              } else {
                this.bufferLines.push(line + '\n');
              }
              await this.processBuffer(callback);
            }
            currentLine = lines[lines.length - 1];
            //callback({ content: '\n' });
          } else {
            currentLine += content;
            //callback({ content: content + ' ' });
          }
          //await delay(10);
          await this.processBuffer(callback);
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Fetch was aborted');
        return;
      } else {
        console.error('Fetch error:', error);
      }
    }

    // Add the last line if it's not empty
    if (currentLine) {
      this.bufferLines.push(currentLine);
      this.processBuffer(callback);
    }

    //console.log('>>>>>', bufferLines);

    // You can process bufferLines here or pass it to another function
    this.buffering = false;
    //console.log('[DBG]', 'fetchChat unset buffering', this.buffering);

    this.processBuffer(callback);
  }

  public async stopChat(emitter) {
    //console.log('[DBG]', 'call stopChat');
    const response = await fetch('/api/page/builder/chat/' + this.workspace.agent.id + '/stop', {
      method: 'POST',
    });
    //console.log('[DBG]', 'stopChat', response);
    if (response.status == 200) {
      //empty the buffer
      this.interrupted = true;
      this.processing = false;
      this.bufferLines = [];
      this.bufferContent = '';
      this.bufferIndex = 0;
      this.buffering = false;
      //console.log('[DBG]', 'stopChat unset buffering', this.buffering);
      this.inCodeBlock = false;
      this.blockProps = {};

      emitter.emit('interrupted', { content: 'Interrupted by the user' });

      return true;
    }
    return false;
  }

  public async processBuffer(callback) {
    //console.log('[DBG]', 'processBuffer', this.bufferLines);
    if (this.processing || this.interrupted) return;
    this.processing = true;

    while (this.bufferIndex < this.bufferLines.length) {
      const line = this.bufferLines[this.bufferIndex];
      this.bufferContent += line;

      //console.log('[DBG]', 'line', line);
      if (
        line.trim().startsWith('```') &&
        (line.trim().indexOf('smyth') > -1 /*&& line.trim().indexOf('file=') > -1*/ ||
          this.inCodeBlock)
      ) {
        this.inCodeBlock = !this.inCodeBlock;

        if (this.inCodeBlock) {
          const id = 'code_' + Date.now();
          this.blockProps = { id, code: '', _status: 'in_progress', _type: 'info' };
          const props = line.split(' ');
          for (let prop of props) {
            let [key, value] = prop.split('=');
            if (!key || !value) continue;
            value = value.replace(/['"]/g, '');
            this.blockProps[key] = value;
          }
        } else {
          callback({ content: '', ...this.blockProps, _status: 'done' });

          this.ensureSaveAgent();
        }
        this.bufferIndex++;
        continue;
      }

      if (this.inCodeBlock) {
        this.blockProps.code += line;
        //console.log(line);
        callback({ content: line, ...this.blockProps });
        await nextTick();
      } else {
        const tokens = line.match(new RegExp(`[\\s\\S]{1,3}`, 'g')) || []; //split into tokens of 3 characters each

        for (let tok of tokens) {
          callback({ content: tok });

          await nextTick();
        }
      }
      this.bufferIndex++;
      //await delay(2);
    }
    this.processing = false;

    if (!this.buffering && this.bufferIndex >= this.bufferLines.length) {
      console.log(
        '[DBG]',
        'processBuffer done',
        this.buffering,
        this.bufferIndex,
        this.bufferLines.length,
      );
      this._conv_messages.push({ role: 'assistant', message: this.bufferContent });

      //reset buffers
      this.bufferIndex = 0;
      this.bufferContent = '';
      this.bufferLines = [];

      callback({ end: true });
    }
  }

  public async sendChatMessage(message, attachmentFile = null, attachmentUrl = null) {
    //console.log('[DBG]', 'sendChatMessage', this.bufferLines);
    this.bufferLines = [];
    this.interrupted = false;
    this.inCodeBlock = false;
    this.blockProps = {};

    const emitter = new EventEmitter();
    (async () => {
      await delay(100);

      this.fetchChat(message, attachmentFile, attachmentUrl, async (data) => {
        if (data._type == 'info') {
          const statusText =
            this.workspace?.agent?.data?.components?.length > 0 ? 'Updating' : 'Creating';
          emitter.emit('info', {
            content: data.content || '',
            info: data.status == 'done' ? `${data.file}` : `${statusText} ${data.file}`,
            id: data.id,
            file: data.file,
            type: data.type,
            code: data.code,
            status: data._status,
          });
          return;
        }
        if (data._type == 'status') {
          emitter.emit('status', { status: data.content, id: data.id });
          return;
        }
        if (data._type == 'interrupted') {
          emitter.emit('interrupted', { content: data.content });

          return;
        }
        if (data._type == 'error') {
          emitter.emit('error', { teamId: data.teamId, error: data.content });
          return;
        }

        if (data.content) {
          ////console.log('[DBG]', 'API content', data);
          emitter.emit('content', { content: data.content });
          //emitter.emit('error', { error: "An error occurred" });
          return;
        }
        if (data.end) {
          //console.log('[DBG]', 'Emitting API end', data);
          emitter.emit('end');

          setTimeout(() => {
            this.ensureSaveAgent();
            this.workspace.redraw();
          }, 1000);
        }
      });
    })();

    return emitter;
  }
}
