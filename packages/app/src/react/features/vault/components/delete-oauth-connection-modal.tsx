import ConfirmModal from '@src/react/shared/components/ui/modals/ConfirmModal';
import type { DeleteOAuthConnectionModalProps } from '../types/oauth-connection';

export function DeleteOAuthConnectionModal({
  isOpen,
  onClose,
  connection,
  onConfirm,
  isProcessing,
}: DeleteOAuthConnectionModalProps) {
  const handleConfirm = () => {
    if (connection && !isProcessing) {
      onConfirm(connection);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <ConfirmModal
      onClose={onClose}
      label={isProcessing ? 'Deleting...' : 'Delete'}
      handleConfirm={handleConfirm}
      message="Are you sure?"
      lowMsg="This action cannot be undone. This will permanently delete the OAuth connection."
      isLoading={isProcessing}
      width="max-w-[600px] w-[calc(100vw_-_-20px)]"
      confirmBtnClasses="bg-red-600 hover:bg-red-700 text-white"
    />
  );
}
