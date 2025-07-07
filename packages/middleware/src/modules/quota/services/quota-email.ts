import { mailService } from '../../mail/services';
import { LOGGER } from '../../../../config/logging';
import { addDays, format } from 'date-fns';
import { prisma } from '../../../../prisma/prisma-client';
import { _TEAM_SETTINGS_KEYS } from '../../team/constants';
import { getTeamOwner } from '../../team/services/team.service';
import { config } from '../../../../config/config';

// Format as "February 1, 2024"
const formatDate = (date: Date) => format(date, 'MMMM d, yyyy');

// this function will send emails to V4 plans only
/* this funtion will send email to free plans and only those paid plans which have billing limit enabled */
export const sendEmailQuotaReached = async (
  teamId: string,
  planName: string,
  totalUsage: number,
  freeCredits: number,
  billingStartDate: string,
  billingEndDate: string,
) => {
  const plansList = ['smythos free', 'builder', 'startup', 'scaleup', 'enterprise t1', 'enterprise t2', 'enterprise t3', 'enterprise t4'];
  const isFreePlan = planName.toLowerCase().includes('smythos free');

  let maxUsage = freeCredits;

  const today = new Date();
  const startDate = new Date(billingStartDate);
  const endDate = new Date(billingEndDate);

  if (!planName) {
    LOGGER?.info?.('sendEmailQuotaReached: Plan name not found');
    return false;
  }

  if (!teamId) {
    LOGGER?.info?.('sendEmailQuotaReached: Team ID not found');
    return false;
  }

  if (!totalUsage) {
    LOGGER?.info?.('sendEmailQuotaReached: Current value not found');
    return false;
  }

  if (startDate > today || endDate < today) {
    LOGGER.error('sendEmailQuotaReached: Invalid billing period');
    return false;
  }

  try {
    // only send emails to v4 plans
    if (!plansList.includes(planName.toLowerCase())) {
      return false;
    }

    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
      select: {
        id: true,
        name: true,
        parentId: true,
      },
    });

    const teamIdToUse = team?.parentId ? team?.parentId : teamId;

    if (!isFreePlan) {
      const billingLimitSetting = await prisma.teamSetting.findFirst({
        where: {
          settingKey: _TEAM_SETTINGS_KEYS.BILLING_LIMIT,
          teamId: teamIdToUse,
        },
        select: {
          id: true,
          settingKey: true,
          settingValue: true,
          updatedAt: true,
        },
      });
      const billingLimit = JSON.parse(billingLimitSetting?.settingValue || '{}');
      if (billingLimit?.isLimitEnabled) {
        maxUsage = billingLimit?.limitValue || maxUsage;
      } else {
        // if it is a paid plan and billing limit is not enabled, then we should not send an email
        return;
      }
    }

    const shouldSendEmail = (totalUsage * 100) / maxUsage >= 80;

    if (!shouldSendEmail) {
      // email will not sent if usage is less than 80%
      return false;
    }

    // isPartial is true (it means email is sent for 80% of the usage)
    // isPartial is false (it means email is sent for 100% of the usage)
    const isPartial = totalUsage < maxUsage;

    const sentQuotaReachedEmailSetting = await prisma.teamSetting.findFirst({
      where: {
        settingKey: _TEAM_SETTINGS_KEYS.HAS_SENT_QUOTA_REACHED_EMAIL,
        teamId: teamIdToUse,
      },
      select: {
        id: true,
        settingKey: true,
        settingValue: true,
        updatedAt: true,
      },
    });
    const sentQuotaReachedEmailValue = JSON.parse(sentQuotaReachedEmailSetting?.settingValue || '{}');

    if (
      sentQuotaReachedEmailValue.billingStartDate === billingStartDate &&
      sentQuotaReachedEmailValue.billingEndDate === billingEndDate &&
      sentQuotaReachedEmailValue.isPartial === isPartial
    ) {
      // email has already been sent for the same billing period
      return false;
    }

    const settingValue = {
      billingStartDate,
      billingEndDate,
      isPartial,
      totalUsage,
      maxUsage,
    };

    // Convert to JSON string when saving
    const hasSentSettingValue = JSON.stringify(settingValue);

    if (sentQuotaReachedEmailSetting?.id) {
      await prisma.teamSetting.update({
        where: {
          id: sentQuotaReachedEmailSetting.id,
        },
        data: {
          settingValue: hasSentSettingValue,
        },
        select: {
          id: true,
          settingKey: true,
          settingValue: true,
          updatedAt: true,
        },
      });
    } else {
      await prisma.teamSetting.create({
        data: {
          team: { connect: { id: teamIdToUse } },
          settingKey: _TEAM_SETTINGS_KEYS.HAS_SENT_QUOTA_REACHED_EMAIL,
          settingValue: hasSentSettingValue,
        },
        select: {
          id: true,
          settingKey: true,
          settingValue: true,
          updatedAt: true,
        },
      });
    }

    const owner = await getTeamOwner({ teamId: teamIdToUse, ctx: { tx: prisma } });
    if (!owner?.email) {
      LOGGER.error('sendEmailQuotaReached: Team owner email not found');
      return false;
    }

    const templateData = {
      firstName: owner?.name,
      userEmail: owner?.email,
      planName,
      isPartial,
      isFreePlan,
      nextBillingCycleStartAt: formatDate(addDays(new Date(billingEndDate), 1)),
      nextPlanName: plansList[plansList.indexOf(planName.toLowerCase()) + 1],
    };

    await mailService.sendTemplateMail({
      template: mailService.templates.quotaReached,
      to: owner?.email,
      ...(config.variables.env === 'production' && {
        bcc: ['river@smythos.com', 'timmy@smythos.com', 'tejas@smythos.com', '20645624@bcc.hubspot.com'],
      }),
      subject: isPartial ? "You're nearing your SmythOS billing limit" : 'Your SmythOS service has been paused',
      templateData,
    });

    return true;
  } catch (error) {
    LOGGER.error('Failed to send email', error);
    return false;
  }
};
