import { FC } from 'react';

type SectionTitleProps = {
  className?: string; // Additional CSS classes
  title: string; // The text content for the title
  subtitle?: string; // Optional subtitle
};

const SectionHeader: FC<SectionTitleProps> = ({ title, subtitle }) => (
  <div className="w-full">
    <h3 className="font-semibold mb-1 text-sm">{title}</h3>
    {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
  </div>
);

export default SectionHeader;
