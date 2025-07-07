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

export const processUsageRecord = (teamUsage: any, record: any) => {
  const { teamId: currentTeamId, day, agentId, sourceId, class: usageClass } = record;
  const units = record._sum.units || 0;
  const cost = record._sum.multipliedCost || 0;

  if (!teamUsage[currentTeamId]) {
    teamUsage[currentTeamId] = { days: {}, costs: {} };
  }

  const formattedDay = new Date(day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  }); // Format as "Month Day"

  if (!teamUsage[currentTeamId].days[formattedDay]) {
    teamUsage[currentTeamId].days[formattedDay] = { agents: {} };
  }

  if (!teamUsage[currentTeamId].days[formattedDay].agents[agentId]) {
    teamUsage[currentTeamId].days[formattedDay].agents[agentId] = { sources: {} };
  }

  if (!teamUsage[currentTeamId].days[formattedDay].agents[agentId].sources[sourceId]) {
    teamUsage[currentTeamId].days[formattedDay].agents[agentId].sources[sourceId] = {};
  }

  // teamUsage[currentTeamId].days[formattedDay].agents[agentId].sources[sourceId][usageClass] = { units, cost };
  const existing = teamUsage[currentTeamId].days[formattedDay].agents[agentId].sources[sourceId][usageClass];
  if (existing) {
    existing.units += units;
    existing.cost += cost;
  } else {
    teamUsage[currentTeamId].days[formattedDay].agents[agentId].sources[sourceId][usageClass] = { units, cost };
  }

  if (!teamUsage[currentTeamId].costs[usageClass]) {
    teamUsage[currentTeamId].costs[usageClass] = 0;
  }
  teamUsage[currentTeamId].costs[usageClass] += cost;

  return teamUsage;
};

export const processTaskStatsRecord = (teamUsage: any, record: any) => {
  const { teamId, day, agentId, _sum } = record;

  // Initialize teamId object if it doesn't exist
  if (!teamUsage[teamId]) {
    teamUsage[teamId] = {
      days: {},
    };
  }

  const formattedDay = new Date(day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  // Initialize the nested structure directly under days
  if (!teamUsage[teamId].days[formattedDay]) {
    teamUsage[teamId].days[formattedDay] = {
      agents: {},
    };
  }

  if (!teamUsage[teamId].days[formattedDay].agents[agentId]) {
    teamUsage[teamId].days[formattedDay].agents[agentId] = {
      tasks: 0,
    };
  }

  // Update the tasks count
  teamUsage[teamId].days[formattedDay].agents[agentId].tasks += _sum.number;

  return teamUsage;
};

export const calculateBillingCycleDates = (now: Date, billingDay: number) => {
  let cycleStart: Date;
  let cycleEnd: Date;

  if (now.getUTCDate() >= billingDay) {
    // Current cycle: this month's billing day to next month's billing day - 1
    cycleStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), billingDay));
    cycleEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, billingDay - 1)); // Ends on the 5th
  } else {
    // Previous cycle: last month's billing day to this month's billing day - 1
    cycleStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, billingDay));
    cycleEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), billingDay - 1)); // Ends on the 5th
  }

  return { start: cycleStart, end: cycleEnd };
};
