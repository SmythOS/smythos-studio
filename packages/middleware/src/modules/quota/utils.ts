/* eslint-disable no-param-reassign */
import { PlanProperties, SubscriptionProperties } from './interfaces';

export const buildDefaultPlanProps: () => PlanProperties = () => {
  return {
    limits: {
      prodAiAgents: 10000,
      devAiAgents: 100000,
      spaces: 500,
      teamMembers: 1,
      dataPoolUsageGB: 4000,
    },
    flags: {
      embodimentsEnabled: true,
      agentAuthSidebarEnabled: true,
      domainRegistrationEnabled: true,
      distributionsEnabled: false,
      hasBuiltinModels: true,
      whitelabel: true,
      customModelsEnabled: true,
      modelCostMultiplier: 1,
    },
  };
};

export const buildDefaultSubscriptionProps: () => SubscriptionProperties = () => {
  return {
    tasks: null,
    bonusTasks: null,
  };
};

export const fillSubscriptionProps: (props: { [key: string]: any } | undefined) => SubscriptionProperties = props => {
  const defaults = buildDefaultSubscriptionProps();
  return {
    tasks: props?.tasks || defaults.tasks,
  };
};

export const fillPlanProps: (props: { [key: string]: any } | undefined) => PlanProperties = props => {
  const defaults = buildDefaultPlanProps();
  return {
    limits: {
      ...defaults.limits,
      ...(props?.limits || {}),
    },
    flags: {
      ...defaults.flags,
      ...(props?.flags || {}),
    },
  };
};
