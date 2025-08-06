import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaAngleRight, FaArrowRight, FaCheck } from 'react-icons/fa6';
import { toast } from 'react-toastify';

import { BuildAgents } from '@react/features/subscriptions/components/plans/build-agents';
import config from '@src/frontend/config';
import plansDev from '@src/react/features/subscriptions/data/plans.v4.dev.json';
import plansProd from '@src/react/features/subscriptions/data/plans.v4.prod.json';
import { generatePricingUrl } from '@src/react/features/subscriptions/utils';
import { FeatureFlagged } from '@src/react/shared/components/featureFlags';
import {
  BuilderPlanIcon,
  EnterprisePlanIcon,
  FreePlanIcon,
  ScaleupPlanIcon,
  StartupPlanIcon,
} from '@src/react/shared/components/svgs';
import { Input } from '@src/react/shared/components/ui/input';
import ConfirmModal from '@src/react/shared/components/ui/modals/ConfirmModal';
import { Button } from '@src/react/shared/components/ui/newDesign/button';
import { Spinner } from '@src/react/shared/components/ui/spinner';
import { NEW_ENTERPRISE_PLAN_REDIRECT } from '@src/react/shared/constants/navigation';
import { useAuthCtx } from '@src/react/shared/contexts/auth.context';
import { PRICING_PLANS } from '@src/react/shared/enums';
import { TeamSubs } from '@src/react/shared/types/subscription';
import { extractError } from '@src/react/shared/utils/errors';
import { navigateTo } from '@src/react/shared/utils/general';
import { FEATURE_FLAGS } from '@src/shared/constants/featureflags';
import { Analytics } from '@src/shared/posthog/services/analytics';

const pricingTiers = config.env.IS_DEV ? plansDev : plansProd;

type PricingFeature = {
  text: string;
};

type PricingTier = {
  name: string;
  price: string;
  subs: TeamSubs;
  stripeId?: string;
  buttonText: string;
  description: string;
  priceSubtext: string;
  buttonAction: string;
  features: PricingFeature[];
  additionalFeatures: PricingFeature[];
  buttonVariant: 'primary' | 'secondary';
  priceIds?: { priceId: string; for: string }[]; // Add this line to type priceIds
};

