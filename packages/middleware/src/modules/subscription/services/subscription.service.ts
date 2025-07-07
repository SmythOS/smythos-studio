/* eslint-disable no-nested-ternary */
import { Transactional } from '../../../../types/service.type';
import httpStatus from 'http-status';
import { prisma } from '../../../../prisma/prisma-client';
import ApiError from '../../../utils/apiError';
import { PrismaTransaction } from '../../../../types';
import * as quotaUtils from '../../quota/utils';
import { startOfMonth, addMonths } from 'date-fns';
import { createLogger } from '../../../../config/logging-v2';

const LOGGER = createLogger('subscription.service.ts');

export const getTeamSubs = async (teamId: string, options?: { tx?: PrismaTransaction }, includeObject?: boolean) => {
  const _p = options?.tx || prisma;

  const team = await _p.team.findFirst({
    where: {
      id: teamId,
    },

    select: {
      subscriptionId: true,
      id: true,
    },
  });

  if (!team) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Team not found');
  }

  if (!team.subscriptionId) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Team does not have a subscription');
  }

  // RESET date will be the first day of the next month
  const resetTasksDate = startOfMonth(addMonths(new Date(), 1));

  const subs = await _p.subscription.findFirst({
    where: {
      id: team.subscriptionId,
    },

    select: {
      id: true,
      stripeId: true,
      status: true,
      properties: true,
      endDate: true,
      startDate: true,
      plan: {
        select: {
          id: true,
          name: true,
          price: true,
          stripeId: true,
          priceId: true,
          properties: true,
          paid: true,
          isCustomPlan: true,
          isDefaultPlan: true,
          friendlyName: true,
        },
      },
      ...(includeObject ? { object: true } : {}),
    },
  });

  if (subs.plan?.friendlyName) {
    subs.plan.name = subs.plan.friendlyName; // for backward compatibility
  }

  return {
    ...subs,
    object: {},
    resetDate: resetTasksDate,
  };
};

export const retrieveDefaultPlan = async ({ ctx }: Transactional) => {
  const _tx = ctx?.tx || prisma;

  let freePlan = await _tx.plan.findFirst({
    where: {
      isDefaultPlan: true,
    },
    select: {
      id: true,
    },
  });

  if (!freePlan) {
    LOGGER.info(`FREE PLAN DOESN'T EXIST. CREATING...`);
    freePlan = await _tx.plan.create({
      data: {
        name: 'Free',
        price: 0,
        paid: false,
        isDefaultPlan: true,
        stripeId: 'no-id',
        priceId: 'no-id',
        properties: quotaUtils.buildDefaultPlanProps(),
      },
      select: {
        id: true,
      },
    });
  }

  return freePlan;
};
