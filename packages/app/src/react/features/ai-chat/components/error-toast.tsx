import { FC } from 'react';
import { FaCircleExclamation } from 'react-icons/fa6';
import { CloseIcon } from './icons';

interface ErrorToastProps {
  message: string;
  onClose: () => void;
}

export const ErrorToast: FC<ErrorToastProps> = ({ message, onClose }) => (
  <div
    className="bg-[#FEFBED] border border-solid border-[#FAEBA8] flex items-center justify-between max-w-full min-h-[42px] rounded-md p-3" // eslint-disable-line max-len
  >
    <div className="flex items-center gap-1.5">
      <div className="flex-shrink-0">
        <FaCircleExclamation style={{ color: '#88451D' }} />
      </div>
      <span className="text-[#88451D] text-xs font-normal">{message}</span>
    </div>
    <button
      onClick={onClose}
      className="flex items-center border-none outline-none bg-transparent cursor-pointer ml-3"
    >
      <CloseIcon className="text-[#88451D]" />
    </button>
  </div>
);
