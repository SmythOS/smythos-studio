import { FC } from 'react';
import { FaCheck } from 'react-icons/fa6';

import buildAgentsFeaturesData from '@react/features/subscriptions/data/build-agents-features.json';
import subscriptionTiersData from '@react/features/subscriptions/data/subscription-tiers.json';

interface SubscriptionTier {
  key: 'free' | 'builder' | 'startup' | 'scaleup' | 'enterprise';
  name: string;
  displayName: string;
}

interface Feature {
  id: string;
  name: string;
  description: string;
  tiers: Record<SubscriptionTier['key'], boolean>;
}

/**
 * BuildAgents component displays a comprehensive feature comparison table
 * for Build Agents functionality across different subscription tiers
 */
export const BuildAgents: FC = () => {
  const subscriptionTiers: SubscriptionTier[] = subscriptionTiersData as SubscriptionTier[];
  const features: Feature[] = buildAgentsFeaturesData as Feature[];

  // Renders a feature availability indicator
  const renderAvailabilityIndicator = (isAvailable: boolean) => {
    return isAvailable ? (
      <FaCheck
        className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 mx-auto"
        aria-label="Feature available"
      />
    ) : (
      <span
        className="text-gray-400 text-xs sm:text-sm font-medium"
        aria-label="Feature not available"
      >
        –
      </span>
    );
  };

  // Renders tier name with responsive display
  const renderTierName = (tier: SubscriptionTier): JSX.Element => (
    <span className="font-semibold">
      <span className="hidden lg:inline">{tier.displayName}</span>
      <span className="lg:hidden" title={tier.displayName}>
        {tier.displayName.charAt(0)}
      </span>
    </span>
  );

  return (
    <section
      className="flex flex-col gap-6 py-8 md:py-12 w-full"
      aria-labelledby="build-agents-title"
    >
      {/* Header Section */}
      <header className="space-y-2 w-full">
        <h2 id="build-agents-title" className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Build Agents
        </h2>
        <p className="text-sm text-gray-600 sm:text-base max-w-2xl">
          Build Agents is a comprehensive feature that enables you to create sophisticated AI agents
          using an intuitive visual interface with advanced workflow capabilities.
        </p>
      </header>

      {/* Feature Comparison Table */}
      <div className="relative">
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table
            className="min-w-full divide-y divide-gray-200"
            role="table"
            aria-label="Build Agents feature comparison across subscription tiers"
          >
            <thead className="bg-gray-50 text-gray-900 text-xs sm:text-sm font-semibold tracking-wide">
              <tr>
                <th scope="col" className="px-3 py-3 sm:px-4 sm:py-4 text-left">
                  Feature
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 sm:px-4 sm:py-4 text-left hidden sm:table-cell"
                >
                  Description
                </th>
                {subscriptionTiers.map((tier) => (
                  <th key={tier.key} scope="col" className="px-2 py-3 sm:px-4 sm:py-4 text-center">
                    {renderTierName(tier)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {features.map((feature, index) => (
                <tr
                  key={feature.id}
                  className={`transition-colors duration-150 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <td className="px-3 py-3 sm:px-4 sm:py-4 text-xs sm:text-sm font-medium text-gray-900">
                    {feature.name}
                  </td>
                  <td className="px-3 py-3 sm:px-4 sm:py-4 text-xs sm:text-sm text-gray-600 hidden sm:table-cell">
                    {feature.description}
                  </td>
                  {subscriptionTiers.map((tier) => (
                    <td key={tier.key} className="px-2 py-3 sm:px-4 sm:py-4 text-center">
                      {renderAvailabilityIndicator(feature.tiers[tier.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Legend */}
        <div className="mt-4 lg:hidden">
          <p className="text-xs text-gray-500 text-center">
            <span className="font-medium">Legend:</span> F=Free, B=Builder, S=Startup, S=Scaleup,
            E=Enterprise
          </p>
        </div>
      </div>
    </section>
  );
};
