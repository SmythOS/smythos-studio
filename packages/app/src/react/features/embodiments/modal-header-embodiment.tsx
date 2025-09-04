import * as React from 'react';
import { BackButtonWithTail, CloseIcon } from '../../shared/components/svgs';

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
  /**
   * Whether to show the back button.
   */
  showBackButton?: boolean;
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
  showBackButton = true,
}) => {
  return (
    <div className={`relative mb-4 ${className}`}>
      {/* Title */}
      <div className={`mt-[-7px] pr-8 ${showBackButton ? 'pl-8' : ''}`}>
        <span className="block text-xl font-semibold leading-tight text-[#1E1E1E] text-left">
          {title}
        </span>
      </div>
      {/* Back button */}
      {showBackButton && (
        <button
          className="absolute -left-2 -top-2 p-[6px] text-[#222] hover:bg-gray-100 rounded"
          onClick={onBack}
          aria-label="Back"
          style={{ lineHeight: 0 }}
        >
          <BackButtonWithTail width={16} height={14} />
        </button>
      )}
      {/* Close button */}
      <button
        className="absolute -right-2 -top-2 p-2 text-[#222] hover:bg-gray-100 rounded"
        onClick={onClose}
        aria-label="Close"
      >
        <CloseIcon width={16} height={16} />
      </button>
    </div>
  );
};

export default ModalHeaderEmbodiment;
