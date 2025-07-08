import * as React from 'react';
import { BackButtonWithTail, CloseIconWithoutPadding } from '../../shared/components/svgs';

/**
 * Props for the ModalHeaderEmbodiment component.
 */
export interface ModalHeaderEmbodimentProps {
  /**
   * The title to display in the header. Can be a string or JSX element.
   */
  title: React.ReactNode;
  /**
   * Callback when the back button is clicked.
   */
  onBack: () => void;
  /**
   * Callback when the close button is clicked.
   */
  onClose: () => void;
  /**
   * Additional CSS classes for the header container.
   */
  className?: string;
}

/**
 * Reusable modal header component for embodiment modals.
 * Provides consistent styling and layout for title, back button, and close button.
 *
 * @param {ModalHeaderEmbodimentProps} props - The component props.
 * @returns {JSX.Element} The rendered modal header.
 */
const ModalHeaderEmbodiment: React.FC<ModalHeaderEmbodimentProps> = ({
  title,
  onBack,
  onClose,
  className = '',
}) => {
  return (
    <div className={`relative mb-4 ${className}`}>
      {/* Title */}
      <div className="mt-[-7px] pl-8 pr-8">
        <span className="block text-lg font-semibold leading-tight text-[#222] text-left">
          {title}
        </span>
      </div>
      {/* Back button */}
      <button
        className="absolute -left-2 -top-2 p-[6px] text-[#222] hover:bg-gray-100 rounded"
        onClick={onBack}
        aria-label="Back"
        style={{ lineHeight: 0 }}
      >
        <BackButtonWithTail width={16} height={14} />
      </button>
      {/* Close button */}
      <button
        className="absolute -right-2 -top-2 p-[6px] text-[#222] hover:bg-gray-100 rounded"
        onClick={onClose}
        aria-label="Close"
      >
        <CloseIconWithoutPadding width={12} height={12} />
      </button>
    </div>
  );
};

export default ModalHeaderEmbodiment; 