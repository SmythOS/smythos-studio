/**
 * Delete Datasource Confirmation Dialog
 *
 * Requires user to type datasource label to confirm deletion
 */

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/react/shared/components/ui/dialog';
import { Input } from '@src/react/shared/components/ui/input';
import { Button as CustomButton } from '@src/react/shared/components/ui/newDesign/button';
import { ChangeEvent, FC, useEffect, useState } from 'react';

interface DeleteDatasourceDialogProps {
  isOpen: boolean;
  datasourceName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const DeleteDatasourceDialog: FC<DeleteDatasourceDialogProps> = ({
  isOpen,
  datasourceName,
  onClose,
  onConfirm,
}) => {
  const [confirmText, setConfirmText] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setConfirmText('');
      setError(null);
      setIsDeleting(false);
    }
  }, [isOpen]);

  const handleConfirmTextChange = (e: ChangeEvent<HTMLInputElement>) => {
    setConfirmText(e.target.value);
    setError(null);
  };

  const handleConfirm = async () => {
    if (confirmText !== datasourceName) {
      setError('Datasource name does not match');
      return;
    }

    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // Error handling is done in parent component
      setIsDeleting(false);
    }
  };

  const isValid = confirmText === datasourceName;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Delete Datasource</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-800">
              <strong>Warning:</strong> This action cannot be undone. This will permanently delete
              the datasource and all associated data from the vector database.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-700">
              Please type <strong className="font-semibold text-gray-900">{datasourceName}</strong>{' '}
              to confirm deletion.
            </p>
            <Input
              fullWidth
              type="text"
              placeholder="Type datasource name"
              value={confirmText}
              onChange={handleConfirmTextChange}
              disabled={isDeleting}
              error={!!error}
              errorMessage={error || undefined}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <CustomButton
            variant="primary"
            label={isDeleting ? 'Deleting...' : 'Delete Datasource'}
            handleClick={handleConfirm}
            disabled={!isValid || isDeleting}
            loading={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-100 disabled:hover:bg-gray-100 disabled:text-gray-500"
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
