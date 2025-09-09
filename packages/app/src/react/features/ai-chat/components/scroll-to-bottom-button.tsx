import { FC } from 'react';
import { FaArrowDown } from 'react-icons/fa6';

interface ScrollToBottomButtonProps {
  onClick: () => void;
}

export const ScrollToBottomButton: FC<ScrollToBottomButtonProps> = ({ onClick }) => (
  <div className="w-full max-w-4xl flex justify-center items-center fixed bottom-32 md:bottom-28 z-10">
    <button
      className="bg-white border border-solid border-black border-opacity-10 text-gray-900 rounded-full p-2 shadow-lg hover:bg-gray-50 transition-colors duration-200"
      onClick={onClick}
      aria-label="Scroll to bottom"
    >
      <FaArrowDown size={12} />
    </button>
  </div>
);
