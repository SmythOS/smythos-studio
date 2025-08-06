import EventEmitter from '../../../EventEmitter.class';
import { jsonrepair } from 'jsonrepair';
declare var workspace: any;
const ComponentNameMap = {
  Endpoint: 'APIEndpoint',
  LLMPrompt: 'PromptGenerator',
};
const ComponentDisplayNameMap = {
  Endpoint: 'API Endpoint',
  PromptGenerator: 'LLM Prompt',
};

export default class ADLParser extends EventEmitter {
  public agentData: any;
  public componentStatus: any;
  public addConnections: any;
  public deleteConnections: any;
  public currentComponent: any;
  public inMultilineSettings: boolean;
  public multilineSettingsBuffer: string;
  private inMultilineIO: boolean = false;
  private multilineIOBuffer: string = '';
  private multilineIOType: 'INPUTS' | 'OUTPUTS' | null = null;
  private inMultilineAgentProp: boolean = false;
  private currentAgentProp: 'name' | 'description' | 'behavior' | null = null;
  private multilineAgentPropBuffer: string = '';

  constructor(data?: any) {
    super();
    this.componentStatus = {};
    this.addConnections = [];
    this.deleteConnections = [];
    this.currentComponent = null;
    //this.isUpdating = false;
    this.inMultilineSettings = false;
    this.multilineSettingsBuffer = '';

    this.agentData = JSON.parse(JSON.stringify(data || workspace.agent.data));
    this.refreshAgentData(data);
  }

  async refreshAgentData(data?: any) {
    console.log('refreshAgentData', data);
    if (!data) {
      data = await workspace.export();
    }
    this.agentData = JSON.parse(JSON.stringify(data));
  }

