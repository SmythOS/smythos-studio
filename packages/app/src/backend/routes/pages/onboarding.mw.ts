//This middleware is in pages folder because it is used by router only.

import express from 'express';
import * as userData from '../../../backend/services/user-data.service';
import { TRIMMED_PLANS } from '../../../shared/constants/general';
import { sanitizeRedirectPath } from '../../../shared/utils';
import config from '../../config';
import {
  IUserBookAnIntroCall,
  IUserMarketingMetadata,
  UserSettingsKey,
} from '../../types/user-data';
import { storeBuildingData } from '../api/page/onboard';

const pageRedirects = {
  '/agents': '/agents',
  '/welcome': '/agents',
  '/domains': '/domains',
  '/templates': '/templates',
  '/plans': '/plans',
  '/vault': '/vault',
  '/builder': '/builder',
};

export async function checkOnboarding(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const redirectPath = pageRedirects['/' + req.path.split('/')[1]];
  let postHogSignupEvents = [];
  if (!redirectPath) {
    return next();
  }
  // log previous urls from browser history
  const { accessToken } = req.user;
  const isSignIn = req.query?.signin;
  //remove only signin from query params
  const { signin, ...rest } = req.query;
  const isOnWelcomePage = req.path.startsWith('/welcome') || req.path.includes('book-intro-call');
  req.query = rest;
  if (!accessToken) {
    res.locals.ejsOnboardingData = {
      postHogSignupEvents,
      isCallBooked: true,
    };
    return next();
  }
  const [userMetadata, userSignupData, userBookAnIntroCall] = await Promise.all([
    userData.getUserSettings<IUserMarketingMetadata>(
      accessToken,
      UserSettingsKey.UserMarketingMetadata,
    ),
    userData.getUserSettings<IUserMarketingMetadata>(accessToken, UserSettingsKey.HasSignedUp),
    userData.getUserSettings<IUserBookAnIntroCall>(
      accessToken,
      UserSettingsKey.UserBookAnIntroCall,
    ),
  ]);

  // Check if the intro call is booked by safely accessing the property
  const isCallBooked = Array.isArray(userBookAnIntroCall)
    ? false
    : typeof userBookAnIntroCall?.introCallBooked === 'boolean';

  // Get plan name, accounting for possible array type
  const callPlanName = Array.isArray(userBookAnIntroCall)
    ? undefined
    : userBookAnIntroCall?.planName;

  // For Old users who have Meta data but not signed up data
  if (Object.keys(userMetadata).length && !Object.keys(userSignupData).length) {
    await userData.saveUserSettings(accessToken, UserSettingsKey.HasSignedUp, true);
  }

  if (!Object.keys(userMetadata).length) {
    const originalPath = req.originalUrl || redirectPath;
    const eventType = req.query?.chat ? 'weaver_signup' : 'simple_signup';
    let source = req.query?.source;
    if (!source && req.query?.redirect) {
      const url = new URL(req.query.redirect as string, config.env.UI_SERVER);
      source = url.searchParams.get('source');
    }
    let from = req.query?.from;
    if (!from && req.query?.redirect) {
      const url = new URL(req.query.redirect as string, config.env.UI_SERVER);
      from = url.searchParams.get('from');
    }
    const eventData = {
      ...((req.query?.chat || source === 'marketingSite') && from ? { source: from } : {}),
      page_url: '/welcome/jobtype',
    };
    if (!Object.keys(userSignupData).length) {
      postHogSignupEvents.push({ eventType, eventData });
    }

    // If they're going to /builder with a chat query parameter and haven't signupData yet, they skip the redirect
    if (
      !(redirectPath === '/builder' && req.query?.chat && !Object.keys(userSignupData).length) &&
      !isOnWelcomePage
    ) {
      const safePath = sanitizeRedirectPath(originalPath);
      res.locals.ejsOnboardingData = {
        postHogSignupEvents,
        isCallBooked: isCallBooked,
      };
      res.redirect(`/welcome?redirect=${encodeURIComponent(safePath)}`);
      return;
    }
  }
  if (!Object.keys(userSignupData).length) {
    const [saveUserSettings, storeData] = await Promise.all([
      userData.saveUserSettings(accessToken, UserSettingsKey.HasSignedUp, true),
      req.query.chat
        ? await storeBuildingData(accessToken, req.query.chat as string, req.user.claims.email)
        : Promise.resolve(),
    ]);
  }
  const isPaidPlan: boolean =
    TRIMMED_PLANS.filter(
      (plan) =>
        req?._team?.subscription?.plan?.name?.toLowerCase()?.indexOf(plan.toLowerCase()) !== -1,
    ).length > 0;
  //If user is a free user and his was shown popup then we need to reset it.
  if (!isPaidPlan && callPlanName) {
    userData.putUserSettings(accessToken, UserSettingsKey.UserBookAnIntroCall, {
      introCallBooked: true,
      planName: '',
    });
  }

  let needIntroCall =
    isPaidPlan &&
    isSignIn &&
    !(
      callPlanName?.toLowerCase?.()?.length > 0 &&
      req?._team?.subscription?.plan?.name
        ?.toLowerCase?.()
        ?.indexOf(callPlanName?.toLowerCase?.()) !== -1
    );

  const isOnBookIntroCall = req.path.includes('book-intro-call');

  // If on book-intro-call page, don't redirect regardless of userMetadata
  if (isOnBookIntroCall) {
    res.locals.ejsOnboardingData = {
      postHogSignupEvents,
      isCallBooked: false,
    };
    return next();
  }

  // Normal welcome page flow (but not book-intro-call)
  if (isOnWelcomePage && Object.keys(userMetadata).length) {
    // If original URL had query parameters, preserve them in the redirect
    const redirectPathBase = sanitizeRedirectPath(redirectPath).split('?')[0];
    const redirectPathParams = new URLSearchParams();

    // Add original query params
    const urlParts = redirectPath.split('?');
    if (urlParts.length > 1) {
      const originalParams = new URLSearchParams(urlParts[1]);
      originalParams.forEach((value, key) => {
        redirectPathParams.append(key, value);
      });
    }

    // Add current query params that don't conflict
    Object.keys(req.query).forEach((key) => {
      if (!redirectPathParams.has(key)) {
        redirectPathParams.append(key, req.query[key] as string);
      }
    });

    const queryString = redirectPathParams.toString();
    const finalRedirectUrl = `${redirectPathBase}${queryString ? `?${queryString}` : ''}`;

    res.locals.ejsOnboardingData = {
      postHogSignupEvents: [],
      isCallBooked: isCallBooked,
    };
    res.redirect(finalRedirectUrl);
    return;
  } else if (!isOnWelcomePage && needIntroCall) {
    // Extract original URL path without query params
    const originalPath = redirectPath.split('?')[0];
    // Get all query params as an object from the original URL
    const queryParams = {};
    if (req.query) {
      Object.keys(req.query).forEach((key) => {
        if (key !== 'redirectFromIntroCall') {
          queryParams[key] = req.query[key];
        }
      });
    }

    // Create the redirect URL with proper encoding
    res.locals.ejsOnboardingData = {
      postHogSignupEvents: [],
      isCallBooked: isCallBooked,
    };
    res.redirect(
      `/welcome/book-intro-call?redirectFromIntroCall=${encodeURIComponent(originalPath)}${
        Object.keys(queryParams).length ? `&${new URLSearchParams(queryParams).toString()}` : ''
      }`,
    );
    return;
  }

  res.locals.ejsOnboardingData = {
    postHogSignupEvents,
    isCallBooked: isCallBooked,
  };
  return next();
}
