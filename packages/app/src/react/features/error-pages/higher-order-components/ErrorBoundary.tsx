import { QueryErrorResetBoundary } from '@tanstack/react-query';
import React, { Component, ReactNode, ErrorInfo, Suspense } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: (resetError?: () => void) => ReactNode;
  /**
   * @param error - The actual error object
   * @param errorInfo - Additional information about the error, such as the component stack trace
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  /**
   * This sets the state of component when an error occurs.
   * Performance: getDerivedStateFromError is called before rendering, making it more efficient for updating state related to rendering.
   * Clarity: It clearly separates state updates from side effects, making the code easier to understand and maintain.
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false });
    this.props.onReset?.(); // Call the onReset callback
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback(this.resetError);
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

interface ErrorBoundarySuspenseProps {
  children: ReactNode;
  loadingFallback: ReactNode;
  errorFallback: (resetError: () => void) => ReactNode;
}

export function ErrorBoundarySuspense({
  children,
  errorFallback,
  loadingFallback,
}: ErrorBoundarySuspenseProps) {
  /**
   * Explanation of code below:
   *
   * TLDR: It provides an error boundary, an option to show loading UI while the content loads
   * and an error UI, which can trigger retry, when something fails.
   *
   * The Suspense component is used to manage the loading state of the children component.
   * It provides a fallback component that can be used to display a loading state while
   * the children component is being fetched from the API.
   *
   * The ErrorBoundary is used to manage errors in the children component. It shows the fallback when error occurs.
   * It provides a reset function that can be used to reset the error state.
   * When it is reset, it calls the `reset` function of the QueryErrorResetBoundary component.
   *
   * Which in turn re-fetches the data from the API.
   *
   */
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} fallback={errorFallback}>
          <Suspense fallback={loadingFallback}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
