import { Button } from '@react/shared/components/ui/newDesign/button';
import { PRICING_PLAN_REDIRECT } from '@react/shared/constants/navigation';
import { Observability } from '@src/shared/observability';
import { useEffect } from 'react';
import config from '../../../../builder-ui/config';

type Props = {
  infoText: string;
  analytics: {
    page_url: string;
    source: string;
  };
};

const WidgetSubscribeInfo = ({ infoText, analytics }: Props) => {
  useEffect(() => {
    Observability.observeInteraction('upgrade_impression', {
      page_url: analytics?.page_url,
      source: analytics?.source,
    });
  }, []);

  const handleUpgrade = () => {
    Observability.observeInteraction('upgrade_click', {
      page_url: analytics?.page_url,
      source: analytics?.source,
    });
    window.location.href = config.env.IS_DEV ? '/plans' : PRICING_PLAN_REDIRECT;
  };

  return (
    <>
      <p className="text-sm font-semibold my-4">This is a premium feature.</p>
      <div className="flex items-center gap-4 my-4">
        <p className="text-sm italic">
          {infoText} Upgrade to a <strong>Basic</strong> or <strong>Pro</strong> plan to unlock more
          premium features.
        </p>
      </div>
      <div className="pt-4 flex justify-end">
        <Button label="Upgrade plan" variant="primary" handleClick={handleUpgrade} />
      </div>
    </>
  );
};

export default WidgetSubscribeInfo;
