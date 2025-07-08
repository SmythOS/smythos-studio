import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { useFeatureFlagPayload } from 'posthog-js/react';
import React, { ReactNode, useMemo } from 'react';
import {
  FEATURE_FLAG_PAYLOAD_RELEASE_TYPE,
  FEATURE_FLAGS,
} from '../../../../shared/constants/featureflags';

/**
 * Custom hook to check if the current environment is production.
 *
 * @returns {boolean} True if the current environment is production, false otherwise.
 */
export function useIsProdEnv(): boolean {
  const isProdEnv = useMemo(() => {
    // Check if the environment is production
    return process.env.NODE_ENV === 'production';
  }, []);

  return isProdEnv;
}

interface FeatureFlaggedProps {
  children: ReactNode;
  forceHidden?: boolean; // Optional prop to force feature to be hidden
  featureFlag: FEATURE_FLAGS;
  alternateContent?: ReactNode; // Optional prop to render alternate content when feature is hidden
}

/**
 * Custom hook to determine feature visibility and whether it should be shown
 * @param {FEATURE_FLAGS} featureFlag - The feature flag to check
 * @param {boolean} forceHidden - Optional flag to force hide the feature
 * @returns {boolean} - shouldShowFeature
 */
export const useFeatureVisibility = (
  featureFlag: FEATURE_FLAGS,
  forceHidden: boolean = false,
): boolean => {
  const isProdEnv = useIsProdEnv();
  const { isStaffUser, loading } = useAuthCtx();
  const featureFlagPayload = useFeatureFlagPayload(featureFlag);

  const visibility = useMemo(() => {
    if (!featureFlagPayload) {
      return false;
    }

    return typeof featureFlagPayload === 'object' && 'visibility' in featureFlagPayload
      ? featureFlagPayload.visibility
      : featureFlagPayload;
  }, [featureFlagPayload]);

  const shouldShowFeature = useMemo(() => {
    if (forceHidden) {
      return false;
    }

    if (visibility === FEATURE_FLAG_PAYLOAD_RELEASE_TYPE.ALPHA_STAGING) {
      return !isProdEnv && isStaffUser;
    }

    if (visibility === FEATURE_FLAG_PAYLOAD_RELEASE_TYPE.ALPHA && loading === false) {
      return isStaffUser;
    }

    if (
      visibility === FEATURE_FLAG_PAYLOAD_RELEASE_TYPE.GA ||
      visibility === FEATURE_FLAG_PAYLOAD_RELEASE_TYPE.PUBLIC
    ) {
      return true;
    }

    return true;
  }, [visibility, isStaffUser, forceHidden, isProdEnv, loading]);

  return shouldShowFeature;
};

export const FeatureFlagged: React.FC<FeatureFlaggedProps> = ({
  children,
  featureFlag,
  alternateContent,
  forceHidden = false,
}) => {
  const shouldShowFeature = useFeatureVisibility(featureFlag, forceHidden);
  return shouldShowFeature ? <>{children}</> : alternateContent ? <>{alternateContent}</> : null;
};
