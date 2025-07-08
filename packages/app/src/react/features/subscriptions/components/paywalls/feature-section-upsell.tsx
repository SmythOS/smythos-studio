import { Analytics } from '@src/shared/posthog/services/analytics';
import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

type Props = {
  message?: ReactNode;
  showCta?: boolean;
  ctaLabel?: string;
  ctaRoute?: string;
  analytics: {
    page_url: string;
    source: string;
  };
};

const FeatureSectionUpsell = ({
  message = (
    <p className="text-gray-950 text-sm text-center">Upgrade your plan to access this feature.</p>
  ),
  showCta = true,
  ctaLabel = 'Upgrade',
  ctaRoute = '/plans',
  analytics,
}: Props) => {
  const navigate = useNavigate();

  const handleUpgradeClick = () => {
    Analytics.track('upgrade_click', {
      page_url: analytics?.page_url,
      source: analytics?.source,
    });
    navigate(ctaRoute);
  };

  useEffect(() => {
    Analytics.track('upgrade_impression', {
      page_url: analytics?.page_url,
      source: analytics?.source,
    });
  }, []);

  return (
    <div className="flex items-center justify-center">
      <div className="max-w-md mx-auto flex flex-col gap-3">
        {message}
        <div className="flex justify-between items-center box-border gap-4 mt-2">
          {showCta && (
            <button
              className="m-auto border border-solid border-primary-100 text-white h-3/4 flex items-center bg-primary-100 hover:opacity-75 focus:ring-4 focus:outline-none disabled:opacity-40 rounded-md text-sm px-8 py-2 text-center justify-center cursor-pointer w-5/12 font-semibold"
              type="button"
              onClick={handleUpgradeClick}
            >
              {ctaLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeatureSectionUpsell;
