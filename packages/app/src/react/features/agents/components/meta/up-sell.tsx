import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import Modal from '@react/shared/components/ui/modals/Modal';
import { Observability } from '@shared/observability';

type Props = {
  body?: ReactNode;
  onClose?: () => void;
  children?: ReactNode;
  analytics: { page_url: string; source: string };
};

const UpSellModal = ({ onClose, children, analytics }: Props) => {
  const navigate = useNavigate();
  useEffect(() => {
    Observability.observeInteraction('upgrade_impression', {
      page_url: analytics?.page_url,
      source: analytics.source,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpgradeClick = () => {
    Observability.observeInteraction('upgrade_click', {
      page_url: analytics?.page_url,
      source: analytics?.source,
    });
    navigate('/plans');
  };

  return (
    <Modal onClose={onClose}>
      <div className="flex flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Quota Limit Reached</h1>
          {children}
          <div className="flex justify-center mt-10">
            <button
              // eslint-disable-next-line max-len
              className="flex-1 border border-solid border-primary-100 text-white h-3/4 flex items-center bg-primary-100 hover:opacity-75 focus:ring-4 focus:outline-none disabled:opacity-40 rounded-md text-sm px-5 py-2 text-center justify-center cursor-pointer w-5/12 font-semibold"
              type="button"
              onClick={handleUpgradeClick}
            >
              Upgrade
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default UpSellModal;
