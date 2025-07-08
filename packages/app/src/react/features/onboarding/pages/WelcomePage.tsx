import { Spinner } from '@src/react/shared/components/ui/spinner';
import { useAuthCtx } from '@src/react/shared/contexts/auth.context';
import { FRONTEND_USER_SETTINGS } from '@src/react/shared/enums';
import { sanitizeRedirectPath } from '@src/shared/utils';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const WelcomePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userInfo } = useAuthCtx();
  const fiveMin = 1000 * 60 * 5; // 5 minutes
  const redirectPath = searchParams.get('redirect');

  useEffect(() => {
    const currentDate = new Date();
    const subsStartDate = new Date(userInfo?.subs?.startDate);
    const userCreatedDate = new Date(userInfo?.user?.createdAt);
    const isNewUser = currentDate.getTime() - userCreatedDate.getTime() < fiveMin;
    const hasRecentSubscription = currentDate.getTime() - subsStartDate.getTime() < fiveMin;
    if (redirectPath) {
      sessionStorage.setItem(
        FRONTEND_USER_SETTINGS.REDIRECT_PATH_KEY_WELCOME_PAGE,
        sanitizeRedirectPath(redirectPath),
      );
      localStorage.setItem(FRONTEND_USER_SETTINGS.SIDEBAR_COLLAPSED, 'true');
    }
    if (isNewUser && hasRecentSubscription) {
      navigate('/welcome/payment');
    } else {
      navigate('/welcome/jobtype');
    }
  }, [userInfo, navigate]);

  return (
    <div className="font-sans text-white w-full h-[100vh] flex gap-10 flex-col md:flex-row items-center justify-center">
      <div className="px-6 space-y-8 w-full md:w-1/3">
        <Spinner />
      </div>
    </div>
  );
};
