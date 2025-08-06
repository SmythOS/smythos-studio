import { getVectorsCustomStorage } from '@react/features/data-space/client/dataspace.api-client.service';
import { Input as CustomInput } from '@react/shared/components/ui/input';
import Modal from '@react/shared/components/ui/modals/Modal';
import config from '@src/frontend/config';
import plansDev from '@src/react/features/subscriptions/data/plans.v4.dev.json';
import plansProd from '@src/react/features/subscriptions/data/plans.v4.prod.json';
import { generatePricingUrl } from '@src/react/features/subscriptions/utils';
import { Button } from '@src/react/shared/components/ui/newDesign/button';
import { useAuthCtx } from '@src/react/shared/contexts/auth.context';
import { PRICING_PLANS_V4 } from '@src/react/shared/enums';
import { extractError } from '@src/react/shared/utils/errors';
import { cn, navigateTo } from '@src/react/shared/utils/general';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRightIcon } from 'lucide-react';
import { ChangeEvent, FormEvent, useState } from 'react';
import { toast } from 'react-toastify';

type AddNamespaceDialogComponent = {
  handleClick: (useUserCustomStorage?: boolean) => void;
  disableBtn: boolean;
  onClose: () => void;
  open: boolean;
  loading: boolean;
  handleChange: (event: ChangeEvent<HTMLInputElement>) => void;
  inputValue: string;
  namespaceError: boolean | string;
};

enum OptionType {
  CONTINUE_FREE = 'continue-free',
  STARTUP = 'startup',
}

const pricingTiers = config.env.IS_DEV ? plansDev : plansProd;

