import { getVectorsCustomStorage } from '@react/features/data-space/client/dataspace.api-client.service';
import { Input as CustomInput } from '@react/shared/components/ui/input';
import Modal from '@react/shared/components/ui/modals/Modal';
import { Button } from '@react/shared/components/ui/newDesign/button';
import { useQuery } from '@tanstack/react-query';
import React from 'react';

interface addNamespaceDialogComponent {
  handleClick: (useUserCustomStorage?: boolean) => void;
  disableBtn: boolean;
  onClose: () => void;
  open: boolean;
  loading: boolean;
  handleChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  inputValue: string;
  namespaceError: boolean | string;
}

export default function AddNamespaceDialog({
  handleClick,
  disableBtn,
  onClose,
  open,
  loading,
  handleChange,
  inputValue,
  namespaceError,
}: addNamespaceDialogComponent) {
  const [useUserCustomStorage, setUseUserCustomStorage] = React.useState(false);

  const customConfiguration = useQuery({
    queryKey: ['custom_vector_storage_configuration_get'],
    queryFn: getVectorsCustomStorage,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return (
    <Modal
      title="Create Data Space"
      isOpen={open}
      onClose={onClose}
      panelWrapperClasses="min-w-[300px] md:w-full flex justify-center"
    >
      <div className="flex flex-col gap-4 my-6">
        <CustomInput
          label="Enter Data Space"
          value={inputValue}
          onChange={handleChange}
          fullWidth
          placeholder="Type Data Space Name"
          required={true}
        />

        {!customConfiguration.isLoading && customConfiguration.data?.isConfigured && (
          <div className="flex items-center mb-2 mt-4">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                value=""
                className="sr-only peer"
                checked={useUserCustomStorage}
                onChange={(e) => {
                  setUseUserCustomStorage(e.target.checked);
                }}
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                Use Custom Storage
              </span>
            </label>
          </div>
        )}

        {namespaceError && <div className="pt-2 text-red-600">{namespaceError}</div>}
      </div>
      <Button
        className="w-full"
        handleClick={handleClick.bind(null, useUserCustomStorage)}
        loading={loading}
        disabled={disableBtn}
      >
        Add Data Space
      </Button>
    </Modal>
  );
}
