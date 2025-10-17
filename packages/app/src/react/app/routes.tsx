import { CatchAllPage } from '@src/react/features/error-pages/pages/CatchAllPage';
import ErrorPage from '@src/react/features/error-pages/pages/Error';
import { RootLayout } from '@src/react/shared/components/layouts/RootLayout';
import withDocumentTitle from '@src/react/shared/components/layouts/withDocumentTitle';
import { Spinner } from '@src/react/shared/components/ui/spinner';
import { useAuthCtx } from '@src/react/shared/contexts/auth.context';
import { IPageRoute } from '@src/react/shared/types/route';
import { FEATURE_FLAGS } from '@src/shared/constants/featureflags';
import { Observability } from '@src/shared/observability';
import { useEffect } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { useGetBookAnIntroCall } from '../features/onboarding/hooks/useGetUserOnboardingSettings';
import { useMutateBookAnIntroCall } from '../features/onboarding/hooks/useMutateOnboardingData';
import { PRICING_PLANS_V4 } from '../shared/enums';

const RoutesWrapper = ({ pages }: { pages: IPageRoute[] }) => {
  const userInfoCtx = useAuthCtx();
  const navigate = useNavigate();
  const { mutate: mutateBookAnIntroCall } = useMutateBookAnIntroCall();

  useEffect(() => {
    if (userInfoCtx?.error?.['status'] === 403) {
      navigate('/error/403');
    }
  }, [userInfoCtx]);

  const checkFeatureFlag = async () => {
    const { subs } = userInfoCtx?.userInfo ?? {};
    const planNameLower = subs?.plan?.name?.toLowerCase() || '';
    const isBuilderPlan = planNameLower === PRICING_PLANS_V4.BUILDER.toLowerCase();
    const flagValue = Observability.features.getFeatureFlag(
      FEATURE_FLAGS.ONBOARDING_CALLS_FOR_BUILDER_PLAN,
    );

    if (isBuilderPlan && typeof flagValue !== 'boolean' && flagValue !== 'variant_1') {
      useGetBookAnIntroCall({
        options: {
          onError: () => {
            console.error('Error fetching intro call settings');
          },
          onSuccess: (bookIntroSettings) => {
            if (
              bookIntroSettings.planName !==
              userInfoCtx?.userInfo.teamSubs?.subscription?.plan?.name
            ) {
              const data = {
                email: userInfoCtx?.userInfo.user?.email,
                isBooked: false,
                planName: userInfoCtx?.userInfo.teamSubs?.subscription?.plan?.name ?? '',
              };
              try {
                mutateBookAnIntroCall(data);
              } catch (error) {
                console.error('Error storing book an intro call', error);
              }
            }
          },
          refetchOnMount: true,
          staleTime: 0,
          cacheTime: 0,
          queryKey: ['get_book_an_intro_call', Date.now()],
        },
      });
    }
  };
  useEffect(() => {
    if (userInfoCtx?.userInfo?.user?.id) {
      const { user, subs, userOnBoarding } = userInfoCtx?.userInfo ?? {};
      const { id, email, avatar } = user ?? {};
      const { name: planName, isDefaultPlan, isCustomPlan } = subs?.plan ?? {};
      const { name, jobtype, jobRoleLabel } = userOnBoarding ?? {};

      Observability.userIdentity.identifyUser(id, {
        name,
        email,
        autenticationSource: avatar
          ? avatar.includes('google')
            ? 'google'
            : avatar.includes('github')
              ? 'github'
              : 'other'
          : 'email',
        planName,
        isDefaultPlan,
        isCustomPlan,
        jobtype,
        jobRoleLabel,
        paidUserSince: userOnBoarding?.paidUserSince,
        churnedAt: userOnBoarding?.churnedAt,
      });

      // Reload feature flags after user identification
      Observability.features.reloadFeatureFlags();

      // Wait a bit longer for flags to reload before checking features
      setTimeout(checkFeatureFlag, 2000);
    }
  }, [userInfoCtx?.userInfo?.user]);

  const isWelcomePage = (path: string) => path.startsWith('/welcome');
  const isAcceptInvitationPage = (path: string) => path.startsWith('/teams/accept-invitation');

  return (
    <Routes>
      {pages.map((page) => {
        const ComponentWithDocumentTitle = withDocumentTitle(page.component, page.title, page.path);
        const element =
          userInfoCtx.loading && !page.skipAuth ? (
            <div className="w-full h-[calc(100vh-4rem)] flex items-center justify-center">
              <Spinner />
            </div>
          ) : userInfoCtx.error && !page.skipAuth ? (
            <p>Application Error</p>
          ) : (
            <ComponentWithDocumentTitle>{page.component}</ComponentWithDocumentTitle>
          );

        return (
          <Route
            key={page.path}
            path={page.path}
            element={
              <RootLayout
                layoutOptions={page.layoutOptions}
                isWelcomePage={isWelcomePage(page.path)}
                isAcceptInvitationPage={isAcceptInvitationPage(page.path)}
              >
                {element}
              </RootLayout>
            }
          />
        );
      })}

      {/* Error page */}
      <Route path="/error/:code" element={<ErrorPage />} />

      <Route path="*" element={<CatchAllPage />} />
    </Routes>
  );
};

export default RoutesWrapper;
