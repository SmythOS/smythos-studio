import { Button } from '@react/shared/components/ui/newDesign/button';
import { SMYTHOS_DOCS_URL } from '@src/shared/constants/general';
import { Analytics } from '@src/shared/posthog/services/analytics';
import { ReactNode, useEffect } from 'react';
import { FaLock } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';

type Props = {
  title?: ReactNode;
  message?: ReactNode;
  showCta?: boolean;
  ctaLabel?: string;
  ctaRoute?: string;
  analytics: {
    page_url: string;
    source: string;
  };
  featureName: string;
  docsLink?: string;
};

const FeaturePageUpsell = ({
  title = <h4 className="text-2xl font-medium text-black text-center">Upgrade to Access</h4>,
  message = (
    <p className="text-gray-950 text-sm text-center">
      Sorry, but you don't have permission to access this page. Upgrade to a{' '}
      <strong>Starter</strong> or <strong>Professional</strong> plan to gain access.
    </p>
  ),
  showCta = true,
  ctaLabel = 'Upgrade',
  ctaRoute = '/plans',
  analytics,
  featureName = 'Subdomains',
  docsLink = `${SMYTHOS_DOCS_URL}/agent-deployments/subdomains`,
}) => {
  const navigate = useNavigate();

  const handleUpgradeClick = () => {
    Analytics.track('upgrade_click', {
      page_url: analytics?.page_url,
      source: analytics?.source,
    });
    navigate(ctaRoute);
  };

  const handleGoBackClick = () => {
    navigate(-1);
  };

  useEffect(() => {
    Analytics.track('upgrade_impression', {
      page_url: analytics?.page_url,
      source: analytics?.source,
    });
  }, []);

  return (
    <>
      {featureName != 'Subdomains' && (
        <div className="flex items-center justify-between flex-wrap md:flex-nowrap pb-6">
          {/*           <h2 className="text-2xl font-semibold">{featureName}</h2>
           */}{' '}
        </div>
      )}
      <div className="flex justify-center items-start pt-32 pl-12 md:pl-0">
        <div className="max-w-md w-full mx-auto flex flex-col items-center gap-8 p-4 text-center">
          {title}

          {message}
          <div className="flex justify-between items-center gap-4 mt-2 w-full flex-col md:flex-row">
            <Button
              className="flex-1 w-[140px] md:w-auto"
              label="Learn More"
              variant="secondary"
              isLink
              external
              linkTo={docsLink}
            />
            {showCta && (
              <Button
                className="flex-1 w-[140px] md:w-auto"
                label={ctaLabel}
                type="button"
                variant="primary"
                handleClick={handleUpgradeClick}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// USE CASES

// 1. Subdomains page
FeaturePageUpsell.Subdomains = () => {
  return (
    <FeaturePageUpsell
      title={
        <div className="flex items-center">
          <FaLock className="text-red-500 mt-[-3px]" size={'1.25rem'} />
          <h4 className="text-xl md:text-2xl font-medium text-black text-center ml-2 leading-[1rem]">
            Unlock Subdomains
          </h4>
        </div>
      }
      message={
        <p className="text-sm md:text-base">
          Access to subdomains are not available on your plan.{' '}
          <Link to="/plans" className="font-bold underline underline-offset-4">
            Upgrade
          </Link>{' '}
          to <strong>Scaleup or Enterprise</strong> to easily manage your custom web domains and
          publish AI agents to enhance your brand's presence.
        </p>
      }
      ctaLabel="Upgrade"
      analytics={{ page_url: '/domains', source: 'subdomain manager' }}
      featureName="Subdomains"
      docsLink={`${SMYTHOS_DOCS_URL}/agent-deployments/subdomains`}
    />
  );
};

// 2. Teams page
FeaturePageUpsell.Teams = () => {
  return (
    <FeaturePageUpsell
      title={
        <div className="flex items-center">
          <FaLock className="text-red-500" size={'1.5rem'} />
          <h4 className="text-xl md:text-2xl font-medium text-black text-center ml-2">
            Unlock Manage Team
          </h4>
        </div>
      }
      message={
        <p className="text-sm md:text-base">
          Create roles for your team with shared permissions for viewing and editing. <br />
          Please{' '}
          <Link className="font-bold underline underline-offset-4" to="/plans">
            upgrade
          </Link>{' '}
          your plan to gain access to this feature.
        </p>
      }
      ctaLabel="Upgrade"
      analytics={{ page_url: '/teams/members', source: 'user management page' }}
      featureName="Manage Team"
      docsLink={`${SMYTHOS_DOCS_URL}/account-management/organization-management#managing-users`}
    />
  );
};

// 3. Roles page
FeaturePageUpsell.Roles = () => {
  return (
    <FeaturePageUpsell
      title={
        <div className="flex items-center">
          <FaLock className="text-red-500" size={'1.5rem'} />
          <h4 className="text-xl md:text-2xl font-medium text-black text-center ml-2">
            Unlock Manage Roles
          </h4>
        </div>
      }
      message={
        <p className="text-sm md:text-base">
          Create roles for your team with shared permissions for viewing and editing. <br />
          Please{' '}
          <Link className="font-bold underline underline-offset-4" to="/plans">
            upgrade
          </Link>{' '}
          your plan to gain access to this feature.
        </p>
      }
      ctaLabel="Upgrade"
      analytics={{ page_url: '/teams/roles', source: 'manage roles page' }}
      featureName="Manage Roles"
      docsLink={`${SMYTHOS_DOCS_URL}/account-management/organization-management#managing-roles`}
    />
  );
};

FeaturePageUpsell.BulkCalls = () => {
  return (
    <FeaturePageUpsell
      title={
        <div className="flex items-center">
          <FaLock className="text-red-500" size={'1.5rem'} />
          <h4 className="text-2xl font-medium text-black text-center ml-2">
            Unlock Agent Bulk Calls
          </h4>
        </div>
      }
      // this feature allows the user to call an agent skills in bulk
      message={
        <p>
          Create roles for your team with shared permissions for viewing and editing. <br />
          Please{' '}
          <Link className="font-bold underline underline-offset-4" to="/plans">
            upgrade
          </Link>{' '}
          your plan to gain access to this feature.
        </p>
      }
      ctaLabel="Upgrade"
      analytics={{ page_url: '/bulk', source: 'agent bulk calls page' }}
      featureName="Agent Bulk Calls"
    />
  );
};

// 4. Analytics page
FeaturePageUpsell.Analytics = () => {
  return (
    <FeaturePageUpsell
      title={
        <div className="flex items-center">
          <FaLock className="text-red-500" size={'1.5rem'} />
          <h4 className="text-2xl font-medium text-black text-center ml-2">Unlock Analytics</h4>
        </div>
      }
      message={
        <p>
          Gain detailed insights into how your AI agents are performing with advanced usage
          analytics and understand your token usage to optimize efficiency. <br />
          Please{' '}
          <Link className="font-bold underline underline-offset-4" to="/plans">
            Upgrade
          </Link>{' '}
          to gain access to this feature.
        </p>
      }
      ctaLabel="Upgrade"
      analytics={{ page_url: '/analytics', source: 'analytics page' }}
      featureName="Analytics"
    />
  );
};

// 5. Pricing page (TEMP until we launch)
FeaturePageUpsell.Pricing = () => {
  return (
    <FeaturePageUpsell
      title={
        <div className="flex items-center">
          <FaLock className="text-red-500" size={'1.5rem'} />
          <h4 className="text-2xl font-medium text-black text-center ml-2">Upgrade Plan</h4>
        </div>
      }
      message={
        <p>
          SmythOS is currently in early access. <br />
          To change your plan or features, contact hello@smythos.com
        </p>
      }
      showCta={false}
      analytics={{ page_url: '/plans', source: 'pricing page' }}
      featureName="Upgrade Plan"
    />
  );
};

export default FeaturePageUpsell;
