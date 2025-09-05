import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/react/shared/components/ui/dialog';
import { Button as CustomButton } from '@src/react/shared/components/ui/newDesign/button';
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] [&_.absolute.right-6.top-6]:right-4 [&_.absolute.right-6.top-6]:top-4">
        <DialogHeader className="space-y-4">
          <DialogTitle>Delete OAuth Connection</DialogTitle>
          <DialogDescription className="pt-2">
            Are you sure you want to delete the connection{' '}
            <span className="font-semibold">{connection?.name || 'this connection'}</span>? This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <CustomButton
            variant="primary" // Use destructive variant for delete actions
            handleClick={handleConfirm}
            loading={isProcessing}
            disabled={isProcessing}
            label="Delete Connection"
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}