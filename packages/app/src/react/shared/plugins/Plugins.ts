export enum PluginTarget {
  BuilderLoadScript = 'builder/LoadScript',
  TopMenuItem = 'topMenuItem',
  Onboarding = 'onboarding',
}

export enum PluginType {
  Function = 'function',
  Component = 'component',
  Config = 'config',
}

export type TPlugin =
  | {
      type: PluginType.Function;
      function: (...args: any[]) => any;
    }
  | {
      type: PluginType.Component;
      component: React.ReactNode;
    }
  | {
      type: PluginType.Config;
      config: any;
    };

export class Plugins {
  private pluginsByTarget: Record<string, TPlugin[]> = {};

  constructor() {
    this.pluginsByTarget = {};
  }

  registerPlugin(target: string, plugin: TPlugin) {
    if (!this.pluginsByTarget[target]) {
      this.pluginsByTarget[target] = [];
    }
    this.pluginsByTarget[target].push(plugin);
  }

  getPluginsByTarget(target: string, type?: PluginType) {
    return (
      this.pluginsByTarget[target]?.filter((plugin) => (type ? plugin.type === type : true)) || []
    );
  }

  getAllPlugins(type?: PluginType) {
    return Object.values(this.pluginsByTarget)
      .flat()
      .filter((plugin) => (type ? plugin.type === type : true));
  }
}

export const plugins = new Plugins();
