import httpStatus from 'http-status';
import { prisma } from '../../../../prisma/prisma-client';
import { LOGGER } from '../../../../config/logging';
import { PrismaTransaction, Transactional } from '../../../../types';
import { mailService } from '../../mail/services';
import * as quotaUtils from '../../quota/utils';
import { stripe } from '../../../lib/payments';
import ApiError from '../../../utils/apiError';
import errKeys from '../../../utils/errorKeys';
import { teamService } from '../../team/services';
import * as dateFns from 'date-fns';

import Stripe from 'stripe';
import { captureSignupReferral } from '../../marketing/services/firstPromoter';
import { PRISMA_ERROR_CODES } from '../../../utils/general';
// import businessCustomMetrics from '../../../metrices/custom/business.custom.metrices';

export const syncUserDetails = async (
  dbUser: {
    id: number;
    email: string;
    teamId: string | null;
    avatar: string | null;
    name: string | null;
  },
  oauthData: {
    avatar?: string | null;
    name?: string | null;
  },
) => {
  // first, check if any of the user's details have changed
  const updateFields: any = {};

  if (dbUser.name !== oauthData.name) {
    updateFields.name = oauthData.name;
  }

  if (dbUser.avatar !== oauthData.avatar) {
    updateFields.avatar = oauthData.avatar;
  }

  // if all the details are up to date, return
  if (Object.keys(updateFields).length === 0) {
    return;
  }

  await prisma.user.update({
    where: {
      id: dbUser.id,
    },
    data: updateFields,
  });
};

export const getUserInfoById = async ({
  userId,
  teamId,
  referralHeaders,
  ctx,
}: Transactional<{
  userId: number;
  teamId: string;
  referralHeaders: {
    tid: string | undefined;
    refId: string | undefined;
  };
}>) => {
  const _tx = ctx?.tx ?? prisma;

  const user = await _tx.user.findUniqueOrThrow({
    where: {
      id: userId,
    },
    select: {
      id: true,
      email: true,
      avatar: true,
      name: true,
      createdAt: true,

      team: {
        select: {
          name: true,
          id: true,
          referredBy: true,
          parentId: true,
        },
      },

      userTeamRole: {
        select: {
          isTeamInitiator: true,
          userSpecificAcl: true,
          sharedTeamRole: {
            select: {
              canManageTeam: true,
              acl: true,
              name: true,
              id: true,

              team: {
                select: {
                  name: true,
                  id: true,
                  parentId: true,
                  referredBy: true,
                },
              },
            },
          },
        },
      },

      // teamMemberships: {
      //   select: {
      //     isTeamInitiator: true,
      //     userSpecificAcl: true,
      //     sharedTeamRole: {
      //       select: {
      //         canManageTeam: true,
      //         acl: true,
      //         name: true,
      //         id: true,

      //         team: {
      //           select: {
      //             name: true,
      //             id: true,
      //             parentId: true,
      //           },
      //         },
      //       },
      //     },
      //   },
      // },
    },
  });

  //* SHOULD ONLY RUN ON PRODUCTION
  const isProduction = process.env.NODE_ENV === 'production';
  const isFreshAccount = dateFns.differenceInHours(new Date(), user.createdAt) < 1; // if the account is less than 1 hour old
  if (referralHeaders.tid && !user.team!.referredBy && isFreshAccount && isProduction) {
    await captureSignupReferral({ email: user.email, tid: referralHeaders.tid })
      .then(() => {
        //* ONLY IF THE REFERRAL ID IS VALID, WE UPDATE THE USER'S TEAM
        LOGGER.info(`User ${user.email} was referred by ${referralHeaders.tid}`);
        return prisma.team.update({
          where: {
            id: user.team!.id,
          },
          data: {
            referredBy: referralHeaders.tid,
          },
        });
      })
      .catch(err => {
        LOGGER.error(`Error capturing referral for user ${user.email}. Error: ${err.message}`);
      });
  }

  // @ts-ignore
  user.roles = user.userTeamRole;
  // @ts-ignore
  user.team = user.userTeamRole.find(role => role.sharedTeamRole.team.id === teamId).sharedTeamRole.team;

  // @ts-ignore
  user.userTeamRole = user.userTeamRole.find(role => role.sharedTeamRole.team.id === teamId);
  // set the current team as the user's team

  return user;
};

export const getUserInfoByIdM2M = async ({ userId }: { userId: number }) => {
  const user = await prisma.user
    .findUniqueOrThrow({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        avatar: true,
        name: true,
        teamId: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    .catch(err => {
      if (err.code === PRISMA_ERROR_CODES.NON_EXISTENT_RECORD) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
      }

      throw err;
    });

  return user;
};

export const getUserByEmail = async ({ email, ctx }: Transactional<{ email: string }>) => {
  const _tx = ctx?.tx ?? prisma;

  const user = await _tx.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      email: true,
      teamId: true,
      avatar: true,
      name: true,
    },
  });

  return user;
};

