import ApiError from '../../../utils/apiError';
import { prisma } from '../../../../prisma/prisma-client';

export async function getSettings(teamId: string): Promise<any[]> {
  return prisma.teamSetting.findMany({
    where: { teamId },
    select: {
      id: true,
      settingKey: true,
      settingValue: true,
      updatedAt: true,
    },
  });
}

export async function createSetting(teamId: string, settingKey: string, settingValue: string): Promise<any> {
  const existingSetting = await prisma.teamSetting.findFirst({
    where: {
      settingKey,
      teamId,
    },
  });

  if (existingSetting) {
    return prisma.teamSetting.update({
      where: {
        id: existingSetting.id,
      },
      data: {
        settingValue,
      },

      select: {
        id: true,
        settingKey: true,
        settingValue: true,
        updatedAt: true,
      },
    });
  }

  return prisma.teamSetting.create({
    data: {
      team: { connect: { id: teamId } },
      settingKey,
      settingValue,
    },

    select: {
      id: true,
      settingKey: true,
      settingValue: true,
      updatedAt: true,
    },
  });
}

export async function getSetting(teamId: string, settingKey: string): Promise<any> {
  const setting = await prisma.teamSetting.findFirst({
    where: {
      settingKey,
      teamId,
    },

    select: {
      id: true,
      settingKey: true,
      settingValue: true,
      updatedAt: true,
    },
  });

  if (!setting) {
    throw new ApiError(404, 'Setting not found');
  }

  return setting;
}

export async function deleteSetting(teamId: string, settingKey: string) {
  const deleted = await prisma.teamSetting.deleteMany({
    where: {
      teamId,
      settingKey,
    },
  });

  if (deleted.count === 0) {
    throw new ApiError(404, 'Setting not found');
  }

  return deleted;
}