  parseLine(line: string): void {
    line = line.trim();
    if (!line) return;

    // Agent creation or update
    const agentActionMatch = line.match(/^(CREATE|UPDATE) AGENT$/);
    if (agentActionMatch) {
      const [, action] = agentActionMatch;
      if (action === 'CREATE') {
        this.agentData = {
          name: '',
          description: '',
          behavior: '',
          components: [],
          connections: [],
        };
        //this.isUpdating = false;
      } else if (action === 'UPDATE') {
        //this.isUpdating = true;
        this.agentData = JSON.parse(JSON.stringify(workspace.agent.data));
      }
      return;
    }

    if (!this.currentComponent) {
      // Check if we're in a multiline agent property
      if (this.inMultilineAgentProp) {
        this.handleMultilineAgentProp(line);
        return;
      }

      // Agent properties
      const agentPropMatch = line.match(/^(NAME|DESCRIPTION|BEHAVIOR)\s*=\s*"(.*)$/);
      if (agentPropMatch) {
        const [, prop, value] = agentPropMatch;
        if (prop) {
          this.currentAgentProp = prop.toLowerCase() as 'name' | 'description' | 'behavior';
          if (value.endsWith('"')) {
            // Single line property
            this.agentData[this.currentAgentProp] = value.slice(0, -1);
            this.emit(
              'agentSettingsUpdated',
              this.currentAgentProp,
              this.agentData[this.currentAgentProp],
            );
            this.currentAgentProp = null;
          } else {
            // Start of multiline property
            this.inMultilineAgentProp = true;
            this.multilineAgentPropBuffer = value;
          }
        }
        return;
      }
    }

    // Insert component
    const insertComponentMatch = line.match(/^INSERT COMPONENT (\w+) ID=(\w+)$/);
    if (insertComponentMatch) {
      const [, name, id] = insertComponentMatch;
      this.componentStatus[id] = 'INSERT';
      this.currentComponent = {
        id,
        name: ComponentNameMap[name] || name,
        outputs: [],
        inputs: [],
        data: {},
        top: '0px',
        left: '0px',
        width: '',
        height: '',
        displayName: ComponentDisplayNameMap[name] || name,
        title: '',
        aiTitle: '',
        description: '',
      };
      return;
    }

    // Update component
    const updateComponentMatch = line.match(/^UPDATE COMPONENT (?:(\w+)|(\w+) ID=(\w+))$/);
    if (updateComponentMatch) {
      const [, simpleId, componentType, complexId] = updateComponentMatch;
      const id = simpleId || complexId;

      const existingComponent = this.agentData.components.find((c) => c.id === id);
      if (existingComponent) {
        this.componentStatus[id] = 'UPDATE';
        this.currentComponent = { ...existingComponent };

        // If component type is provided, update it
        if (componentType) {
          this.currentComponent.name = ComponentNameMap[componentType] || componentType;
          this.currentComponent.displayName =
            ComponentDisplayNameMap[componentType] || componentType;
        }
      } else {
        console.warn(`Attempted to update non-existent component with ID: ${id}`);
        this.currentComponent = null;
      }
      return;
    }

    // Delete component
    const deleteComponentMatch = line.match(/^DELETE COMPONENT (\w+)$/);
    if (deleteComponentMatch) {
      const [, id] = deleteComponentMatch;
      this.agentData.components = this.agentData.components.filter((c) => c.id !== id);
      this.agentData.connections = this.agentData.connections.filter(
        (c) => c.sourceId !== id && c.targetId !== id,
      );

      this.componentStatus[id] = 'DELETED';
      return;
    }

    // Component properties
    const componentPropMatch = line.match(/^(TITLE|DESCRIPTION|LEFT|TOP)\s*=\s*(.+)$/);
    if (componentPropMatch && this.currentComponent) {
      const [, prop, value] = componentPropMatch;
      switch (prop) {
        case 'TITLE':
          this.currentComponent.title = value.replace(/"/g, '');
          break;
        case 'DESCRIPTION':
          this.currentComponent.description = value.replace(/"/g, '');
          break;
        case 'LEFT':
          this.currentComponent.left = `${value.trim()}px`;
          break;
        case 'TOP':
          this.currentComponent.top = `${value.trim()}px`;
          break;
      }
      return;
    }

    // Inputs and Outputs
    const ioMatch = line.match(/^(INPUTS|OUTPUTS)\s*=\s*\[(.*)$/);
    if (ioMatch && this.currentComponent) {
      const [, type, items] = ioMatch;
      this.multilineIOType = type as 'INPUTS' | 'OUTPUTS';
      this.multilineIOBuffer = items.trim();

      if (this.multilineIOBuffer.endsWith(']')) {
        // Single line IO
        this.processIO(this.multilineIOType, this.multilineIOBuffer.slice(0, -1));
        this.resetMultilineIO();
      } else {
        // Multiline IO
        this.inMultilineIO = true;
      }
      return;
    }

    // Handle continuation of multiline IO
    if (this.inMultilineIO && this.currentComponent) {
      this.multilineIOBuffer += ' ' + line.trim();

      if (line.trim().endsWith(']')) {
        // End of multiline IO
        this.processIO(this.multilineIOType!, this.multilineIOBuffer.slice(0, -1));
        this.resetMultilineIO();
      }
      return;
    }

    // Settings
    if (line.startsWith('SETTINGS =') && this.currentComponent) {
      let settingsString = line.substring('SETTINGS ='.length).trim();

      // If the settings don't end with a closing brace, we're in a multiline setting
      if (!settingsString.endsWith('}')) {
        this.inMultilineSettings = true;
        this.multilineSettingsBuffer = settingsString;
        return;
      }

      // If we're not in a multiline setting, process it as before
      const settings = repairJson(settingsString);
      this.currentComponent.data = repairJson(settings);
      return;
    }

    // Handle continuation of multiline settings
    if (this.inMultilineSettings && this.currentComponent) {
      this.multilineSettingsBuffer += ' ' + line.trim();

      // Check if this line completes the JSON object
      if (line.trim().endsWith('}')) {
        this.inMultilineSettings = false;
        const settings = repairJson(this.multilineSettingsBuffer);
        this.currentComponent.data = repairJson(settings);
        this.multilineSettingsBuffer = '';
      }
      return;
    }
    // Commit component
    if (line === 'COMMIT' && this.currentComponent) {
      const existingIndex = this.agentData.components.findIndex(
        (c) => c.id === this.currentComponent.id,
      );
      if (existingIndex !== -1) {
        this.agentData.components[existingIndex] = this.currentComponent;
      } else {
        this.agentData.components.push(this.currentComponent);
      }
      this.componentStatus[this.currentComponent.id] = 'READY';
      this.currentComponent = null;

      return;
    }

    // Connect components
    const connectMatch = line.match(/^CONNECT (\w+):([^:]+) TO (\w+):([^:]+)$/);
    if (connectMatch) {
      const [, sourceId, sourceOutput, targetId, targetInput] = connectMatch;
      const sourceComponent =
        this.agentData.components.find((c) => c.id === sourceId) ||
        document.getElementById(sourceId);
      const targetComponent =
        this.agentData.components.find((c) => c.id === targetId) ||
        document.getElementById(targetId);
      if (sourceComponent && targetComponent) {
        //const sourceIndex = sourceComponent.outputs.findIndex((o) => o.name === sourceOutput);
        //const targetIndex = targetComponent.inputs.findIndex((i) => i.name === targetInput);
        const sourceIndex = sourceOutput;
        const targetIndex = targetInput;
        this.addConnections.push({
          sourceId,
          sourceIndex,
          targetId,
          targetIndex,
        });
      }
    }

    // Delete connection
    const deleteConnectMatch = line.match(/^DELETE CONNECTION (\w+):([^:\s]+) TO (\w+):([^:\s]+)$/);
    if (deleteConnectMatch) {
      const [, sourceId, sourceOutput, targetId, targetInput] = deleteConnectMatch;
      // this.agentData.connections = this.agentData.connections.filter(
      //     (c) =>
      //         !(
      //             c.sourceId === sourceId &&
      //             c.targetId === targetId &&
      //             c.sourceIndex === sourceComponent.outputs.findIndex((o) => o.name === sourceOutput) &&
      //             c.targetIndex === targetComponent.inputs.findIndex((i) => i.name === targetInput)
      //         )
      // );
      this.deleteConnections.push({
        sourceId,
        sourceIndex: sourceOutput,
        targetId,
        targetIndex: targetInput,
      });
    }
  }

  getJSON() {
    return {
      components: this.agentData.components,
      connections: this.agentData.connections,
      partial: true,
    };
  }

  JSON2ADL(jsonString: string | object): string {
    const agentData = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
    let adl = '';

    // Create agent
    adl += 'CREATE AGENT\n';
    adl += `NAME = "${agentData.name || agentData?.templateInfo?.name || ''}"\n`;
    adl += `DESCRIPTION = "${agentData.description || ''}"\n`;
    adl += `BEHAVIOR = "${agentData.behavior || ''}"\n\n`;

    // Components
    agentData.components.forEach((component) => {
      adl += `INSERT COMPONENT ${component.name} ID=${component.id}\n`;
      adl += `TITLE = "${component.title || ''}"\n`;
      adl += `DESCRIPTION = "${component.description || ''}"\n`;
      // Replace POS with separate LEFT and TOP
      adl += `LEFT = ${parseInt(component.left)}\n`;
      adl += `TOP = ${parseInt(component.top)}\n`;

      // Settings
      if (Object.keys(component.data).length > 0) {
        const settings = JSON.parse(JSON.stringify(component.data));
        //strip empty values
        const strippedSettings = Object.fromEntries(
          Object.entries(settings).filter(
            ([key, value]) => value !== '' && value !== null && value !== undefined,
          ),
        );
        adl += `SETTINGS = ${JSON.stringify(strippedSettings)}\n`;
      }

      // Inputs
      if (component.inputs.length > 0) {
        const inputs = component.inputs
          .map((input) => {
            let name = input.name;
            if (input.optional) name += '?';
            if (input.default) name += '*';

            let valStr = '';
            const excluded = ['name', 'default', 'color', 'index', 'type'];
            for (let item in input) {
              if (excluded.includes(item)) continue;
              valStr += `${valStr ? ',' : ''}${item}=${
                typeof input[item] === 'string' ? `"${input[item]}"` : input[item]
              }`;
            }

            if (valStr) {
              valStr = `(${valStr}${input.type ? `,type="${input.type}"` : ''})`;
            } else {
              valStr = input.type;
            }

            return `${name}:${valStr}`;
          })
          .join(', ');
        adl += `INPUTS = [${inputs}]\n`;
      }

      // Outputs
      if (component.outputs.length > 0) {
        const outputs = component.outputs
          .map((output) => {
            let name = output.name;
            if (output.optional) name += '?';
            if (output.default) name += '*';

            let valStr = '';
            const excluded = ['name', 'default', 'color', 'index', 'type'];
            for (let item in output) {
              if (excluded.includes(item)) continue;
              valStr += `${valStr ? ',' : ''}${item}=${
                typeof output[item] === 'string' ? `"${output[item]}"` : output[item]
              }`;
            }

            if (valStr) {
              valStr = `(${valStr}${output.type ? `,type="${output.type}"` : ''})`;
            } else {
              valStr = output.type;
            }

            return `${name}:${valStr}`;
          })
          .join(', ');
        adl += `OUTPUTS = [${outputs}]\n`;
      }

      adl += 'COMMIT\n\n';
    });

    // Connections
    agentData.connections.forEach((connection) => {
      const sourceComponent = agentData.components.find((c) => c.id === connection.sourceId);
      const targetComponent = agentData.components.find((c) => c.id === connection.targetId);

      if (sourceComponent && targetComponent) {
        const sourceOutput = sourceComponent.outputs[connection.sourceIndex].name;
        const targetInput = targetComponent.inputs[connection.targetIndex].name;
        adl += `CONNECT ${connection.sourceId}:${sourceOutput} TO ${connection.targetId}:${targetInput}\n`;
      }
    });

    return adl.trim();
  }

  private processIO(type: 'INPUTS' | 'OUTPUTS', items: string): void {
    const ioArray = type.toLowerCase();
    this.currentComponent[ioArray] = items.split(',').map((item, index) => {
      const [name, value] = item.trim().split(':');
      const isOptional = name.endsWith('?');
      const cleanName = name.replace('?', '').replace('*', '');
      let val;
      try {
        //value format can be : (type="any", expression="body.username")
        let jsonValue = `{${value
          .trim()
          .replace(/^(\()/gim, '')
          .replace(/(\))$/gim, '')
          .replace(/:/gim, ':')}}`;

        val = repairJson(jsonValue);

        if (typeof val === 'string') {
          val = { type: value?.trim() || 'Any' };
        }
      } catch (e) {
        val = { type: value?.trim() || 'Any' };
      }

      return {
        name: cleanName,
        color: type === 'INPUTS' ? '#F35063' : '#3C89F9',
        optional: isOptional,
        index,
        default: name.endsWith('*'),
        ...val,
      };
    });
  }

  private resetMultilineIO(): void {
    this.inMultilineIO = false;
    this.multilineIOBuffer = '';
    this.multilineIOType = null;
  }

  private handleMultilineAgentProp(line: string): void {
    const endQuoteIndex = line.indexOf('"');
    if (endQuoteIndex !== -1 && !this.isEscapedQuote(line, endQuoteIndex)) {
      // End of multiline property
      this.multilineAgentPropBuffer += '\n' + line.slice(0, endQuoteIndex);
      this.agentData[this.currentAgentProp!] = this.multilineAgentPropBuffer;
      this.emit(
        'agentSettingsUpdated',
        this.currentAgentProp!,
        this.agentData[this.currentAgentProp!],
      );

      // Reset multiline state
      this.inMultilineAgentProp = false;
      this.currentAgentProp = null;
      this.multilineAgentPropBuffer = '';

      // Process any remaining content on the line
      if (endQuoteIndex < line.length - 1) {
        this.parseLine(line.slice(endQuoteIndex + 1));
      }
    } else {
      // Continue multiline property
      this.multilineAgentPropBuffer += '\n' + line;
    }
  }

  private isEscapedQuote(line: string, index: number): boolean {
    let backslashCount = 0;
    let i = index - 1;
    while (i >= 0 && line[i] === '\\') {
      backslashCount++;
      i--;
    }
    return backslashCount % 2 !== 0;
  }
}

window['ADLParser'] = ADLParser;
function repairJson(content) {
  try {
    return JSON.parse(jsonrepair(content));
  } catch (err) {}

  return content;
}
