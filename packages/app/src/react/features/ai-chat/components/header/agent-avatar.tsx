import { FC } from 'react';
import { Skeleton } from '@react/features/ai-chat/components';
import { DEFAULT_AVATAR_URL } from '@react/features/ai-chat/constants';

type TAgentAvatarProps = {
  avatar: string | undefined;
  isLoading: boolean;
};

export const AgentAvatar: FC<TAgentAvatarProps> = ({ avatar, isLoading }) => (
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

