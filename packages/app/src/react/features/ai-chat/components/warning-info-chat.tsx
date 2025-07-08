import { FC } from 'react';

interface WarningInfoProps {
  infoMessage: string;
}

export const WarningInfo: FC<WarningInfoProps> = ({ infoMessage }) => (
  <div className="py-4 flex justify-center">
    <span className="text-xs text-gray-500">{infoMessage}</span>
  </div>
);
