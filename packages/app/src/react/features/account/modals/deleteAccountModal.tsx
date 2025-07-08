import { deleteAccount } from '@src/react/features/account/clients';
import { Input as CustomInput } from '@src/react/shared/components/ui/input';
import Modal from '@src/react/shared/components/ui/modals/Modal';
import { Button as CustomButton } from '@src/react/shared/components/ui/newDesign/button';
import { SmythAPIError } from '@src/react/shared/types/api-results.types';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';

type Props = {
  onClose: () => void;
};

const DeleteAccountModal = ({ onClose }: Props) => {
  const deleteConfirmationWord = 'DELETE';
  const [confirmationWord, setConfirmationWord] = useState('');

  const deleteAccMutation = useMutation({
    mutationFn: deleteAccount,

    onError: (error: SmythAPIError) => {
      toast.error(error.error.message ?? 'Error deleting account');
      console.log(error);
    },
    onSuccess: () => {
      toast.success('Account deleted successfully');
    },
  });

  return (
    <Modal onClose={onClose} title="Delete Account">
      <div className="modal-body">
        <div className="flex flex-col gap-4 mt-3">
          <p>Are you sure you want to delete your account?</p>
          <p>
            This action is irreversible. If you delete your account, you will lose all your data,
            including your subscriptions, team members, and any other information associated with
            your account.
          </p>

          <p>
            To confirm, please type the word{' '}
            <strong className="text-red-500">{deleteConfirmationWord}</strong> in the field below.
          </p>

          <CustomInput
            value={confirmationWord}
            onChange={(e) => setConfirmationWord(e.target.value)}
            fullWidth
            autoFocus
            placeholder="Type DELETE to confirm"
            error={deleteAccMutation.isError}
            errorMessage="An error occurred while deleting your account. Please try again later."
          />

          <CustomButton
            fullWidth
            disabled={confirmationWord !== deleteConfirmationWord || deleteAccMutation.isLoading}
            handleClick={async () => {
              if (confirmationWord !== deleteConfirmationWord) return;
              if (deleteAccMutation.isLoading) return;

              // Delete account
              await deleteAccMutation.mutateAsync();
              // redirect to a page that informs the user that the account was deleted
              window.location.href = '/account-deleted';
            }}
            loading={deleteAccMutation.isLoading}
          >
            Delete Account
          </CustomButton>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteAccountModal;
