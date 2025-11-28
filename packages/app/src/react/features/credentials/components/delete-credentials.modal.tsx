/**
 * Delete Credentials Confirmation Modal
 *
 * Requires user to type credential name to confirm deletion.
 * Encapsulates all credential deletion logic within the credentials feature.
 * 
 * @component
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
import { errorToast, successToast } from '@src/shared/components/toast';
import { ChangeEvent, FC, useEffect, useState } from 'react';
import { credentialsClient } from '../clients/credentials.client';

interface DeleteCredentialsModalProps {
  isOpen: boolean;
  credentialId: string;
  credentialName: string;
  group: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DeleteCredentialsModal: FC<DeleteCredentialsModalProps> = ({
  isOpen,
  credentialId,
  credentialName,
  group,
  onClose,
  onSuccess,
}) => {
  const [confirmText, setConfirmText] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[] | null>(null);
  const [showWarnings, setShowWarnings] = useState<boolean>(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setConfirmText('');
      setError(null);
      setIsDeleting(false);
      setWarnings(null);
      setShowWarnings(false);
    }
  }, [isOpen]);

  const handleConfirmTextChange = (e: ChangeEvent<HTMLInputElement>) => {
    setConfirmText(e.target.value);
    setError(null);
  };

  const handleConfirm = async () => {
    // Step 1: Validate credential name
    if (confirmText !== credentialName) {
      setError('Credential name does not match');
      return;
    }

    setIsDeleting(true);
    setError(null);
    
    try {
      // Try to delete without consent first
      const result = await credentialsClient.deleteCredential(credentialId, group, false);
      
      // If warnings are returned, show them
      if (!result.success && result.warnings && result.warnings.length > 0) {
        setWarnings(result.warnings);
        setShowWarnings(true);
        setIsDeleting(false);
        return;
      }

      // Success - no warnings
      successToast('Credential deleted successfully.');
      onClose();
      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete credential. Please try again.';
      errorToast(errorMessage);
      setIsDeleting(false);
    }
  };

  const handleConfirmWithWarnings = async () => {
    setIsDeleting(true);
    setError(null);
    
    try {
      // Delete with consent
      const result = await credentialsClient.deleteCredential(credentialId, group, true);
      
      if (result.success) {
        successToast('Credential deleted successfully.');
        onClose();
        onSuccess?.();
      } else {
        throw new Error('Failed to delete credential');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete credential. Please try again.';
      errorToast(errorMessage);
      setIsDeleting(false);
    }
  };

  const handleBackFromWarnings = () => {
    setShowWarnings(false);
    setWarnings(null);
  };

  const isValid = confirmText === credentialName;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {showWarnings ? 'Confirm Deletion with Warnings' : 'Delete Credential'}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Normal confirmation */}
        {!showWarnings && (
          <div className="py-4 space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> This action cannot be undone. This will permanently delete
                the credential connection and may affect any resources using it.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                Please type <strong className="font-semibold text-gray-900">{credentialName}</strong>{' '}
                to confirm deletion.
              </p>
              <Input
                fullWidth
                type="text"
                placeholder="Type credential name"
                value={confirmText}
                onChange={handleConfirmTextChange}
                disabled={isDeleting}
                error={!!error}
                errorMessage={error || undefined}
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Step 2: Warnings display */}
        {showWarnings && warnings && (
          <div className="py-4 space-y-4">
            <div className="bg-amber-50 border border-amber-300 rounded-md p-4">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-0.5">
                  <svg
                    className="w-5 h-5 text-amber-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-amber-800 mb-2">
                    ⚠️ Dependencies Detected
                  </h4>
                  <p className="text-sm text-amber-700 mb-3">
                    This credential is currently being used by the following resources:
                  </p>
                  <ul className="space-y-1.5">
                    {warnings.map((warning, index) => (
                      <li key={index} className="text-sm text-amber-800 flex items-start gap-2">
                        <span className="text-amber-600 mt-1">•</span>
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-amber-700 mt-3 font-medium">
                    Are you sure you want to proceed? This may break existing functionality.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer buttons */}
        <DialogFooter>
          {!showWarnings ? (
            <>
              <CustomButton
                variant="secondary"
                label="Cancel"
                handleClick={onClose}
                disabled={isDeleting}
              />
              <CustomButton
                variant="primary"
                label={isDeleting ? 'Checking...' : 'Delete Credential'}
                handleClick={handleConfirm}
                disabled={!isValid || isDeleting}
                loading={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-100 disabled:hover:bg-gray-100 disabled:text-gray-500"
              />
            </>
          ) : (
            <>
              <CustomButton
                variant="secondary"
                label="Cancel"
                handleClick={handleBackFromWarnings}
                disabled={isDeleting}
              />
              <CustomButton
                variant="primary"
                label={isDeleting ? 'Deleting...' : 'Delete Anyway'}
                handleClick={handleConfirmWithWarnings}
                disabled={isDeleting}
                loading={isDeleting}
                className="bg-amber-600 hover:bg-amber-700 text-white disabled:bg-gray-100 disabled:hover:bg-gray-100 disabled:text-gray-500"
              />
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

