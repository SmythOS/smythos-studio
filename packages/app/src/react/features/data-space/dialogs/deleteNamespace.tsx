import { Input as CustomInput } from '@react/shared/components/ui/input';
import Modal from '@src/react/shared/components/ui/modals/Modal';
import { Button } from '@src/react/shared/components/ui/newDesign/button';
import { Trash2 } from 'lucide-react';

export default function DeleteNamespace({
  namespaceState,
  open,
  onClose,
  handleChange,
  handleNamespaceDelete,
}) {
  return (
    <div>
      <Modal
        title="Confirm Data Space Deletion"
        isOpen={open}
        onClose={onClose}
        panelWrapperClasses="min-w-[300px] md:w-full flex justify-center"
      >
        <div className="flex flex-col gap-4 my-6">
          <div className="text-sm ">
            Please be aware that deleting this Data Space will permanently remove it from your
            records.
          </div>
          <div className="text-sm pb-4">
            Type the data space name to confirm :{' '}
            <span className="font-bold">{namespaceState.selectedNamespace}</span>{' '}
          </div>

          <CustomInput
            value={namespaceState.deleteNamespaceInput}
            onChange={(event) => handleChange(event.target.value)}
            fullWidth
            placeholder="Type Data Space Name"
            id="namespaceDeleteInput"
            error={namespaceState.deleteNamespaceError}
            errorMessage={namespaceState.deleteNamespaceError}
          />
        </div>
        <Button
        className='w-full'
          loading={namespaceState.deleteNamespaceLoading}
          handleClick={() => handleNamespaceDelete(namespaceState.selectedNamespace)}
          disabled={
            namespaceState.deleteNamespaceInput !== namespaceState.selectedNamespace ||
            namespaceState.deleteNamespaceLoading
          }
          addIcon
          Icon={<Trash2 size={16} className='mr-1' />}
        >
          Delete
        </Button>
      </Modal>
    </div>
  );
}
