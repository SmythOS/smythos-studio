import { cn } from '@react/shared/utils/general';

export const CloseIcon = ({ className }: { className?: string }) => (
  <svg className={cn('size-6', className)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export const AttachmentIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn('w-[17px] h-4', className)}
    viewBox="0 0 17 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-hidden="true"
  >
    <path
      d="M16.2056 8.33749L10.9576 13.5854C8.73264 15.8096 5.12529 15.8096 2.90114 13.5854C0.676184 11.3605 0.676184 7.75312 2.90114 5.52816L6.55545 1.87466C8.03339 0.395946 10.4291 0.395946 11.907 1.87466C13.3849 3.35176 13.3849 5.74832 11.907 7.22623L8.34251 10.7907C7.59626 11.5369 6.3871 11.5369 5.64086 10.7907C4.89462 10.0444 4.89462 8.83526 5.64086 8.08902L9.00457 4.72527"
      stroke="currentColor"
      strokeWidth="1.24776"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const SendIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn('size-4', className)}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-hidden="true"
  >
    <path
      d="M14.733 0.20215C15.0283 0.420508 15.1833 0.797956 15.1278 1.1754L13.2561 14.1521C13.2123 14.4547 13.0397 14.7199 12.7882 14.8696C12.5367 15.0193 12.2355 15.038 11.9694 14.9195L8.47174 13.3692L6.4685 15.6806C6.20822 15.9832 5.7988 16.083 5.43909 15.9333C5.07939 15.7836 4.84543 15.4124 4.84543 15.0006V12.3928C4.84543 12.268 4.8893 12.1495 4.96826 12.059L9.86963 6.35362C10.0392 6.1571 10.0334 5.85452 9.85793 5.66735C9.68246 5.48019 9.39879 5.46771 9.21455 5.64552L3.26623 11.2823L0.683947 9.90351C0.373956 9.73818 0.175094 9.40752 0.16632 9.03943C0.157547 8.67134 0.338862 8.32821 0.637156 8.14416L13.7387 0.158478C14.0516 -0.0318057 14.4376 -0.0130893 14.733 0.20215Z"
      fill="currentColor"
    />
  </svg>
);