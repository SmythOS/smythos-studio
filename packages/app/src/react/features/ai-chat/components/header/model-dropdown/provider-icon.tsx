import { FC, useState } from 'react';

import { cn } from '@react/shared/utils/general';

interface IProps {
  provider: string;
  className?: string;
}

export const ProviderIcon: FC<IProps> = ({ provider, className = 'size-5 rounded-full' }) => {
  const [hasError, setHasError] = useState<boolean>(false);

  if (hasError) {
    return (
      <div
        className={cn(
          className,
          'bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center',
        )}
      >
        <span className="text-white text-xs font-semibold">AI</span>
      </div>
    );
  }

  return (
    <img
      className={className}
      alt={`${provider} icon`}
      onError={() => setHasError(true)}
      src={`/img/provider_${provider.toLowerCase()}.svg`}
    />
  );
};