export default function AddNamespaceDialog({
  handleClick,
  disableBtn,
  onClose,
  open,
  loading,
  handleChange,
  inputValue,
  namespaceError,
}: AddNamespaceDialogComponent) {
  const [useUserCustomStorage, setUseUserCustomStorage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const customConfiguration = useQuery({
    queryKey: ['custom_vector_storage_configuration_get'],
    queryFn: getVectorsCustomStorage,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const {
    userInfo: { subs: userSubs },
    refreshUserData,
  } = useAuthCtx();

  const isBuilderPlan = userSubs.plan.paid && userSubs.plan.name === PRICING_PLANS_V4.BUILDER;
  const showUpgradeInfo = !userSubs.plan.paid || isBuilderPlan;

  const [selectedOption, setSelectedOption] = useState(OptionType.CONTINUE_FREE);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (selectedOption === OptionType.CONTINUE_FREE) {
      handleClick(useUserCustomStorage);
    } else {
      if (isBuilderPlan) {
        changePaymentPlan();
        return;
      }
      const startupPlanPricing = pricingTiers.find(
        (tier) => tier.name === PRICING_PLANS_V4.STARTUP,
      );
      const url = generatePricingUrl(
        startupPlanPricing?.buttonAction,
        startupPlanPricing?.priceIds,
      );
      navigateTo(url, false, '_blank');
    }
  };

  const changePaymentPlan = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/page/plans/subscriptions/v2/change-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newPriceIds:
            pricingTiers.find((tier) => tier.name === PRICING_PLANS_V4.STARTUP)?.priceIds ?? [],
          isUserAcknowledged: true,
        }),
      });
      await res.json();
      await refreshUserData();

      toast.success('Your subscription has been updated.');
      setTimeout(() => navigateTo('/my-plan', false), 500);
    } catch (error) {
      const errorMessage = extractError(error);
      toast.error(errorMessage || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      title="Create Data Space"
      isOpen={open}
      onClose={onClose}
      panelWidthClasses="min-w-[300px] md:w-[512px]"
      panelWrapperClasses="flex justify-center"
    >
      <div className="flex flex-col gap-4 mt-6">
        {/* Modal content */}
        <div>
          {showUpgradeInfo && (
            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              Set up a Data Space to unlock your agents' ability to search, automate, and learn from
              your data—using RAG and other tools.
            </p>
          )}

          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6 mb-6">
              {/* Data Space Name Input */}
              <CustomInput
                placeholder="Type Data Space Name"
                value={inputValue}
                onChange={handleChange}
                required
                fullWidth
                label="Name"
              />

              {/* Plan Selection */}
              {showUpgradeInfo && (
                <div className="w-full">
                  <div className="text-gray-700 mb-2 text-sm font-normal">Select Plan</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Continue for now option */}
                    <div className="relative">
                      <input
                        type="radio"
                        id="continue-free"
                        name="plan"
                        value="continue-free"
                        checked={selectedOption === OptionType.CONTINUE_FREE}
                        onChange={(e) => setSelectedOption(e.target.value as OptionType)}
                        className="sr-only"
                      />
                      <label
                        htmlFor="continue-free"
                        className={`flex flex-col p-4 rounded-md cursor-pointer transition-all duration-200 ${
                          selectedOption === OptionType.CONTINUE_FREE
                            ? 'border border-solid bg-blue-50 border-blue-500'
                            : 'border border-solid bg-gray-50 border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-gray-900 font-medium text-sm">Continue for now</h4>
                          <div
                            className={`w-4 h-4 border-2 rounded-full flex items-center justify-center ${
                              selectedOption === OptionType.CONTINUE_FREE
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-300'
                            }`}
                          >
                            <div
                              className={`w-1.5 h-1.5 bg-white rounded-full ${
                                selectedOption === OptionType.CONTINUE_FREE
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              }`}
                            ></div>
                          </div>
                        </div>
                        <p className="text-gray-600 text-xs">Limited features</p>
                      </label>
                    </div>

                    {/* Startup Plan */}
                    <div className="relative">
                      <input
                        type="radio"
                        id="startup"
                        name="plan"
                        value="startup"
                        checked={selectedOption === OptionType.STARTUP}
                        onChange={(e) => setSelectedOption(e.target.value as OptionType)}
                        className="sr-only"
                      />
                      <label
                        htmlFor="startup"
                        className={`flex flex-col p-4 rounded-md cursor-pointer transition-all duration-200 ${
                          selectedOption === OptionType.STARTUP
                            ? 'border border-solid bg-blue-50 border-blue-500'
                            : 'border border-solid bg-gray-50 border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h4
                            className={`font-medium text-sm ${
                              selectedOption === OptionType.STARTUP
                                ? 'text-blue-700'
                                : 'text-gray-900'
                            }`}
                          >
                            Startup
                          </h4>
                          <div
                            className={`w-4 h-4 border-2 rounded-full flex items-center justify-center ${
                              selectedOption === OptionType.STARTUP
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-300'
                            }`}
                          >
                            <div
                              className={`w-1.5 h-1.5 bg-white rounded-full ${
                                selectedOption === OptionType.STARTUP ? 'opacity-100' : 'opacity-0'
                              }`}
                            ></div>
                          </div>
                        </div>
                        <p
                          className={`text-xs ${
                            selectedOption === OptionType.STARTUP
                              ? 'text-blue-600'
                              : 'text-gray-600'
                          }`}
                        >
                          Get started now
                        </p>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Custom Storage Section - Smooth transition */}
            {!customConfiguration.isLoading && customConfiguration.data?.isConfigured && (
              <div
                className={`w-full transition-all duration-500 ease-in-out overflow-hidden ${
                  selectedOption === OptionType.CONTINUE_FREE
                    ? 'max-h-32 opacity-100 transform translate-y-0'
                    : 'max-h-0 opacity-0 transform -translate-y-2'
                }`}
              >
                <div className="pb-6">
                  <div
                    className={cn(
                      'flex items-center space-x-3 bg-white p-4 transition-colors duration-200',
                      'border border-solid border-gray-200 hover:border-gray-300 rounded-lg',
                    )}
                  >
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        value=""
                        className="sr-only peer"
                        checked={useUserCustomStorage}
                        onChange={(e) => {
                          setUseUserCustomStorage(e.target.checked);
                        }}
                      />
                      <div
                        className={cn(
                          'w-11 h-6 bg-gray-200 rounded-full',
                          'peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800',
                          'dark:border-gray-600 peer-checked:bg-blue-600',
                          'after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300',
                          'after:border after:rounded-full after:h-5 after:w-5 after:transition-all',
                          'dark:bg-gray-700 peer-checked:after:translate-x-full',
                          'peer-checked:after:border-white after:content-[\'\'] ',
                        )}
                      ></div>
                      <span className="flex flex-col items-start ml-3">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-300">
                          Use Custom Storage
                        </span>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Connect your saved storage configuration
                        </p>
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Plan-specific warnings */}
            {selectedOption === OptionType.CONTINUE_FREE && showUpgradeInfo && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
                <p className="text-amber-800 text-xs">
                  <strong>Note:</strong> Without upgrading to Startup, you will be unable to use RAG
                  applications and other advanced features.
                </p>
              </div>
            )}

            {/* Subscription info */}
            {selectedOption === OptionType.STARTUP && showUpgradeInfo && (
              <p className="text-gray-500 text-xs mb-4 flex flex-wrap">
                Continuing will start a monthly Startup plan subscription.&nbsp;
                <a
                  href="https://smythos.com/pricing/"
                  target="_blank"
                  className="text-blue-600 hover:text-blue-700 underline flex"
                >
                  Learn More <ArrowUpRightIcon className="w-4 h-4" />
                </a>
              </p>
            )}

            {/* Action buttons */}

            <Button
              className="w-full"
              loading={loading || isLoading}
              disabled={!inputValue.trim() || disableBtn}
              type="submit"
            >
              {showUpgradeInfo ? 'Continue' : 'Add Data Space'}
            </Button>
          </form>
        </div>

        {namespaceError && <div className="pt-2 text-red-600">{namespaceError}</div>}
      </div>
    </Modal>
  );
}
