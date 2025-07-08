import {
  AgentContributor,
  AgentPermissions,
  IAgent,
} from '@react/features/agents/components/agentCard/types';
import { EAgentSettings, TAgentSettings } from '@react/features/agents/types/agents.types';
import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { format } from 'date-fns';
import { useMemo } from 'react';

const DEFAULT_AVATAR = '/img/user_default.svg';

export const convertDateToUserTimeZone = (date: string | number | Date) => {
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const userTimeZoneDate = new Date(date).toLocaleString('en-US', { timeZone: userTimeZone });
  return format(new Date(userTimeZoneDate), 'MMMM dd, yyyy hh:mm a');
};

export const getAgentFallbackDescription = (
  userName: string,
  createdAt: string | number | Date,
): string => {
  return `${userName}'s Agent - ${convertDateToUserTimeZone(createdAt)}`;
};

interface UseAgentDataProps {
  agent: IAgent;
}

interface UseAgentDataResult {
  avatarImage: string;
  agentOwner: AgentContributor | undefined;
  userName: string;
  description: string;
  permissions: AgentPermissions;
  isAvailable: boolean;
  isPrivilegedUser: boolean;
  flatSettings: TAgentSettings;
}

/**
 * Custom hook for processing agent data and computing derived values
 */
export function useAgentData({ agent }: UseAgentDataProps): UseAgentDataResult {
  const { isEnterpriseUser, isPremiumUser, isStarterUser, isProUser, isCustomUser, getPageAccess } =
    useAuthCtx();

  const isPrivilegedUser = useMemo(
    () => isEnterpriseUser || isPremiumUser || isStarterUser || isProUser || isCustomUser,
    [isEnterpriseUser, isPremiumUser, isStarterUser, isProUser, isCustomUser],
  );

  const permissions = useMemo(
    (): AgentPermissions => ({
      canEdit: getPageAccess('/builder').write,
      canRead: getPageAccess('/builder').read,
      canDelete: getPageAccess('/builder').write,
      canDuplicate: getPageAccess('/builder').write,
    }),
    [getPageAccess],
  );

  const flatSettings = useMemo((): TAgentSettings => {
    const defaultSettings: TAgentSettings = {
      [EAgentSettings.AVATAR]: '',
      [EAgentSettings.DISABLED]: 'false',
    };

    return (
      (agent?.aiAgentSettings?.reduce(
        (acc, setting) => ({ ...acc, [setting.key]: setting.value }),
        defaultSettings,
      ) as TAgentSettings) || defaultSettings
    );
  }, [agent?.aiAgentSettings]);

  const avatarImage = useMemo(
    () => flatSettings?.[EAgentSettings.AVATAR] || DEFAULT_AVATAR,
    [flatSettings],
  );

  const agentOwner = useMemo(
    () => agent?.contributors?.find((contributor) => contributor.isCreator),
    [agent?.contributors],
  );

  const userName = useMemo(
    () => agentOwner?.user?.name || agentOwner?.user?.email || 'User',
    [agentOwner],
  );

  const description = useMemo(
    () => agent.description || getAgentFallbackDescription(userName, agent.createdAt),
    [agent.description, agent.createdAt, userName],
  );

  const isAvailable = useMemo(
    () => (agent?._count?.AiAgentDeployment || 0) > 0,
    [agent?._count?.AiAgentDeployment],
  );

  return {
    avatarImage,
    agentOwner,
    userName,
    description,
    permissions,
    isAvailable,
    isPrivilegedUser,
    flatSettings,
  };
}
