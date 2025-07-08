import Modal from '@react/shared/components/ui/modals/Modal';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};


const OnboardingCompletedModal = (props: Props) => {
  return (
    <Modal applyMaxWidth={true} isOpen={props.isOpen} onClose={props.onClose} panelClasses="max-w-[400px]">
      <div className="flex justify-center">
        <img src="/img/onboard/congrats.png" />
      </div>
      <div className="mt-10">
        <div className="text-3xl font-bold text-center">Congratulations!</div>
        <div className="mt-3 text-gray-900 text-lg text-center">
          You've successfully completed all the items on your checklist. This marks an important
          milestone in your SmythOS journey.
        </div>
      </div>
    </Modal>
  );
};

export default OnboardingCompletedModal;
