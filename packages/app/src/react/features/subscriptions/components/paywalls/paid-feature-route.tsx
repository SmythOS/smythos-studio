import FeaturePageUpsell from '@src/react/features/subscriptions/components/paywalls/feature-page-upsell';
import { useAuthCtx } from '@src/react/shared/contexts/auth.context';
import { TeamSubs } from '@src/react/shared/types/subscription';
import { ReactNode, useMemo } from 'react';

type Props = {
  children: ReactNode;
  checkAccess: (subs: TeamSubs) => boolean;
  UpsellContent?: ReactNode;
  analytics: {
    page_url: string;
    source: string;
  };
};

const PaidFeatureRoute = ({ children, checkAccess, UpsellContent, analytics }: Props) => {
  const {
    userInfo: { subs },
  } = useAuthCtx();

  const hasAccess = useMemo(() => checkAccess(subs), [subs, checkAccess]);

  return hasAccess ? (
    <>{children}</>
  ) : UpsellContent ? (
    UpsellContent
  ) : (
    <FeaturePageUpsell analytics={analytics} />
  );
};

export default PaidFeatureRoute;
