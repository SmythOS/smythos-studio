import config from '@src/builder-ui/config';
import plansDev from '@src/react/features/subscriptions/data/enterprise-tiers-dev-v4.json';
import plansProd from '@src/react/features/subscriptions/data/enterprise-tiers-prod-v4.json';
import { FeatureFlagged } from '@src/react/shared/components/featureFlags';
import { EnterprisePlanIcon } from '@src/react/shared/components/svgs';
import { Input } from '@src/react/shared/components/ui/input';
import ConfirmModal from '@src/react/shared/components/ui/modals/ConfirmModal';
import { Button } from '@src/react/shared/components/ui/newDesign/button';
import { Spinner } from '@src/react/shared/components/ui/spinner';
import { useAuthCtx } from '@src/react/shared/contexts/auth.context';
import { extractError } from '@src/react/shared/utils/errors';
import { navigateTo } from '@src/react/shared/utils/general';
import { FEATURE_FLAGS } from '@src/shared/constants/featureflags';
import { FC, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaArrowRight, FaCheck } from 'react-icons/fa6';
import { toast } from 'react-toastify';

const enterpriseTiersData = config.env.IS_DEV ? plansDev : plansProd;

/**
 * Defines the structure for usage details.
 */
type UsageDetails = {
  weProvide: string;
  bringOwn: string;
  runTasks: string;
  runWeaver: string;
};

/**
 * Defines the structure for a feature.
 */
type Feature = {
  text: string;
};

/**
 * Defines the structure for a Stripe price id.
 */
type StripePriceId = {
  priceId: string;
  for: string;
};

/**
 * Defines the structure for an enterprise tier.
 */
type EnterpriseTier = {
  name: string;
  price: string;
  priceSubtext: string;
  description: string;
  features: Feature[];
  additionalFeatures: Feature[];
  usageDetails: UsageDetails;
  buttonText: string;
  buttonVariant: 'primary' | 'secondary';
  buttonAction: string;
  stripePriceIds: StripePriceId[];
};

/**
 * Parses and validates enterprise tier data from JSON
 * @throws {Error} If data does not match expected schema
 */
const enterpriseTiers: EnterpriseTier[] = (() => {
  /**
   * Validates if the given usage details match the expected schema.
   * @param details unknown value to be validated
   * @returns true if details is a valid UsageDetails object; otherwise, false.
   */
  const isValidUsageDetails = (details: unknown): details is UsageDetails => {
    return (
      typeof details === 'object' &&
      details !== null &&
      typeof (details as { weProvide: unknown }).weProvide === 'string' &&
      typeof (details as { bringOwn: unknown }).bringOwn === 'string' &&
      typeof (details as { runTasks: unknown }).runTasks === 'string' &&
      typeof (details as { runWeaver: unknown }).runWeaver === 'string'
    );
  };

  /**
   * Validates if the given array is a valid StripePriceId array.
   * @param arr - unknown value to validate.
   * @returns true if valid; false otherwise.
   */
  const isValidStripePriceIds = (arr: unknown): arr is StripePriceId[] => {
    return (
      Array.isArray(arr) &&
      arr.every(
        (item) =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as { priceId: unknown }).priceId === 'string' &&
          typeof (item as { for: unknown }).for === 'string',
      )
    );
  };

  /**
   * Validates if the given tier matches the expected EnterpriseTier schema.
   * @param tier unknown value to be validated
   * @returns true if tier is a valid EnterpriseTier; otherwise, false.
   */
  const isValidTier = (tier: unknown): tier is EnterpriseTier => {
    if (typeof tier !== 'object' || tier === null) return false;
    const t = tier as Record<string, unknown>;
    return (
      typeof t.name === 'string' &&
      typeof t.price === 'string' &&
      typeof t.priceSubtext === 'string' &&
      typeof t.description === 'string' &&
      Array.isArray(t.features) &&
      t.features.every((f) => typeof (f as Record<string, unknown>).text === 'string') &&
      isValidUsageDetails(t.usageDetails) &&
      typeof t.buttonText === 'string' &&
      (t.buttonVariant === 'primary' || t.buttonVariant === 'secondary') &&
      typeof t.buttonAction === 'string' &&
      isValidStripePriceIds(t.stripePriceIds)
    );
  };

  if (!Array.isArray(enterpriseTiersData) || !enterpriseTiersData.every(isValidTier)) {
    throw new Error('Enterprise tiers data does not match expected schema');
  }

  return enterpriseTiersData;
})();

/**
 * Generates a pricing URL by appending Stripe price id query parameters.
 * @param baseUrl - Base URL for navigation.
 * @param priceIds - Array of Stripe price id mappings.
 * @returns The generated URL with query parameters.
 */
const generatePricingUrl = (baseUrl: string, priceIds: StripePriceId[]): string => {
  const queryParams = priceIds
    .map(
      ({ priceId, for: forWhat }) =>
        `${encodeURIComponent(forWhat)}=${encodeURIComponent(priceId)}`,
    )
    .join('&');
  return `${baseUrl}?${queryParams}`;
};

type Props = {
  tierIndex: number;
};

/**
 * EnterpriseTierFrameV4 component to display the Enterprise tier information.
 *
 * @param {Props} props - Contains the index of the tier to display.
 * @returns {JSX.Element | null} Rendered enterprise tier UI or null if no tier is found.
 */
