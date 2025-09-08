import { cn } from '@react/shared/utils/general';

export const CloseIcon = ({ className }: { className?: string }) => (
  <svg className={cn('size-6', className)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