const PricingTierItem: FC<PricingTier> = ({
  name,
  price,
  subs,
  features,
  additionalFeatures,
  buttonText,
  description,
  buttonAction,
  priceSubtext,
  buttonVariant,
  priceIds,
}) => {
  const { userInfo, refreshUserData } = useAuthCtx();
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEnterprise = name.toLowerCase() === PRICING_PLANS.ENTERPRISE.toLowerCase();
  const isFree = name.toLowerCase() === PRICING_PLANS.FREE_FOREVER.toLowerCase();
  const [promoCode, setPromoCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [promoCodeInfo, setPromoCodeInfo] = useState({
    type: null,
    message: null,
  });

  const isCurrentPlan = useCallback(
    (planName: string) => {
      return planName.toLowerCase() === subs?.plan?.name.toLowerCase();
    },
    [subs?.plan?.name],
  );

  const closeConfirmationDialog = () => {
    setShowConfirmationDialog(false);
    setPromoCodeInfo({
      type: null,
      message: null,
    });
    setPromoCode('');
  };

  const changePaymentPlan = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/page/plans/subscriptions/v2/change-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newPriceIds: priceIds,
          isUserAcknowledged: true,
          ...(promoCode.trim() ? { promoCode: promoCode.trim() } : {}),
        }),
      });
      await res.json();
      await refreshUserData();
      window.location.href = '/my-plan?upgraded=true';
      setShowConfirmationDialog(false);
    } catch (error) {
      const errorMessage = extractError(error);
      if (errorMessage === 'Invalid promo code') {
        return setPromoCodeInfo({ type: 'error', message: errorMessage });
      }

      setShowConfirmationDialog(false);
      if (
        errorMessage === 'Team does not subscribe to any paid plan' &&
        subs?.plan?.name === 'Early Adopters'
      ) {
        toast.error(
          "Early Adopter is a custom plan and can't be changed directly. Contact support to change your plan.",
        );
      } else {
        toast.error(errorMessage || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
      setPromoCode('');
    }
  };

  const getPlanIcon = (planName: string): JSX.Element => {
    const lowerCasePlanName = planName.toLowerCase();

    switch (lowerCasePlanName) {
      case 'free':
        return <FreePlanIcon />;
      case 'builder':
        return <BuilderPlanIcon />;
      case 'startup':
        return <StartupPlanIcon />;
      case 'scaleup':
        return <ScaleupPlanIcon />;
      case 'enterprise':
        return <EnterprisePlanIcon />;
      default:
        return <FreePlanIcon />;
    }
  };

  const handleButtonClick = () => {
    Analytics.track(`app_${name.toLowerCase()}_plan_clicked`, {
      currentPlan: subs?.plan?.name.toLowerCase(),
      userEmail: userInfo?.user?.email,
    });

    try {
      let url = buttonAction;

      if (name.toLowerCase() === PRICING_PLANS.FREE.toLowerCase()) {
        navigateTo('/');
        return;
      }

      if (isEnterprise) {
        // Try using window.open as a fallback if navigateTo doesn't work
        const opened = window.open(NEW_ENTERPRISE_PLAN_REDIRECT, '_blank');
        if (!opened) {
          navigateTo(NEW_ENTERPRISE_PLAN_REDIRECT, false, '_blank');
        }
        return;
      }

      // if user is on a paid plan, redirect to the subscription page
      if (subs?.plan?.paid && !subs?.plan?.isCustomPlan) {
        setShowConfirmationDialog(true);
        return;
      }

      // Add query parameters for priceIds if they exist
      if (priceIds && priceIds.length > 0) {
        url = generatePricingUrl(url, priceIds);
      }

      navigateTo(url);
    } catch (error) {}
  };

  const getButtonContent = () => {
    if (loading) return <Spinner classes="w-4 h-4" />;
    if (isCurrentPlan(name)) return 'Current Plan';
    return buttonText;
  };

  const handlePromoCodeValidation = async () => {
    if (promoCode.trim() === '') {
      return setPromoCodeInfo({ type: 'error', message: 'Please enter a promo code' });
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/page/plans/subscriptions/validate-promo-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          promoCode: promoCode.trim(),
        }),
      });
      const data = await res.json();
      if (data?.valid) {
        setPromoCodeInfo({ type: 'success', message: 'Promo code applied' });
      }
    } catch (error) {
      const errorMessage = extractError(error);
      setPromoCodeInfo({ type: 'error', message: errorMessage });
      setPromoCode('');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFree) {
    return (
      <>
        <div className="w-full max-w-[360px] md:max-w-full mx-auto">
          <div className="w-full flex items-center gap-2 my-2 md:px-4">
            <span className="text-[16px] font-bold">Public</span>
            <div className="h-[1px] bg-[#313131] opacity-30 flex-1" />
          </div>
          <div className="bg-white border border-solid border-[#313131] border-opacity-30 rounded-2xl overflow-hidden">
            {/* Add header section to match other cards */}
            <div className="pricing-tier-item-header h-[7rem] min-h-[7rem] flex flex-col gap-1 p-4 border-opacity-30 md:hidden">
              <div className="flex items-center gap-2">
                {getPlanIcon(name.toLowerCase())}
                <h2 className="text-base font-bold">{name}</h2>
              </div>
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1">
                  <span className="text-[32px] font-semibold">{price}</span>
                </div>
              </div>
            </div>

            <div className="p-4 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 md:gap-8">
                {/* Column 1: Info */}
                <div className="flex flex-col md:col-span-2 lg:col-span-1">
                  <div className="hidden md:flex items-center gap-2">
                    {getPlanIcon(name.toLowerCase())}
                    <h2 className="text-base font-bold">{name}</h2>
                  </div>
                  <div className="hidden md:block mt-2">
                    <span className="text-[32px] font-bold">{price}</span>
                  </div>
                  <p className="text-[13px] font-normal tracking-[-0.02em] md:mt-2">
                    {description}
                  </p>

                  {/* Mobile-only button */}
                  <div className="mt-4 -mb-2 lg:hidden">
                    <button
                      onClick={handleButtonClick}
                      disabled={loading || isCurrentPlan(name)}
                      className={`
                      w-full
                      ${
                        buttonVariant === 'primary'
                          ? 'bg-[#43caa9] text-white hover:bg-[#43caa9]/90 border-[#43caa9]'
                          : 'bg-[#24242403] text-[#242424] hover:bg-[#000000]/10 border-[#474747]'
                      }
                      text-[13px] h-12 rounded-xl border border-solid font-bold
                      flex items-center justify-center gap-3
                      group
                      transition-all duration-300 ease-in-out
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                    >
                      <span>{getButtonContent()}</span>
                    </button>
                  </div>
                </div>
                {/* Features Container */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3 md:gap-10 md:col-span-2 lg:col-span-3 px-4 md:px-0">
                  <div className="flex flex-col gap-1 md:px-4">
                    {features.slice(0, 4).map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center text-[#6B7280] text-[12px] font-medium gap-2"
                      >
                        <FaCheck className="flex-shrink-0" />
                        <span>{feature.text}</span>
                      </div>
                    ))}
                    <div>
                      <hr className="border-[#313131] border-opacity-30 my-1 mb-2 md:mb-1" />
                    </div>
                    {additionalFeatures?.map((feature, index) => (
                      <div key={index} className="flex items-center text-[11px] font-medium gap-2">
                        <FaCheck className="text-[#45C9A9] flex-shrink-0" />
                        <span className="text-[#6B7280]">{feature.text}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3 md:px-4 mt-4 md:mt-0">
                    <h3 className="text-[#242424] text-[12px] font-bold tracking-[-0.02em]">
                      Commitment to Open Agents
                    </h3>
                    <p className="text-[12px] font-normal tracking-[-0.02em]">
                      <span className="font-bold">SmythOS</span> believes the AI Agent revolution
                      should be accessible to everyone.
                    </p>
                    <p className="text-[12px] font-normal tracking-[-0.02em]">
                      So we made our world class visual IDE free for building public, open source
                      agents. Moreover, you can run them on your own hardware at no cost.
                    </p>
                    <p className="text-[#0366D6] text-[12px] italic">
                      - Michael, Alexander & Gary, SmythOS founders
                    </p>
                  </div>
                </div>

                {/* Column 5: Button (Desktop only) */}
                <div className="hidden lg:flex justify-center items-center h-full">
                  <button
                    onClick={handleButtonClick}
                    disabled={loading || isCurrentPlan(name)}
                    className={`
                    w-full
                    ${
                      buttonVariant === 'primary'
                        ? 'bg-[#43caa9] text-white hover:bg-[#43caa9]/90 border-[#43caa9]'
                        : 'bg-[#24242403] text-[#242424] hover:bg-[#000000]/10 border-[#474747]'
                    }
                    text-[13px] h-12 rounded-xl border border-solid font-bold
                    flex items-center justify-center gap-3
                    group
                    transition-all duration-300 ease-in-out
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                  >
                    <span>{getButtonContent()}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="w-full flex items-center gap-2 mt-4 md:px-4">
            <span className="text-[16px] font-bold">Private</span>
            <div className="h-[1px] bg-[#313131] opacity-30 flex-1" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="pricing-tier-item bg-white border border-solid border-[#313131] border-opacity-30 rounded-2xl w-full min-w-[260px] max-w-[360px] md:max-w-[340px] md:h-[610px] h-max overflow-hidden flex flex-col">
        <div className="pricing-tier-item-header h-[7rem] min-h-[7rem] bg-[#F5F5F5] flex flex-col gap-1 p-4 border-b-1 border-solid border-[#313131] border-opacity-30">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              {getPlanIcon(name.toLowerCase())}
              <h2 className="text-base font-bold">{name}</h2>
            </div>

            {name === 'Builder' && (
              <span className="bg-[#43caa9] text-white text-xs font-semibold px-2 py-1 rounded">
                Most Popular
              </span>
            )}
          </div>
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-1">
              <span className="text-[32px] font-semibold">{price}</span>
              {priceSubtext && <span className="text-[12px] text-[#3D3D3D]">{priceSubtext}</span>}
            </div>
          </div>
        </div>
        <div className="pricing-tier-item-content p-4 flex-grow">
          <p className="text-[13px] font-normal tracking-[-0.02em]">{description}</p>
          <div className="pricing-tier-item-footer mt-4">
            <button
              onClick={handleButtonClick}
              disabled={loading || isCurrentPlan(name)}
              className={`
            w-full
            ${
              buttonVariant === 'primary'
                ? 'bg-[#43caa9] text-white hover:bg-[#43caa9]/90 border-[#43caa9]'
                : 'bg-[#24242403] text-[#242424] hover:bg-[#000000]/10 border-[#474747]'
            }
            text-[13px] h-12 rounded-xl border border-solid font-bold
            flex items-center justify-center gap-3
            group
            transition-all duration-300 ease-in-out
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
            >
              <span>{getButtonContent()}</span>
            </button>
          </div>
          <div className="mt-2 text-[12px] font-medium text-[#767676] px-4">
            <ul className="flex flex-col gap-1 mt-4">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-4">
                  <FaCheck /> {feature.text}
                </li>
              ))}
              {additionalFeatures && additionalFeatures.length > 0 && (
                <li>
                  <hr className="border-[#313131] border-opacity-30 my-1 mb-2" />
                </li>
              )}
              {additionalFeatures?.map((feature, index) => (
                <li key={`additional-${index}`} className="flex items-center gap-4">
                  <FaCheck color="#45C9A9" /> {feature.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      {showConfirmationDialog &&
        createPortal(
          <ConfirmModal
            onClose={() => closeConfirmationDialog()}
            handleConfirm={() => changePaymentPlan()}
            label="Confirm"
            message="Confirm Your Changes"
            isLoading={loading}
            children={
              <div className="pl-4 pr-6 mb-6 mt-4">
                <div className="flex items-center justify-start gap-4 mb-6">
                  <div className="flex items-center justify-center px-4 py-1 rounded-full border border-solid border-[#313131] border-opacity-30">
                    <span className="text-base font-medium">Current</span>
                  </div>
                  <span className="text-base font-medium">{subs?.plan?.name}</span>
                  <FaArrowRight className="text-gray-400" />
                  <div className="flex items-center justify-center px-4 py-1  rounded-full bg-blue-500">
                    <span className="text-base font-medium text-white">New</span>
                  </div>
                  <span className="text-base font-medium">{name}</span>
                </div>
                <p className="font-normal text-base text-[#1E1E1E] mt-6 mb-6">
                  Once you confirm, your new plan goes live right away with refreshed credits,
                  seats, storage, and model usage.
                </p>
                <div className="flex items-end gap-2">
                  <Input
                    label="Have a Coupon?"
                    onChange={(e) => {
                      if (promoCodeInfo.type) {
                        setPromoCodeInfo({
                          type: null,
                          message: null,
                        });
                      }

                      setPromoCode(e.target.value);
                    }}
                    value={promoCode}
                    fullWidth
                  />
                  <div className="w-[20%]">
                    <Button
                      handleClick={() => handlePromoCodeValidation()}
                      label="Apply"
                      variant="secondary"
                      loading={isLoading}
                      disabled={isLoading}
                      fullWidth
                    />
                  </div>
                </div>

                {promoCodeInfo.type && (
                  <p
                    className={`${
                      promoCodeInfo.type === 'error' ? 'text-red-500' : 'text-blue-500'
                    } text-sm mt-2`}
                  >
                    {promoCodeInfo.message.replace('promo', 'coupon')}
                  </p>
                )}
              </div>
            }
          />,
          document.body,
        )}
    </>
  );
};

/**
 * PlansFrameV4 component renders the pricing plans.
 *
 * When embedded as an auto-expanding iframe, we override the scroll styles
 * on the root containers (html, body, main) to remove duplicate scrollbars.
 */
export const PlansPricingPage: FC<{ isInternalPage?: boolean }> = ({ isInternalPage }) => {
  const { userInfo } = useAuthCtx();
  const subs = userInfo?.subs;

  // If this page is embedded inside an iframe, remove the internal scrollbar.
  useEffect(() => {
    // Check if the current window is inside an iframe.
    if (window.self !== window.top) {
      // Create a new style element with high specificity.
      const styleElement: HTMLStyleElement = document.createElement('style');
      styleElement.type = 'text/css';
      styleElement.id = 'iframe-scrollbar-override';
      // Override scroll settings for the root elements.
      styleElement.innerHTML = `
        html, body, main {
          overflow: visible !important;
          height: auto !important;
        }
      `;
      document.head.appendChild(styleElement);

      // Cleanup: remove the style element on unmount.
      return () => {
        const existingStyleElement = document.getElementById('iframe-scrollbar-override');
        if (existingStyleElement && existingStyleElement.parentNode) {
          existingStyleElement.parentNode.removeChild(existingStyleElement);
        }
      };
    }
  }, []);

  const renderPlanFrameUI = () => {
    const filteredPaidTiers = useMemo(
      () =>
        pricingTiers.filter((tier) => {
          return tier.name.toLowerCase() !== PRICING_PLANS.FREE_FOREVER.toLowerCase();
        }),
      [userInfo?.user?.id],
    );
    const filteredFreeTiers = useMemo(
      () =>
        pricingTiers.filter((tier) => {
          return tier.name.toLowerCase() === PRICING_PLANS.FREE_FOREVER.toLowerCase();
        }),
      [userInfo?.user?.id],
    );

    return (
      <div className="pricing-page-iframe ml-16 md:ml-0" data-iframe-height>
        {isInternalPage && (
          <div className="flex flex-col items-center md:items-start my-4">
            <h2 className="text-lg font-bold">Manage Your Subscription</h2>
            <p className="text-base text-gray-700">Current Plan: {subs?.plan?.name}</p>
          </div>
        )}
        <div className="pricing-plans-container flex flex-col items-center gap-3 w-full">
          {!userInfo?.user?.id && filteredFreeTiers.length > 0 && (
            <div className="w-full md:w-[96%] lg:w-full xl:w-full 2xl:w-[98%] flex flex-wrap justify-center gap-3">
              {filteredFreeTiers.map((tier: any, index) => (
                <PricingTierItem
                  key={index}
                  {...tier}
                  subs={subs}
                  buttonVariant={tier.buttonVariant as 'primary' | 'secondary'}
                />
              ))}
            </div>
          )}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 place-items-center">
            {filteredPaidTiers.map((tier: any, index) => (
              <PricingTierItem
                key={index}
                {...tier}
                subs={subs}
                buttonVariant={tier.buttonVariant as 'primary' | 'secondary'}
              />
            ))}
          </div>
        </div>

        {/* Rest of the existing content */}
        {isInternalPage && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => navigateTo('https://smythos.com/pricing/', false, '_blank')}
              className="
            w-48 bg-[#242424] text-white hover:bg-[#242424d9]
            text-[13px] h-10 rounded-lg border border-solid border-[#474747] font-medium
            flex items-center justify-center gap-3 group transition-all duration-300 ease-in-out"
            >
              <span>Compare All Plans</span>
              <FaAngleRight
                fontSize={13}
                color="#fff"
                className="transition-transform duration-300 ease-in-out group-hover:translate-x-1"
              />
            </button>
          </div>
        )}

        {/* <div className="mt-8 md:mt-12 flex gap-6 md:gap-12 flex-col md:flex-row justify-center items-center text-center">
          <div>
            <StartIcon className="mx-auto mb-2" />
            <p>Rated 4.9/5 stars in 100+ reviews</p>
          </div>
          <div>
            <UserFeedbackIcon className="mx-auto mb-2" />
            <p>Incredible Support Community</p>
          </div>
        </div> */}

        <BuildAgents />
      </div>
    );
  };

  return (
    <FeatureFlagged
      featureFlag={FEATURE_FLAGS.NEW_PRICING_COLUMNS}
      alternateContent={renderPlanFrameUI()}
    >
      {renderPlanFrameUI()}
    </FeatureFlagged>
  );
};
