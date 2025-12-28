import { cn } from '@src/react/shared/utils/general';
import { FC } from 'react';
import { Skeleton } from '..';

interface IProps {
  name: string | undefined;
  isAgentLoading: boolean;
  isSettingsLoading: boolean;
}

export const AgentName: FC<IProps> = ({ name, isAgentLoading, isSettingsLoading }) => {
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
