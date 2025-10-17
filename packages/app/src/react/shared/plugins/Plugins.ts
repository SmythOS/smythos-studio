export enum PluginTarget {
  BuilderLoadScript = 'builder/LoadScript',
  BuilderLoadAgentTemplates = 'builder/LoadAgentTemplates',
  TopMenuItem = 'topMenuItem',
  SidebarMenuItems = 'sidebarMenuItems',
  TopMenuProfileDropdownItems = 'topMenuProfileDropdownItems',
  AgentSettingsTasksTabWidget = 'agentSettings/tasksTabWidget',
  AgentSettingsWidgets = 'agentSettings/widgets',
  AgentSettingsSkillsWidgetSkillButton = 'agentSettings/skillsWidget/skillButton',
  BuilderSidebarComponentItems = 'builder/sidebarComponentItems',
  BuilderSREComponents = 'builder/sreComponents',
  AgentsPageSection = 'agentsPage/section',
  AgentsPageGenerateAgentForm = 'agentsPage/generateAgentForm',
  AgentsPageOnboardingTasks = 'agentsPage/onboardingTasks',
  VaultPageSmythOSRecommendedModels = 'vaultPage/smythOSRecommendedModels',

  /**
   * ObservabilityProvider - Unified observability provider injected by enterprise edition
   * Provides complete implementation for:
   * - User behavior tracking (interactions, feature usage, workflows)
   * - System insights (events, errors, performance metrics)
   * - User identity management (identification, context correlation)
   * - Feature configuration (flags, A/B testing, rollouts)
   *
   * Default: No-op implementation in community edition (all operations disabled)
   * Enterprise: PostHog-based implementation for complete observability
   */
  ObservabilityProvider = 'observability/provider',
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
