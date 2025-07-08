/* eslint-disable max-len, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, no-console */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@src/react/shared/components/ui/card';
import { Tooltip } from 'flowbite-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  fetchCurrentCycleUsage,
  fetchLLMAndApiUsage,
} from '@react/features/analytics/client/usageAnalytics';
import { Button as CustomButton } from '@src/react/shared/components/ui/newDesign/button';
import { formatDate } from '@src/react/shared/utils/format';
import { teamSettingKeys } from '@src/shared/teamSettingKeys';
import classNames from 'classnames';
import { Loader2 } from 'lucide-react';
import { HiOutlineArrowRight } from 'react-icons/hi';
import { useAuthCtx } from '../../../shared/contexts/auth.context';
import { useGetTeamSettings, useStoreTeamSettings } from '../../teams/hooks/useTeamSettings';

// eslint-disable-next-line react-refresh/only-export-components
export const ENTERPRISE_PLAN_NAMES = [
  'Enterprise',
  'Enterprise T1',
  'Enterprise T2',
  'Enterprise T3',
  'Enterprise T4',
] as const;

const V4_PLAN_NAMES = [
  'builder',
  'startup',
  'scaleup',
  'enterprise t1',
  'enterprise t2',
  'enterprise t3',
  'enterprise t4',
];

function isValid(value: number | string | null | undefined): boolean {
  return value !== undefined && value !== null && value !== 0 && value !== '';
}

interface SimpleCardProps {
  title: string;
  value: number | string | null | undefined;
  description?: string;
  dataQa?: string;
}

/**
 * A simple card component that displays a title, value, and description
 * @param props SimpleCardProps containing title, value, and description
 * @returns React component displaying card with provided information
 */
const SimpleCard: React.FC<SimpleCardProps> = ({
  title,
  value,
  description = 'Current period',
  dataQa,
}) => {
  // Check if description is the default value or empty
  const isDescriptionEmpty = !description || description === 'Current period';

  return (
    <Card>
      <CardHeader className={classNames('pb-2', { 'pt-8': isDescriptionEmpty })}>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-qa={dataQa}>
          {value}
        </div>
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
      </CardContent>
    </Card>
  );
};

interface CancelSubscriptionCardProps {
  isCancelled: boolean;
}

