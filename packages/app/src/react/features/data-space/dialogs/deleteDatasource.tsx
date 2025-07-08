import { deleteDatasource } from '@react/features/data-space/client/dataspace.api-client.service';
import Modal from '@react/shared/components/ui/modals/Modal';
import { Button as CustomButton } from '@react/shared/components/ui/newDesign/button';
import { queryClient } from '@react/shared/query-client';
import { Datasource, SmythAPIError } from '@react/shared/types/api-results.types';
import { extractError } from '@react/shared/utils/errors';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';

interface Props {
  onClose: () => void;
  item: Datasource;
  namespaceName: string;
  remove: () => void;
}

export default function DeleteDatasourceDialog({ onClose, item, namespaceName, remove }: Props) {
  const [errorMessage, setErrorMessage] = useState('');

  const deleteMutation = useMutation({
    mutationFn: () => deleteDatasource({ id: item.id }),

    onError: (error: SmythAPIError) => {
      let _errorMessage =
        error.status === 403 && extractError(error) === 'Forbidden'
          ? 'You are not authorized to delete this data source'
          : extractError(error) || 'An error occurred. Please try again later.';
      setErrorMessage(_errorMessage);
      console.log(error);
    },
    onSuccess: () => {
      toast.success('Datasource deleted successfully');
      queryClient.invalidateQueries({ queryKey: [`datasources-${namespaceName}`] });
      remove();
    },
  });

  return (
    <Modal onClose={onClose} title="Confirm Datasource Deletion">
      <div className="modal-body">
        <div className="text mt-2">
          Please be aware that deleting this <b className="text-black">datasource</b> will
          permanently remove it from your records. This action is irreversible.{' '}
        </div>

        {deleteMutation.isError && <p className="text-red-500 py-4">{errorMessage}</p>}

        <CustomButton
          handleClick={async () => {
            await deleteMutation.mutateAsync();
            onClose();
          }}
          disabled={deleteMutation.isLoading}
          loading={deleteMutation.isLoading}
          fullWidth
          label="Delete"
          className="mt-5"
        />
      </div>
    </Modal>
  );
}