export const createUserAndTeam = async ({ userInfo, ctx }: Transactional<{ userInfo: { email: string; name?: string; avatar?: string } }>) => {
  // create a new user and team

  const operations = async (tx: PrismaTransaction) => {
    // check if the free plan exists //! THIS IS A TEMPORARY SOLUTION.
    let freePlan = await tx.plan.findFirst({
      where: {
        isDefaultPlan: true,
      },
      select: {
        id: true,
      },
    });

    if (!freePlan) {
      LOGGER.info(`FREE PLAN DOESN'T EXIST. CREATING...`);
      freePlan = await tx.plan.create({
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

    const team = await tx.team.create({
      data: {
        name: userInfo.name ? `${userInfo.name}'s Team` : 'My Team',

        subscription: {
          create: {
            startDate: new Date(),
            stripeId: '',
            status: 'ACTIVE',
            plan: {
              connect: {
                id: freePlan.id,
              },
            },
          },
        },
      },
      select: {
        id: true,
      },
    });

    const userRecord = await tx.user.create({
      data: {
        email: userInfo.email,
        name: userInfo.name,
        avatar: userInfo.avatar,
        team: {
          connect: {
            id: team.id,
          },
        },
      },

      select: {
        id: true,
        email: true,
        teamId: true,
        avatar: true,
        name: true,
      },
    });

    await tx.userTeamRole.create({
      data: {
        isTeamInitiator: true,
        user: {
          connect: {
            id: userRecord.id,
          },
        },

        sharedTeamRole: {
          create: {
            name: 'Super Admin',
            isOwnerRole: true,
            canManageTeam: true,
            team: {
              connect: {
                id: team.id,
              },
            },
          },
        },
      },

      select: undefined,
    });

    return userRecord;
  };

  const user = await (ctx?.tx ? operations(ctx.tx) : prisma.$transaction(operations, { timeout: 10_000 }));

  // businessCustomMetrics.userSignupCounter.inc();

  return user;
};

export const findOrCreateUser = async ({ email, name, avatar }: { email: string; name?: string | null; avatar?: string | null }) => {
  let isNewUser = false;

  const user = await prisma.$transaction(
    async tx => {
      // const existingUser = await getUserByEmail({ email, ctx: { tx } });
      const existingUser = await tx.user.findUnique({
        where: {
          email,
        },
        select: {
          id: true,
          email: true,
          teamId: true,
          avatar: true,
          name: true,
        },
      });
      if (existingUser) {
        await syncUserDetails(existingUser, { name, avatar });
        return existingUser;
      }

      isNewUser = true;
      LOGGER.info(`USER ${email} DOESN'T EXIST. CREATING...`);
      const newRecord = await createUserAndTeam({
        userInfo: {
          email,
          name: name ?? undefined,
          avatar: avatar ?? undefined,
        },
        ctx: { tx },
      });

      return newRecord;
    },
    {
      timeout: 100_000, // take as much time as you need (CRITICAL TASK)
    },
  );

  // if (isNewUser) {
  //   // send welcome email
  //   const nameStr = name;
  // }

  return user;
};

export const deleteAccount = async ({ userId, teamId, email, ctx }: Transactional<{ userId: number; email: string; teamId: string }>) => {
  /**
    Currently, we are handling the deletion of the user's account by doing the following:
    1. Appending @DELETED_{{timestamp}} to the user's email. This will make the user's email invalid and the user won't be able to login.
    2. A cron job will run every X days to delete all users with @DELETED_{{timestamp}} in their email (not implemented yet)
    TODO: implement the cron job to delete the user's data from the database.


    Question: how will just appending @DELETED_{{timestamp}} to the email serve as a deletion?
    - when the user tries to login, a new user entry will be created since the email doesn't exist in the database. 
    so it doesn't really delete the user's data, but it makes it inaccessible to the user until the cron job runs to delete the user's data. 
   */

  /*
    Prerequisites for allowing the user to delete their account:
    - The user should not have any active subscriptions (if the user requested to cancel their subscription, we can detect that and allow the user to delete their account)
    - The user needs to be the ONLY user in the team.
    
    */

  const runOperations = async (tx: PrismaTransaction) => {
    const teamOwner = await teamService.getTeamOwner({ teamId, ctx: { tx } });

    if (teamOwner.id !== userId) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'You cannot delete your account because you are not the owner of this team.',
        errKeys.TEAM_OWNER_ONLY_ACTION,
      );
    }

    const team = await tx.team.findUniqueOrThrow({
      where: {
        id: teamId,
      },
      select: {
        externalCustomerId: true,
        // subscription: {
        //   select: {
        //     object: true,
        //   },
        // },

        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (team._count.users > 1) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'You cannot delete your account while there are other users in the team.', 'TEAM_HAS_OTHER_USERS');
    }

    if (team.externalCustomerId) {
      const stripeSubscriptions = await stripe.subscriptions.list({
        customer: team.externalCustomerId,
        limit: 1,
      });
      // const stripeObj = team.subscription.object as unknown as Stripe.Subscription;
      const stripeObj = stripeSubscriptions.data[0];

      if (stripeObj && stripeObj.status === 'active') {
        // if he REQUESTED to cancel his subscription, we can allow him to delete his account
        // BUT we need to cancel the subscription now
        if (!stripeObj.cancel_at_period_end) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'You cannot delete your account while you have an active subscription.',
            errKeys.HAS_ACTIVE_SUBSCRIPTION,
          );
        }

        await stripe.subscriptions.cancel(stripeObj.id);
      }
    }

    await tx.user.update({
      where: {
        id: userId,
      },
      data: {
        email: `${email}@DELETED_${Date.now()}`,
      },
      select: null,
    });

    return true;
  };

  const res = ctx?.tx ? await runOperations(ctx.tx) : await prisma.$transaction(runOperations, { timeout: 120_000 });

  await mailService.sendMail({
    to: email,
    subject: 'Account Deletion',
    body: `Your account has been marked for deletion. If you didn't request this, please contact support.`,
  });

  return res;
};
