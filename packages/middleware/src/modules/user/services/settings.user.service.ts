import { UserSetting } from '@prisma/client';
import ApiError from '../../../utils/apiError';
import { prisma } from '../../../../prisma/prisma-client';

export async function getSettings(userId: number): Promise<UserSetting[]> {
  return prisma.userSetting.findMany({ where: { userId } });
}

export async function createSetting(userId: number, settingKey: string, settingValue: string): Promise<UserSetting> {
  const existingSetting = await prisma.userSetting.findFirst({
    where: {
      settingKey,
      userId,
    },
  });

  if (existingSetting) {
    return prisma.userSetting.update({
      where: {
        id: existingSetting.id,
      },
      data: {
        settingValue,
      },
    });
  }

  return prisma.userSetting.create({
    data: {
      user: { connect: { id: userId } },
      settingKey,
      settingValue,
    },
  });
}

export async function getSetting(userId: number, settingKey: string): Promise<UserSetting> {
  const setting = await prisma.userSetting.findFirst({
    where: {
      settingKey,
      userId,
    },
  });

  if (!setting) {
    throw new ApiError(404, 'Setting not found');
  }

  return setting;
}

export async function deleteSetting(userId: number, settingKey: string) {
  const deleted = await prisma.userSetting.deleteMany({
    where: {
      userId,
      settingKey,
    },
  });

  if (deleted.count === 0) {
    throw new ApiError(404, 'Setting not found');
  }

  return deleted;
}
