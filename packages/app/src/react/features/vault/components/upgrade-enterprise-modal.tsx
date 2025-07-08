import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@src/react/shared/components/ui/dialog';

interface UpgradeEnterpriseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpgradeEnterpriseModal({ isOpen, onClose }: UpgradeEnterpriseModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upgrade to Enterprise Plan</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p>Upgrade to enterprise plan logic goes here</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
