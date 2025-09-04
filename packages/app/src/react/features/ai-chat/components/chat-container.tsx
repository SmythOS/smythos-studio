import { FC, ReactNode } from 'react';

type IChildren = { children: ReactNode };
export const ChatContainer: FC<IChildren> = ({ children }) => (
  <div className="w-full h-full max-w-4xl flex flex-col items-center justify-end px-4 md:px-0 ph-no-capture mx-auto relative">
    {children}
  </div>
);
