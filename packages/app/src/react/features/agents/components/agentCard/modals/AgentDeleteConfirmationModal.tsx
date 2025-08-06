import Modal from '@src/react/shared/components/ui/modals/Modal';
import { Button as CustomButton } from '@src/react/shared/components/ui/newDesign/button';

interface AgentDeleteConfirmationModalProps {
  isOpen: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal component for confirming agent deletion
 */
export function AgentDeleteConfirmationModal({
  isOpen,
  isDeleting,
  onConfirm,
  onCancel,
}: AgentDeleteConfirmationModalProps) {
  const handleClose = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    onCancel();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      applyMaxWidth={false}
      panelWidthClasses="max-w-[540px] w-[calc(100vw_-_-20px)]"
      title="Are you sure you want to delete this agent?"
    >
      <div className="mt-6 space-y-6">
        <div className="px-2 pt-4">
          <div className="flex justify-end items-center flex-row gap-2">
            <CustomButton
              className="ml-auto h-[48px] rounded-lg"
              handleClick={onConfirm}
              label={isDeleting ? 'Deleting...' : 'Delete'}
              addIcon
              Icon={<img className="mr-2" src="/img/icons/Delete-White.svg" />}
              disabled={isDeleting}
              isDelete
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
