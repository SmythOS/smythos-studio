import { Button } from '@src/react/shared/components/ui/newDesign/button';
import { MouseEvent, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export const WelcomePayment = () => {
  const navigate = useNavigate();

  const getQueryParams = useCallback((): URLSearchParams => {
    return new URLSearchParams(window.location.search);
  }, []);

  const handleGetStartedClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const params = getQueryParams();
      const queryString = params.toString();
      navigate(`/welcome/jobtype${queryString ? `?${queryString}` : ''}`);
    },
    [navigate, getQueryParams],
  );

  return (
    <div className="font-sans text-white w-full h-[100vh] flex gap-10 flex-col md:flex-row items-center justify-center">
      <div className="flex flex-col gap-8 bg-white shadow-sm border border-solid border-gray-200 p-[42px] max-w-[445px] w-11/12 rounded-lg text-black">
        <header className="flex items-center justify-between">
          <div className="flex items-center justify-center flex-grow transition duration-300">
            <img src="/img/smythos/logo-with-text-dark.png" className="h-4 w-auto" alt="SmythOS" />
          </div>
        </header>
        <main className="page-card-body text-center">
          <img
            src="/img/celeb_pop.png"
            className="w-[156px] rotate-[30deg] h-auto m-auto"
            alt="SmythOS"
          />
        </main>
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-medium text-center">Congratulations</h1>
          <p className="text-center text-sm">Thank you for joining SmythOS</p>
        </div>
        <footer className="flex w-full mt-4 h-[52px] text-base">
          <Button
            variant="primary"
            handleClick={handleGetStartedClick}
            fullWidth
            label="Get Started"
          />
        </footer>
      </div>
    </div>
  );
};