export const EnterpriseTierFrameV4: FC<Props> = ({ tierIndex }) => {
  const [loading, setLoading] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const { userInfo, loading: authLoading, refreshUserData } = useAuthCtx();
  const tier = enterpriseTiers[tierIndex];
  const [promoCode, setPromoCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [promoCodeInfo, setPromoCodeInfo] = useState({
    type: null,
    message: null,
  });

  /**
   * Gets the appropriate height class based on tier index
   * @returns {string} Tailwind height class
   */
  const getTierHeight = (): string => {
    switch (tierIndex) {
      case 0:
        return 'md:h-[485px]';
      case 1:
        return 'md:h-[465px]';
      case 2:
        return 'md:h-[525px]';
      case 4:
        return 'md:h-[580px]';
      default:
        return 'md:h-[525px]'; // Default fallback height
    }
  };

  /**
   * Handles the subscribe button click.
   * Generates a pricing URL with Stripe IDs and navigates to it.
   */
  const handleSubscribeClick = async (): Promise<void> => {
    setLoading(true);
    try {
      if (userInfo?.subs?.plan?.isCustomPlan) {
        toast.warn('You are on a custom plan, please contact support to change your plan.');
        return;
      }

      if (userInfo?.subs?.plan?.paid) {
        setShowConfirmationDialog(true);
        return;
      }

      if (tier.stripePriceIds && tier.stripePriceIds.length > 0) {
        const pricingUrl = generatePricingUrl(tier.buttonAction, tier.stripePriceIds);
        navigateTo(pricingUrl);
      } else {
        navigateTo(tier.buttonAction);
      }
    } catch (error) {
      toast.error(extractError(error) || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const changePaymentPlan = async (): Promise<void> => {
    try {
      setLoading(true);

      const res = await fetch('/api/page/plans/subscriptions/v2/change-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newPriceIds: tier.stripePriceIds,
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
      toast.error(errorMessage || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      setPromoCode('');
    }
  };

  const closeConfirmationDialog = (): void => {
    setShowConfirmationDialog(false);
    setLoading(false);
    setIsLoading(false);
    setPromoCodeInfo({
      type: null,
      message: null,
    });
    setPromoCode('');
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

  /**
   * Renders the tier UI.
   * @returns {JSX.Element | null}
   */
  const renderTierUI = (): JSX.Element | null => {
    if (!tier) return null;

    return (
      <>
        {/* Subtracting top navbar height (88px) and content padding (48px) from viewport height to maintain vertical centering */}
        <div className="font-sans flex items-center justify-center h-full min-h-[calc(100vh-136px)]">
          <div className="container mx-auto px-4">
            <div className="flex justify-center">
              <div
                className={`pricing-tier-item bg-white border border-solid border-[#313131] border-opacity-30 rounded-2xl w-full max-w-[360px] md:max-w-[340px] ${getTierHeight()} h-max overflow-hidden flex flex-col`}
              >
                <div className="pricing-tier-item-header h-[7rem] min-h-[7rem] bg-[#F5F5F5] flex flex-col gap-1 p-4 border-b-1 border-solid border-[#313131] border-opacity-30">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <EnterprisePlanIcon />
                      <h2 className="text-base font-bold">{tier.name}</h2>
                    </div>
                  </div>
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-1">
                      <span className="text-[32px] font-semibold">{tier.price}</span>
                      {tier.priceSubtext && (
                        <span className="text-[10px] text-[#3D3D3D]">{tier.priceSubtext}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pricing-tier-item-content p-4 flex-grow">
                  <p className="text-sm">{tier.description}</p>

                  {/* Button - Forced to Enterprise button style matching EnterprisePlanFrame.tsx */}
                  <div className="pricing-tier-item-footer mt-6">
                    <button
                      onClick={handleSubscribeClick}
                      disabled={loading || authLoading}
                      className="
                      w-full
                      bg-[#24242403] text-[#242424] hover:bg-[#000000]/10 border-[#474747]
                      text-[13px] h-12 rounded-xl border border-solid font-bold
                      flex items-center justify-center gap-3
                      group
                      transition-all duration-300 ease-in-out
                      disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>{loading ? 'Subscribing ... ' : tier.buttonText}</span>
                      {loading || authLoading ? <Spinner classes="w-4 h-4" /> : null}
                    </button>
                  </div>

                  {/* Features – Updated to match EnterprisePlanFrame font size */}
                  <div className="mt-8 text-sm text-[#767676] px-4">
                    <ul className="flex flex-col gap-4 mt-4">
                      {tier.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-4">
                          <FaCheck className="flex-shrink-0" />
                          <span>{feature.text}</span>
                        </li>
                      ))}
                      {tier?.additionalFeatures?.map((feature, index) => (
                        <li key={index} className="flex items-center gap-4">
                          <FaCheck className="flex-shrink-0" style={{ color: '#45C9A9' }} />
                          <span>{feature.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
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
                    <span className="text-base font-medium">{userInfo?.subs?.plan?.name}</span>
                    <FaArrowRight className="text-gray-400" />
                    <div className="flex items-center justify-center px-4 py-1  rounded-full bg-blue-500">
                      <span className="text-base font-medium text-white">New</span>
                    </div>
                    <span className="text-base font-medium">{tier?.name}</span>
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

  return (
    <FeatureFlagged
      featureFlag={FEATURE_FLAGS.NEW_PRICING_COLUMNS}
      alternateContent={renderTierUI()}
    >
      {renderTierUI()}
    </FeatureFlagged>
  );
};
