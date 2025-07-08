import { Spinner } from '@src/react/shared/components/ui/spinner';
import { useAuthCtx } from '@src/react/shared/contexts/auth.context';
import React, { useEffect } from 'react';


interface DocumentTitleProps {
  title: string;
  children: React.ReactNode;
}



function withDocumentTitle<T extends object>(
  Component: React.ComponentType<T>,
  title: string,
  route: string,
) {
  

  return (props: T) => {
    const { isProtectedRoute } = useAuthCtx();
    useEffect(() => {
      document.title = title ? `${title} | SmythOS` : 'SmythOS';
    }, []);


    if (isProtectedRoute(route)) {
      window.location.replace('/403');
      return (
        <div className="h-screen w-screen flex justify-center items-center">
          <Spinner classes="w-12 h-12" />
        </div>
      );
    }

    return (
        <Component {...props} />
    );
  };
}

export default withDocumentTitle;
