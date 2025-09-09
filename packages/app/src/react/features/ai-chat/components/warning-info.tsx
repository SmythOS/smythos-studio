import { FC } from 'react';

interface WarningInfoProps {
  infoMessage: string;
}

export const WarningInfo: FC<WarningInfoProps> = ({ infoMessage }) => (
  <h6 className="py-4 text-center text-xs text-gray-500">{infoMessage}</h6>
);
