import { Alert } from 'flowbite-react';
import { FC } from 'react';
import { FaExclamationCircle } from 'react-icons/fa';

type Props = { errorMsg?: string; fullWidth?: boolean; onClose?: () => void };
const ApiErrorLine: FC<Props> = ({ errorMsg = 'Something went wrong', fullWidth, onClose }) => (
  <div className="flex items-center justify-center h-full">
    <Alert color="failure" className={fullWidth ? 'w-full' : 'w-64'} onDismiss={onClose}>
      <div className="flex items-center">
        <FaExclamationCircle className="mr-2" color="red" />
        <span className="text-red-500">{errorMsg}</span>
      </div>
    </Alert>
  </div>
);

export default ApiErrorLine;
