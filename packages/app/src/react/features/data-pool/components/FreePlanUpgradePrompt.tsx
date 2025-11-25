/**
 * Free Plan Upgrade Prompt
 *
 * Shows upgrade prompt for free plan users
 */

import { Button as CustomButton } from '@src/react/shared/components/ui/newDesign/button';
import { FC } from 'react';

interface FreePlanUpgradePromptProps {
  namespaceName: string;
  onUpgrade: () => void;
}

export const FreePlanUpgradePrompt: FC<FreePlanUpgradePromptProps> = ({
  namespaceName,
  onUpgrade,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
        <div className="mb-4">
          <div className="inline-block px-3 py-1 mb-3 text-xs font-medium text-blue-600 bg-blue-50 rounded-full">
            Free Users
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Create Data Space</h2>
        </div>

        {/* Provider */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
          <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-900">
            Default
          </div>
        </div>

        {/* Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-900">
            {namespaceName}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <CustomButton
            variant="secondary"
            label="Basic (Limited features)"
            className="flex-1"
            disabled
          />
          <CustomButton
            label="Upgrade to Startup"
            handleClick={onUpgrade}
            className="flex-1"
          />
        </div>

        <p className="text-xs text-gray-600 text-center mt-4">
          Without upgrading to startup, you will be unable to use RAG applications and other
          advance features.
        </p>
      </div>
    </div>
  );
};

