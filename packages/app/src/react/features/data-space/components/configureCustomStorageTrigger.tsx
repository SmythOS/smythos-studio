import { getVectorsCustomStorage } from '@react/features/data-space/client/dataspace.api-client.service';
import { Button as CustomButton } from '@react/shared/components/ui/newDesign/button';
import CustomVectorStorageConfigModal from '@src/react/features/data-space/modals/CustomVectorStorageConfigModal';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { TbDatabaseCog } from 'react-icons/tb';

const ConfigureCustomStorageTrigger = () => {
  const [isConfigureStorageOpen, setIsConfigureStorageOpen] = useState(false);
  const [requestedModalOpen, setRequestModalOpen] = useState(false);

  const customConfiguration = useQuery({
    queryKey: ['custom_vector_storage_configuration_get'],
    queryFn: getVectorsCustomStorage,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,

    onSuccess: (data) => {
      if (requestedModalOpen) {
        setRequestModalOpen(false);
        setIsConfigureStorageOpen(true);
      }
    },

    onError: (error) => {
      if (requestedModalOpen) {
        setRequestModalOpen(false);
      }
    },
  });

  return (
    <>
      <CustomButton
        handleClick={() => {
          if (customConfiguration.isLoading) {
            setRequestModalOpen(true);
          }
          setIsConfigureStorageOpen(true);
        }}
        addIcon={true}
        Icon={
          <TbDatabaseCog color="text-v2-blue hover:text-white" className="mr-2" size={'1.2rem'} />
        }
        loading={requestedModalOpen && customConfiguration.isLoading}
        label={'Customize Storage'}
        dataAttributes={{ 'data-test': 'configure-storage-button' }}
        variant="secondary"
      />

      {isConfigureStorageOpen &&
        customConfiguration.isSuccess &&
        createPortal(
          <CustomVectorStorageConfigModal
            data={customConfiguration.isLoading ? undefined : customConfiguration.data}
            resetDataAndRefetch={customConfiguration.refetch}
            onClose={() => setIsConfigureStorageOpen(false)}
          />,
          document.body,
        )}
    </>
  );
};

export default ConfigureCustomStorageTrigger;