// Stable BillingLimitCard component defined outside the main component
const BillingLimitCard = React.memo(
  ({
    initialBillingLimitSettings,
    storeTeamSettings,
    parentTeam,
    freeCredits,
  }: {
    initialBillingLimitSettings: any;
    storeTeamSettings: any;
    parentTeam: any;
    freeCredits: number;
  }) => {
    const [enableBillingLimit, setEnableBillingLimit] = useState(false);
    const [showSaved, setShowSaved] = useState(false);
    const [isSavingBillingLimit, setIsSavingBillingLimit] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [inputValue, setInputValue] = useState(freeCredits.toString());
    const [hasInputChanged, setHasInputChanged] = useState(false);

    const lastSavedValue = useRef(freeCredits);
    const hideTimeoutRef = useRef<NodeJS.Timeout>();
    const inputRef = useRef<HTMLInputElement>(null);
    const validationTimeoutRef = useRef<NodeJS.Timeout>();
    const isInitialized = useRef(false);

    // Initialize from settings only once - completely ignore subsequent changes
    const initialSettings = useRef(initialBillingLimitSettings);
    useEffect(() => {
      if (initialSettings.current && !isInitialized.current) {
        const savedValue = Math.max(
          initialSettings.current?.limitValue || freeCredits,
          freeCredits,
        );
        setEnableBillingLimit(initialSettings.current.isLimitEnabled);
        setInputValue(savedValue.toString());
        lastSavedValue.current = savedValue;
        isInitialized.current = true;
      }
    }, []); // Empty dependency array - only run once

    // Validation function
    const validateValue = useCallback(
      (value: number): { isValid: boolean; error: string } => {
        if (value < freeCredits) {
          return {
            isValid: false,
            error: `Your account comes with ${freeCredits} free credit! To ensure it's fully applied, please set your limit to above ${freeCredits}.`,
          };
        }
        return { isValid: true, error: '' };
      },
      [freeCredits],
    );

    const showSavedIndicator = useCallback(() => {
      setShowSaved(true);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      hideTimeoutRef.current = setTimeout(() => {
        setShowSaved(false);
      }, 1500);
    }, []);

    // Save function - only saves when explicitly called
    const saveValue = useCallback(
      (value: number, isEnabled: boolean) => {
        if (!parentTeam?.id) return;

        let validValue = value;
        const validation = validateValue(validValue);
        if (!validation.isValid) {
          // Auto-correct to freeCredits if invalid
          validValue = freeCredits;
          setInputValue(validValue.toString());
          setErrorMessage('');
        }

        const settingsData = {
          teamId: parentTeam?.id,
          limitValue: validValue,
          isLimitEnabled: isEnabled,
        };
        setIsSavingBillingLimit(true);

        lastSavedValue.current = validValue;
        storeTeamSettings.mutate(settingsData, {
          onSuccess: () => {
            showSavedIndicator();
          },
          onError: (error) => {
            console.error('Save failed:', error);
          },
          onSettled: () => {
            setIsSavingBillingLimit(false);
          },
        });
      },
      [parentTeam?.id, storeTeamSettings, showSavedIndicator, validateValue, freeCredits],
    );

    // Handle input changes (typing) with validation buffer
    const handleInputChange = useCallback(
      (newInputValue: string) => {
        setInputValue(newInputValue);

        const numericValue = parseInt(newInputValue) || 0;

        const preSaveBtnValidation = validateValue(numericValue);
        setHasInputChanged(preSaveBtnValidation.isValid);
        // Clear previous validation timeout
        if (validationTimeoutRef.current) {
          clearTimeout(validationTimeoutRef.current);
        }

        // Buffer validation for 800ms
        validationTimeoutRef.current = setTimeout(() => {
          const validation = validateValue(numericValue);
          setErrorMessage(validation.error);
        }, 800);
      },
      [validateValue],
    );

    // Handle input blur - correct only negative values to 0
    const handleInputBlur = useCallback(() => {
      const numericValue = parseInt(inputValue) || 0;
      if (numericValue < 0) {
        setInputValue('0');
        const validation = validateValue(0);
        setErrorMessage(validation.error);
      }
    }, [inputValue, validateValue]);

    // Handle toggle
    const handleToggle = useCallback(() => {
      const newEnabled = !enableBillingLimit;
      setEnableBillingLimit(newEnabled);

      // Use the last saved value, not the current input value
      const currentValue = lastSavedValue.current;

      // Save immediately when toggling
      saveValue(currentValue, newEnabled);
    }, [enableBillingLimit, saveValue]);

    // Handle save button click
    const handleSave = useCallback(() => {
      const currentValue = parseInt(inputValue) || 0;
      saveValue(currentValue, enableBillingLimit);
    }, [inputValue, enableBillingLimit, saveValue]);

    // Cleanup timeouts
    useEffect(() => {
      return () => {
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
        }
        if (validationTimeoutRef.current) {
          clearTimeout(validationTimeoutRef.current);
        }
      };
    }, []);

    return (
      <Card className="min-h-[150px]">
        <CardHeader className="pb-2 pt-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Set Billing Limit</CardTitle>
            <div className="flex items-center gap-4">
              <div
                className={`text-xs transition-opacity duration-300 text-[#45C9A9] ${
                  showSaved || isSavingBillingLimit ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {isSavingBillingLimit ? 'Saving...' : 'Saved'}
              </div>
              <button
                type="button"
                className={`relative w-11 h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${
                  enableBillingLimit ? 'bg-v2-blue' : 'bg-gray-200'
                }`}
                onClick={handleToggle}
                aria-pressed={enableBillingLimit}
                role="switch"
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${
                    enableBillingLimit ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div
            className={`absolute w-[calc(100%-48px)] top-[40%] ${
              !enableBillingLimit ? 'opacity-70 pointer-events-none' : ''
            }`}
          >
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              ref={inputRef}
              type="number"
              step="1"
              min={0}
              value={inputValue}
              disabled={!enableBillingLimit}
              className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#45C9A9] focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              onChange={(e) => handleInputChange(e.target.value)}
              onBlur={handleInputBlur}
            />
            {errorMessage && (
              <div className="absolute mt-1 text-sm text-red-500">{errorMessage}</div>
            )}
            {enableBillingLimit && hasInputChanged && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-v2-blue text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors disabled:opacity-50 w-14 text-center"
                onClick={() => {
                  setHasInputChanged(false);
                  handleSave();
                }}
                disabled={isSavingBillingLimit}
              >
                Save
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  },
  // Custom comparison function to prevent unnecessary re-renders
  (prevProps, nextProps) => {
    // Only re-render if essential props change (ignore initialBillingLimitSettings changes)
    return (
      prevProps.storeTeamSettings === nextProps.storeTeamSettings &&
      prevProps.parentTeam?.id === nextProps.parentTeam?.id &&
      prevProps.freeCredits === nextProps.freeCredits
    );
  },
);

BillingLimitCard.displayName = 'BillingLimitCard';

// Create a stable wrapper component that never re-renders
const StableBillingLimitWrapper = React.memo(
  ({
    billingLimitSettings,
    storeTeamSettings,
    parentTeam,
    freeCredits,
  }: {
    billingLimitSettings: any;
    storeTeamSettings: any;
    parentTeam: any;
    freeCredits: number;
  }) => {
    return (
      <BillingLimitCard
        initialBillingLimitSettings={billingLimitSettings}
        storeTeamSettings={storeTeamSettings}
        parentTeam={parentTeam}
        freeCredits={freeCredits}
      />
    );
  },
  () => true,
); // Always return true to prevent re-renders

StableBillingLimitWrapper.displayName = 'StableBillingLimitWrapper';

export default function SubscriptionAnalytics({
  isLoading,
  loadingCancelPlan,
  loadingRestartPlan,
  usage,
  tasksUsage,
  subs,
  handleUnsubscribe,
  handleUpgrade,
  getFormattedNumber,
  isReadOnlyAccess,
  hasWriteAccess,
  isCustomPlan,
  userDisplayName,
  loadingUpgrade,
}) {
  const [, setLlmAndApiUsage] = useState<any>(null); // llmAndApiUsage
  const [selectedMonth] = useState<Date>(new Date());
  const [showModelUsage, setShowModelUsage] = useState(false);
  const [modelLimit, setModelLimit] = useState(0);
  const [showLimitCard, setShowLimitCard] = useState(false);
  const [subscriptionPeriod, setSubscriptionPeriod] = useState<string>('');
  const [totalModelUsage, setTotalModelUsage] = useState<string>('0');

  const [isShowLimitFeature, setIsShowLimitFeature] = useState(
    subs?.plan?.properties?.flags?.modelCostMultiplier,
  );
  const { userInfo, userTeams } = useAuthCtx();
  const parentTeam = userTeams?.find((team) => !team.parentId);
  const { data: billingLimitSettings } = useGetTeamSettings(
    teamSettingKeys.BILLING_LIMIT,
    parentTeam?.id,
  );

  const freeCredits = subs?.properties?.freeCredits
    ? subs?.properties?.freeCredits
    : subs?.plan?.isDefaultPlan
    ? 5
    : 0;

  useEffect(() => {
    const fetchData = async () => {
      const data = await fetchLLMAndApiUsage(parentTeam?.id, selectedMonth);
      setLlmAndApiUsage(data);
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (subs?.plan?.properties?.flags?.modelCostMultiplier) {
      setShowModelUsage(true);
      setModelLimit(freeCredits);
    }
  }, [subs]);

  useEffect(() => {
    const isFreePlan = subs?.plan?.name.toLowerCase().includes('smythos free');
    const isV4Plan = V4_PLAN_NAMES.includes(subs?.plan?.name.toLowerCase());

    const subPeriodDate = (start: Date, end: Date) => {
      const startDate = new Date(start);
      const endDate = new Date(end);
      return `${formatDate(startDate.getTime() / 1000)} - ${formatDate(endDate.getTime() / 1000)}`;
    };

    if (isV4Plan && !isFreePlan) {
      setSubscriptionPeriod(
        subPeriodDate(subs.object.current_period_start, subs.object.current_period_end),
      );
    } else {
      // Get first and last day of current month
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Using 0 gets the last day of current month

      setSubscriptionPeriod(subPeriodDate(firstDay, lastDay));
    }
  }, [subs]);

  useEffect(() => {
    const fetchModelUsage = async () => {
      try {
        const currentCycleUsage = await fetchCurrentCycleUsage();
        setTotalModelUsage(Number(currentCycleUsage?.usage || 0).toFixed(2));
      } catch (error) {
        console.error('Error fetching model usage:', error);
        setTotalModelUsage('0');
      }
    };

    fetchModelUsage();
  }, []);

  // const totalModelUsage = useMemo(() => {
  //   if (!llmAndApiUsage) return 0;

  //   const totalUsage = (apiData: ApiData) => {
  //     let totalCost = 0;

  //     apiData.usage.analytics.forEach((team) => {
  //       // Add null check for team.data.days
  //       if (team.data?.days) {
  //         Object.values(team.data.days as any).forEach((day: any) => {
  //           Object.entries(day.agents || ({} as any)).forEach(([, agentData]: any) => {
  //             Object.values(agentData.sources || ({} as any)).forEach((source: any) => {
  //               Object.values(source).forEach((metric: any) => {
  //                 totalCost += metric.cost || 0;
  //               });
  //             });
  //           });
  //         });
  //       }
  //     });

  //     return Number(totalCost.toFixed(2));
  //   };

  //   return totalUsage(llmAndApiUsage);
  // }, [llmAndApiUsage]);

  // Load saved settings on component mount

  useEffect(() => {
    const isFree = subs?.plan?.name.toLowerCase() === 'smythos free';
    const parentTeamInitiator = userInfo?.user?.roles?.find(
      (role) => role?.sharedTeamRole?.team?.id === parentTeam?.id,
    )?.isTeamInitiator;

    // Show limit card for all paid plans (including Enterprise) when user is team initiator
    setShowLimitCard(parentTeamInitiator && subs?.plan?.paid && !isFree);
  }, [userInfo, subs, parentTeam]);

  const storeTeamSettings = useStoreTeamSettings(teamSettingKeys.BILLING_LIMIT, parentTeam?.id);

  function CancelSubscriptionCard({ isCancelled }: CancelSubscriptionCardProps) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left side - text content */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-4">
                Cancel Subscription
              </h2>
              <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                {isCancelled
                  ? 'Your subscription has been successfully canceled and will remain active until the end of your current billing cycle. You may subscribe again at any time.'
                  : 'Canceling your subscription will automatically downgrade your account to our free plan. Upon cancellation, your subscription will remain active until the end of your current billing cycle. This action is irreversible, but you may subscribe again at any time.'}
              </p>
            </div>

            {/* Right side - buttons */}
            <div className="flex flex-col lg:flex-row gap-3 shrink-0 items-center">
              {isReadOnlyAccess ? (
                <Tooltip content="You do not have permission to cancel a subscription.">
                  <div>
                    <CustomButton
                      variant="secondary"
                      handleClick={() => handleUnsubscribe('cancel')}
                      disabled={isCancelled || isReadOnlyAccess}
                      addIcon={loadingCancelPlan}
                      Icon={<Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      label={loadingCancelPlan ? 'Canceling...' : 'Cancel Subscription'}
                    />
                  </div>
                </Tooltip>
              ) : (
                <CustomButton
                  variant="secondary"
                  handleClick={() => handleUnsubscribe('cancel')}
                  disabled={isCancelled || isReadOnlyAccess}
                  addIcon={loadingCancelPlan}
                  Icon={<Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  label={loadingCancelPlan ? 'Canceling...' : 'Cancel Subscription'}
                />
              )}
              {isCancelled && hasWriteAccess && (
                <CustomButton
                  handleClick={() => handleUnsubscribe('restart')}
                  variant="primary"
                  disabled={loadingRestartPlan}
                  addIcon={loadingRestartPlan}
                  Icon={<Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  label={'Resubscribe'}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  function DataPoolCard() {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Data Pool Usage</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="h-full flex flex-col justify-center">
            {subs.plan.name !== 'SmythOS Free' ? (
              <div className="flex flex-col gap-0" data-qa="data-pool-usage">
                <span className="text-2xl font-bold">
                  {isValid(usage?.dataPools?.usedSize)
                    ? getFormattedNumber(usage?.dataPools?.usedSize)
                    : '0'}{' '}
                  {usage?.dataPools?.unit || 'GB'}
                </span>
                {subs?.plan?.paid && (
                  <span className="text-muted-foreground text-sm">
                    of{' '}
                    {isValid(subs?.plan?.properties?.limits?.dataPoolUsageGB)
                      ? `${getFormattedNumber(
                          subs?.plan?.properties?.limits?.dataPoolUsageGB,
                        )} ${'GB'}`
                      : 'Unlimited'}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-10">
                <div className="text-gray-500">
                  {isReadOnlyAccess ? (
                    <Tooltip content="You do not have permission to upgrade the plan">
                      <span
                        className="cursor-pointer text-[#3C89F9] underline"
                        onClick={() => handleUpgrade()}
                      >
                        Upgrade
                      </span>
                    </Tooltip>
                  ) : (
                    <span
                      className="cursor-pointer text-[#3C89F9] underline"
                      onClick={() => handleUpgrade()}
                    >
                      Upgrade
                    </span>
                  )}{' '}
                  to access data pool
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
  function BannerCard() {
    function GetCustomButton() {
      return (
        <CustomButton
          handleClick={handleUpgrade}
          disabled={isReadOnlyAccess || loadingUpgrade}
          variant="primary"
        >
          {loadingUpgrade ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin " />
              <span>
                {subs?.plan?.name === 'SmythOS Free'
                  ? 'Upgrading...'
                  : subs?.plan?.isCustomPlan || ENTERPRISE_PLAN_NAMES.includes(subs?.plan?.name)
                  ? 'Managing...'
                  : 'Changing...'}
              </span>
            </>
          ) : subs?.plan?.name === 'SmythOS Free' ? (
            'Upgrade Plan'
          ) : subs?.plan?.isCustomPlan || ENTERPRISE_PLAN_NAMES.includes(subs?.plan?.name) ? (
            'Manage Plan'
          ) : (
            'Change Plan'
          )}
        </CustomButton>
      );
    }
    return (
      <Card className="">
        <CardHeader className="border-b bg-v2-blue/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Plan Summary</CardTitle>
              <CardDescription className="text-base mt-1" data-qa="current-plan-text">{`${subs?.plan
                ?.name} ${userDisplayName ? '- ' + userDisplayName : ''}`}</CardDescription>
            </div>
            {isReadOnlyAccess ? (
              <Tooltip content="You do not have permission to change the subscription plan.">
                <div>{GetCustomButton()}</div>
              </Tooltip>
            ) : subs?.object?.cancel_at_period_end && hasWriteAccess ? (
              <Tooltip
                content="You have requested to cancel the subscription. Please re-subscribe to change the plan."
                className="w-[200px]"
              >
                <div className="opacity-50 pointer-events-none">{GetCustomButton()}</div>
              </Tooltip>
            ) : (
              GetCustomButton()
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-muted-foreground">
            {subs?.plan?.isCustomPlan ? (
              <>
                You are on a custom plan. Contact your account manager or{' '}
                <a
                  href="https://smythos.com/contact-us/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#3C89F9] hover:underline"
                >
                  support
                </a>{' '}
                for any changes or inquiries.
              </>
            ) : ENTERPRISE_PLAN_NAMES.includes(subs?.plan?.name) ? (
              <>
                You are currently subscribed to an Enterprise plan. Contact your account manager or{' '}
                <a
                  href="https://smythos.com/contact-us/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#3C89F9] hover:underline"
                >
                  support
                </a>{' '}
                for any changes or inquiries.
              </>
            ) : subs?.plan?.name === 'Scaleup' ? (
              <>
                You&apos;re on the Scaleup plan, which provides powerful features and high usage
                limits. If you need even more capabilities or customized solutions,{' '}
                <a
                  href="https://smythos.com/contact-us/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#3C89F9] hover:underline"
                >
                  contact us
                </a>{' '}
                to explore enterprise solutions.
              </>
            ) : subs?.plan?.name === 'Builder' || subs?.plan?.name === 'Startup' ? (
              <>
                You&apos;re on the {subs?.plan?.name} plan, which offers robust features and higher
                limits on core tools. If you need additional capabilities, explore our Scaleup plan
                for rapid-growth teams.
              </>
            ) : (
              `You are currently subscribed to a ${subs?.plan?.name} plan. Please upgrade to unlock more features.`
            )}
          </p>
        </CardContent>
      </Card>
    );
  }
  function ModelUsageCard() {
    return (
      <Card>
        <CardHeader className="pb-2 pt-6">
          <CardTitle className="text-base">Model Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {totalModelUsage >= freeCredits ? (
            <div className="flex flex-col pt-2">
              <div className="flex items-baseline gap-1" data-qa="model-use-total">
                <span className="text-2xl font-bold">${totalModelUsage}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm text-primary-pink">
                  You&apos;ve reached your credit limit. Credits will renew each billing period.
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col pt-2">
                <div data-qa="model-use-total">
                  <span className="text-2xl font-bold">${totalModelUsage} </span>
                  <span className="text-sm text-muted-foreground">
                    of ${modelLimit} in free credits
                  </span>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground mt-4">
                    Credits will renew each billing period.
                  </span>
                </div>
              </div>
            </>
          )}
          <a href="/analytics" className="text-xs text-[#3C89F9] hover:underline group">
            See Details{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1 align-middle">
              <HiOutlineArrowRight />
            </span>
          </a>
        </CardContent>
      </Card>
    );
  }

  function TaskConsumedCard() {
    return (
      <SimpleCard
        title="Total Tasks Consumed"
        value={isValid(tasksUsage?.tasks?.used) ? tasksUsage.tasks.used : 0}
      />
    );
  }
  function ActiveAgentsCard() {
    return (
      <SimpleCard
        title="Active Agents"
        value={isValid(usage?.activeAgents) ? usage?.activeAgents : 0}
        dataQa="active-agents-count"
      />
    );
  }

  const freeList = ['ModelUsageCard', 'DataPoolCard', 'TaskConsumedCard', 'ActiveAgentsCard'];
  const paidList = [
    'ModelUsageCard',
    'TaskConsumedCard',
    'BillingLimitCard',
    'ActiveAgentsCard',
    'DataPoolCard',
  ];

  // Use the stable wrapper that never re-renders
  const stableBillingComponent = (
    <StableBillingLimitWrapper
      key="stable-billing-wrapper"
      billingLimitSettings={billingLimitSettings}
      storeTeamSettings={storeTeamSettings}
      parentTeam={parentTeam}
      freeCredits={freeCredits}
    />
  );

  const subscriptionCards = useMemo(() => {
    return [
      {
        id: 'BillingLimitCard',
        component: () => stableBillingComponent,
        showCondition: showLimitCard && isShowLimitFeature,
        gridSpan: 'full',
      },
      {
        id: 'ModelUsageCard',
        component: ModelUsageCard,
        showCondition: showModelUsage,
      },
      {
        id: 'DataPoolCard',
        component: DataPoolCard,
        showCondition: true, // Always show
      },
      {
        id: 'TaskConsumedCard',
        component: TaskConsumedCard,
        showCondition: !showModelUsage,
      },
      {
        id: 'ActiveAgentsCard',
        component: ActiveAgentsCard,
        showCondition: true,
      },
    ];
  }, [showModelUsage, showLimitCard, isShowLimitFeature, subs, tasksUsage, usage]);

  const cardData = useMemo(() => {
    const shownCards = subscriptionCards.filter((card) => card.showCondition);
    if (shownCards.length <= 3) {
      return {
        count: 1,
        grid: [shownCards.length],
      };
    } else {
      return {
        count: 2,
        grid: shownCards.length === 4 ? [2, 2] : [2, 3],
      };
    }
  }, [subscriptionCards]);

  // Add window function to control showLimitCard
  useEffect(() => {
    (window as any).setShowLimitCard = (value: boolean) => {
      setIsShowLimitFeature(value);
    };

    // Cleanup function to remove the window property
    return () => {
      delete (window as any).setShowLimitCard;
    };
  }, []);

  return (
    <div className="w-full mx-auto pb-4 md:pb-6 space-y-8 font-sans">
      {/* Header - Always visible */}
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div className="space-y-1">
          <p className="text-muted-foreground">
            View your usage and manage your subscription settings
          </p>
        </div>
        {subscriptionPeriod && (
          <div className="bg-muted px-4 py-1.5 rounded-full text-sm">
            Current period: {subscriptionPeriod}
          </div>
        )}
      </div>

      {/* Content section with loading states */}
      {isLoading || !usage || !subs ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((index) => (
            <div key={index} className="p-4 border rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 rounded-full dark:bg-gray-700 w-3/4 mb-4" />
              <div className="space-y-3">
                <div className="h-3 bg-gray-200 rounded-full dark:bg-gray-700 w-full" />
                <div className="h-3 bg-gray-200 rounded-full dark:bg-gray-700 w-5/6" />
                <div className="h-3 bg-gray-200 rounded-full dark:bg-gray-700 w-4/6" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <BannerCard />
          {cardData.grid.map((columnCount, rowIndex) => {
            // Get the list of card IDs to show based on plan type
            const cardList = subs.plan.paid ? paidList : freeList;

            // First, get all visible components
            const visibleComponents = cardList
              .map((cardName) => {
                const card = subscriptionCards.find((c) => c.id === cardName);
                return card?.showCondition ? card : null;
              })
              .filter(Boolean);

            // Calculate start and end indices for current row
            const startIndex =
              rowIndex === 0
                ? 0
                : cardData.grid.slice(0, rowIndex).reduce((sum, count) => sum + count, 0);
            const endIndex = startIndex + columnCount;

            // Then slice the visible components for the current row
            const rowComponents = visibleComponents.slice(startIndex, endIndex);

            return rowComponents.length > 0 ? (
              <div
                key={`row-${rowIndex}`}
                className={`grid gap-6 md:grid-cols-${columnCount} mb-8`}
              >
                {rowComponents.map((card) => (
                  <card.component key={card.id} />
                ))}
              </div>
            ) : null;
          })}
          {subs?.plan?.paid && subs?.plan?.name !== 'Early Adopters' && !isCustomPlan && (
            <CancelSubscriptionCard isCancelled={subs?.object?.cancel_at_period_end || false} />
          )}
        </>
      )}
    </div>
  );
}
