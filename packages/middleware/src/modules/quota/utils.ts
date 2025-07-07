/* eslint-disable no-param-reassign */
import { SubscriptionProperties, PlanProperties } from './interfaces';

export const buildDefaultPlanProps: () => PlanProperties = () => {
  return {
    limits: {
      prodAiAgents: null,
      devAiAgents: null,
      teamMembers: null,
    },
    flags: {
      embodimentsEnabled: false,
      agentAuthSidebarEnabled: false,
      domainRegistrationEnabled: false,
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
