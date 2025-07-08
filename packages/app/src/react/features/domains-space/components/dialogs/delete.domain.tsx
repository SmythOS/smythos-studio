import { FC } from 'react';

import { Input } from '@react/shared/components/ui/input';
import Modal from '@react/shared/components/ui/modals/Modal';
import { Button } from '@react/shared/components/ui/newDesign/button';

interface State {
  inputValue: string;
  deleteError: boolean;
  errorMessage?: string;
  deleteLoading: boolean;
  selectedDomain: string;
  dialogOpen: boolean;
}
interface DomainDeletionPopup {
  onClose?: () => void;
  state?: State;
  handleChange?: Function;
  handleDeleteDomain?: Function;
}
export const DomainDeletionModal: FC<DomainDeletionPopup> = (props) => {
  const { onClose, state, handleChange, handleDeleteDomain } = props;

  return (
    <Modal onClose={onClose} title="Confirm Domain URL Deletion">
      <div className="text-sm space-y-1 pb-2 pt-1">
        <p>
          Please be aware that deleting this Domain URL will permanently remove it from your records
          and could impact linked agents.
        </p>
        <p>
          Type the domaine name to confirm:&nbsp;
          <span className="font-bold">{state.selectedDomain}</span>
        </p>
      </div>
      <Input
        value={state.inputValue}
        onChange={(event) => handleChange(event.target.value)}
        fullWidth
        placeholder="Type domain name"
        id="namespaceDeleteInput"
        error={state.deleteError}
        errorMessage={state.errorMessage}
      />
      <Button
        fullWidth
        isDelete
        variant="primary"
        className="mt-2"
        handleClick={() => handleDeleteDomain(state.inputValue)}
        label="Delete"
        addIcon={state.deleteLoading}
        Icon={
          state.deleteLoading ? <div id="loader" className="circular-loader mr-2"></div> : undefined
        }
        disabled={state.inputValue !== state.selectedDomain || state.deleteLoading}
      />
    </Modal>
  );
};
