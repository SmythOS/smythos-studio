import { FC } from 'react';
import { Skeleton } from '..';
import { DEFAULT_AVATAR_URL } from '../../constants';

interface AgentAvatarProps {
  avatar: string | undefined;
  isLoading: boolean;
}

export const AgentAvatar: FC<AgentAvatarProps> = ({ avatar, isLoading }) => (
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
