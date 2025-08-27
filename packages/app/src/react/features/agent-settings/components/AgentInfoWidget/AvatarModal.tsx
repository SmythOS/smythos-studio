import Modal from '@react/shared/components/ui/modals/Modal';
import { Button } from '@react/shared/components/ui/newDesign/button';
import classNames from 'classnames';
import React from 'react';
import { FaCircleNotch, FaPlus, FaUpload, FaWandMagicSparkles } from 'react-icons/fa6';

interface AvatarModalProps {
  show: boolean;
  isUploading: boolean;
  currentAvatar: string | null;
  close: () => void;
  onLoad: () => void;
  handleUpload: () => void;
  handleGenerate: () => void;
}

const AvatarModal: React.FC<AvatarModalProps> = ({
  show,
  close,
  onLoad,
  isUploading,
  currentAvatar,
  handleUpload,
  handleGenerate,
}) => {
  return (
    <Modal isOpen={show} onClose={close}>
      <div className="w-[256px] flex items-center flex-col">
        <div className="w-[236px] h-[236px]">
          {currentAvatar ? (
            <img
              src={currentAvatar}
              key={currentAvatar}
              alt="agent-avatar"
              onLoad={onLoad}
              className={classNames('w-full h-full rounded-full object-cover', {
                isImageBeingLoaded: 'hidden',
              })}
            />
          ) : (
            <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center group hover:shadow-md z-10">
              <FaPlus className="w-6 h-6 text-gray-400" />
            </div>
          )}
          {isUploading && (
            <div className="w-[236px] h-[236px] rounded-full absolute top-0 left-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
              <FaCircleNotch className="w-10 h-10 animate-spin text-v2-blue" />
            </div>
          )}
        </div>
        <div className="w-full flex gap-4 justify-between mt-6">
          <Button
            label={'Upload'}
            disabled={isUploading}
            Icon={<FaUpload />}
            variant="secondary"
            handleClick={handleUpload}
            className="w-1/2  gap-2 text-center"
          />
          <Button
            label={'Generate'}
            disabled={isUploading}
            variant="secondary"
            Icon={<FaWandMagicSparkles />}
            handleClick={handleGenerate}
            className="w-1/2  gap-2 text-center"
          />
        </div>
      </div>
    </Modal>
  );
};

export default AvatarModal;
