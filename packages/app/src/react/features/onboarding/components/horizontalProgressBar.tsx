import { FC } from 'react';

interface HorizontalProgressBarProps {
  progress: number; // Progress out of 100
}

const HorizontalProgressBar: FC<HorizontalProgressBarProps> = ({ progress }) => {
  return (
    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-2 bg-green-400 rounded-full transition-all duration-1000 ease-linear"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export default HorizontalProgressBar;
