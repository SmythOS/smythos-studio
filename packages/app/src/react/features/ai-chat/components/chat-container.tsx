import { FC, ReactNode } from 'react';

interface IChildren {
  children: ReactNode;
}

export const ChatContainer: FC<IChildren> = ({ children }) => (
  <div className="w-full h-full flex flex-col items-center justify-end px-4 md:px-0 ph-no-capture">
    {children}
  </div>
);
