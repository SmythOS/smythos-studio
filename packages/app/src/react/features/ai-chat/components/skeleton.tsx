import { TClassName } from '@react/features/ai-chat/types';
import { cn } from '@react/shared/utils/general';
import { FC } from 'react';

export const Skeleton: FC<TClassName> = ({ className }) => (
  <div
    className={cn(
      'bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 animate-pulse',
      className,
    )}
  />
);
