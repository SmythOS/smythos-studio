import { useEffect, useState } from 'react';

const AccountDeletedPage = () => {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    if (countdown === 0) {
      window.location.href = '/logto/sign-out';
    }
  }, [countdown]);
  
  return (
    <div className="container mx-auto p-8 font-sans h-screen flex items-center justify-center">
      <div className="px-8 py-16 bg-white text-gray-900 w-full md:w-1/2 flex items-center justify-center rounded-lg font-sans font-medium flex-col">
        <h3 className="text-xl text-center">
          Your account has been deleted. We're sorry to see you go.
        </h3>

        <p className="text-center mt-4">
          If you have any feedback or need help, please reach out to us at{' '}
          <a href="mailto:hello@smythos.com" className="text-primary-100">
            hello@smythos.com
          </a>
          .
        </p>
        <h3 className="mt-20">Please wait while we redirect you to the login page.</h3>
        <h3 className="text-center">{countdown} seconds remaining...</h3>
      </div>
    </div>
  );
};

export default AccountDeletedPage;
