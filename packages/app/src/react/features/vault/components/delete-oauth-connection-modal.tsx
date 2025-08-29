// src/webappv2/pages/vault/delete-oauth-connection-modal.tsx
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete OAuth Connection</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the connection{' '}
            <span className="font-semibold">{connection?.name || 'this connection'}</span>? This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <CustomButton variant="secondary" type="button" handleClick={onClose} disabled={isProcessing} label="Cancel" />
          </DialogClose>
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