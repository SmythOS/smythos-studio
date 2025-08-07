import SubscriptionAnalytics from '@src/react/features/analytics/components/subscription-analytics'; // Import the Child component
import {
  fetchTeamFeaturesQuota,
  fetchUsage,
  generateBillingPortalSession,
} from '@src/react/features/subscriptions/client/myPlanPage';
import { useAuthCtx } from '@src/react/shared/contexts/auth.context';
import { extractError } from '@src/react/shared/utils/errors';
import { convertToGB, formatNumber } from '@src/react/shared/utils/format';
import { Analytics } from '@src/shared/posthog/services/analytics';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

/**
 * Checks if a subscription plan is a custom plan
 * @param plan - The subscription plan object
 * @returns boolean indicating if it's a custom plan
 */
const isCustomPlan = (plan: { isCustomPlan?: boolean; stripeId?: string }): boolean => {
  return !!plan?.isCustomPlan && (!plan?.stripeId || plan?.stripeId === 'no_id');
};

interface Usage {
  tasks?: {
    used: number;
  };
  dataPools?: {
    usedSize: number;
    unit: string;
  };
  activeAgents?: number;
}

const MyPlanPage = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingCancelPlan, setLoadingCancelPlan] = useState<boolean>(false);
  const [loadingRestartPlan, setLoadingRestartPlan] = useState<boolean>(false);
  const [dataPoolUsage, setDataPoolUsage] = useState<Usage | null>(null);
  const [tasksUsage, setTasksUsage] = useState<any>(null);
  const { userInfo } = useAuthCtx();

  const {
    userInfo: { user, subs: userSubs },
    hasReadOnlyPageAccess,
    getPageAccess,
  } = useAuthCtx();

  const userDisplayName = user?.name || userInfo?.userOnBoarding?.name || user?.email || '';
  const isOwner = useMemo(() => {
    return user?.userTeamRole?.isTeamInitiator || false;
  }, [user?.userTeamRole]);
  const isReadOnlyAccess = !isOwner || hasReadOnlyPageAccess('/my-plan', true);
  const hasWriteAccess = isOwner && getPageAccess('/my-plan', true)?.write;

  const [loadingUpgrade, setLoadingUpgrade] = useState<boolean>(false);
  const [dataPoolProgress, setDataPoolProgress] = useState<number>(0);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (userSubs) {
      Analytics.track('my_plan_page_visited', { planName: userSubs?.plan?.name });
    }
  }, [userSubs]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [teamFeaturesQuota, { usage: tasksUsage }] = await Promise.all([
          fetchTeamFeaturesQuota(),
          fetchUsage(),
        ]);

        if (tasksUsage) {
          setTasksUsage(tasksUsage);
        }

        if (teamFeaturesQuota) {
          const { usage: teamFeaturesUsage } = teamFeaturesQuota;
          setDataPoolUsage(teamFeaturesUsage);
          const dataPoolUsage = teamFeaturesUsage.dataPools?.usedSize ?? 0;
          const dataPoolLimit = userSubs?.plan?.properties?.limits?.dataPoolUsageGB ?? 0;
          const activeAgents = teamFeaturesUsage.activeAgents;

          let progress = 0;
          if (dataPoolLimit > 0 && dataPoolUsage > 0) {
            const dataPoolUsageInGB = convertToGB(dataPoolUsage, teamFeaturesUsage.dataPools?.unit);
            // Ensure progress doesn't exceed 100%
            progress = Math.min(Math.ceil((dataPoolUsageInGB / dataPoolLimit) * 100), 100);
          }
          setDataPoolProgress(progress);
        }
      } catch (error) {
        console.error('Error fetching team features:', error);
        toast.error(extractError(error) || 'Failed to load subscription data');
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.id && userSubs) {
      fetchData();
    }
  }, [user?.id, userSubs]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const subscriptionWarnings = localStorage.getItem('subscription_warnings');
    let isWarningsShown = false;
    if (subscriptionWarnings) {
      const parsedWarnings = JSON.parse(subscriptionWarnings);
      if (parsedWarnings.data > Date.now() - 1000 * 60 * 2) {
        toast.warning(parsedWarnings.warnings.join('\n'));
        isWarningsShown = true;
      }
      localStorage.removeItem('subscription_warnings');
    }
    if (params.get('upgraded') === 'true' && !isWarningsShown) {
      toast.success('Your subscription has been updated.');
      // Remove the query parameter from the URL
      params.delete('upgraded');
      navigate({ search: params.toString() }, { replace: true });
    }
  }, [location, navigate]);

  const handleUnsubscribe = async (type: 'cancel' | 'restart') => {
    if (isReadOnlyAccess) return;

    try {
      // Set loading state before the API call
      if (type === 'cancel') {
        setLoadingCancelPlan(true);
      } else {
        setLoadingRestartPlan(true);
      }

      const { sessionUrl } = await generateBillingPortalSession();

      // Only redirect if we get a valid session URL
      if (sessionUrl) {
        window.location.href = sessionUrl;
      } else {
        throw new Error('No session URL returned');
      }
    } catch (error) {
      toast.error(extractError(error) || 'Something went wrong. Please try again.');
      // Reset loading state on error
      if (type === 'cancel') {
        setLoadingCancelPlan(false);
      } else {
        setLoadingRestartPlan(false);
      }
    }
  };

  const handleUpgrade = async () => {
    if (isReadOnlyAccess) return;

    try {
      setLoadingUpgrade(true);
      const redirectUrl = '/plans';

      // Add a small delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 3000));
      window.location.href = redirectUrl;

      // Note: The following line won't execute due to the redirect
      setLoadingUpgrade(false);
    } catch {
      setLoadingUpgrade(false);
      toast.error('Failed to redirect to plans page');
    }
  };

  const customPlanStatus = useMemo(() => isCustomPlan(userSubs?.plan || {}), [userSubs]);

  return (
    <SubscriptionAnalytics
      isLoading={isLoading}
      loadingCancelPlan={loadingCancelPlan}
      loadingRestartPlan={loadingRestartPlan}
      loadingUpgrade={loadingUpgrade}
      usage={dataPoolUsage}
      tasksUsage={tasksUsage}
      subs={userSubs}
      handleUnsubscribe={handleUnsubscribe}
      handleUpgrade={handleUpgrade}
      isReadOnlyAccess={isReadOnlyAccess}
      hasWriteAccess={hasWriteAccess}
      isCustomPlan={customPlanStatus}
      getFormattedNumber={formatNumber}
      userDisplayName={userDisplayName}
    />
  );
};

export default MyPlanPage;
