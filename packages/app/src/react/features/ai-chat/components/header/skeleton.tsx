import { cn } from '@src/react/shared/utils/general';
import { FC } from 'react';

export const Skeleton: FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      'bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 animate-pulse',
      className,
    )}
  />
);
