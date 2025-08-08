import { FC } from 'react';

import Modal from '@react/shared/components/ui/modals/Modal';
import { Button } from '@react/shared/components/ui/newDesign/button';

interface SettingsModalProps {
  onClose: () => void;
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  isLoading: boolean;
  btnText: string;
}

export const SettingsModal: FC<SettingsModalProps> = (props) => {
  const { onClose, open, title, description, onConfirm, isLoading, btnText } = props;
  if (!open) return null;
  return (
    <Modal onClose={onClose} isOpen={open} title={title} panelClasses="min-w-[460px] md:min-w-[550px]">
      <p className="text-base text-[#1E1E1E] font-light pt-3 pb-5">{description}</p>
      <Button
        className="ml-auto h-[48px] rounded-lg"
        handleClick={onConfirm}
        label={btnText}
        addIcon
        Icon={<img className="mr-2" src="/img/icons/Delete-White.svg" />}
        disabled={isLoading}
        isDelete
      />
    </Modal>
  );
};
