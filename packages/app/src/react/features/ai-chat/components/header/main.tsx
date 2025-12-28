import { useQuery } from '@tanstack/react-query';
import { FC } from 'react';

import { Skeleton } from '@react/features/ai-chat/components';
import { DEFAULT_AVATAR_URL } from '@react/features/ai-chat/constants';
import { useChatStores } from '@react/features/ai-chat/hooks';
import { cn } from '@react/shared/utils/general';

import { HeaderActions } from './header-actions';
import { ModelDropdown } from './model-dropdown';

interface ModelAgent {
  id: string;
  name: string;
  avatar: string;
  description: string;
}

const fetchModelAgents = async (): Promise<ModelAgent[]> => {
  const response = await fetch('/api/page/agents/models');
  const data = await response.json();
  return data.agents;
};

export const Header: FC = () => {
  const { agent: agentData, chat, modelOverride, setModelOverride } = useChatStores() || {};

  const { data: agent, settings, isLoading } = agentData || {};
  const avatar = settings?.avatar;

  const { data: modelAgents } = useQuery<ModelAgent[]>({
    queryKey: ['modelAgents'],
    queryFn: fetchModelAgents,
    refetchOnWindowFocus: false,
  });

  const isModelAgent = modelAgents?.some((modelAgent) => modelAgent.id === agent?.id) ?? false;
  const currentModel = modelOverride || settings?.chatGptModel || '';

  return (
    <div className="w-full bg-white border-b border-[#e5e5e5] h-14 flex justify-center absolute top-0 left-0 z-10 px-2.5 lg:px-0">
      <div className="w-full max-w-4xl flex justify-between items-center">
        <div className="w-full flex items-center gap-3">
          <AgentAvatar avatar={avatar} isLoading={isLoading.settings} />

          <div className="flex items-start justify-center flex-col w-full">
            <AgentName
              name={agent?.name}
              isAgentLoading={isLoading.agent}
              isSettingsLoading={isLoading.settings}
            />

            <div className="flex items-center group w-full">
              {isLoading.settings ? (
                <Skeleton className="w-25 h-4 rounded rounded-t-none" />
              ) : (
                <ModelDropdown
                  currentModel={currentModel}
                  isModelAgent={isModelAgent}
                  isDisabled={isLoading.agent || isLoading.settings}
                  onModelChange={setModelOverride}
                />
              )}
            </div>
          </div>
        </div>

        <HeaderActions onNewChat={() => chat.resetSession()} />
      </div>
    </div>
  );
};

interface AgentAvatarProps {
  avatar: string | undefined;
  isLoading: boolean;
}

const AgentAvatar: FC<AgentAvatarProps> = ({ avatar, isLoading }) => (
  <figure>
    {isLoading ? (
      <Skeleton className="size-8 rounded-full" />
    ) : (
      <img
        src={avatar ?? DEFAULT_AVATAR_URL}
        alt="avatar"
        className="size-8 rounded-full transition-opacity duration-300 ease-in-out"
      />
    )}
  </figure>
);

interface AgentNameProps {
  name: string | undefined;
  isAgentLoading: boolean;
  isSettingsLoading: boolean;
}

const AgentName: FC<AgentNameProps> = ({ name, isAgentLoading, isSettingsLoading }) => {
  if (isAgentLoading) {
    return (
      <Skeleton className={cn('w-25 h-[18px] rounded', isSettingsLoading && 'rounded-b-none')} />
    );
  }

  return (
    <span className="text-lg font-medium text-[#111827] transition-opacity duration-300 ease-in-out leading-none">
      {name ?? 'Unknown Agent'}
    </span>
  );
};
