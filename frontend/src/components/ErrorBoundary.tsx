import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Optional name for identifying which boundary caught the error */
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

const MAX_AUTO_RETRIES = 1;

/**
 * Production-grade Error Boundary with:
 * - Auto-retry (once) for transient render errors
 * - Manual retry button
 * - Full page reload fallback
 * - Error logging (ready for Sentry/Datadog integration)
 * - Chunk load error detection (triggers page reload)
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ errorInfo: info });

    // Log to console (production: would send to error tracking service)
    console.error(`[ErrorBoundary${this.props.name ? `:${this.props.name}` : ''}]`, error.message, info.componentStack?.slice(0, 500));

    // Detect chunk load errors (stale deploy) → auto reload
    if (error.message?.includes('Loading chunk') || error.message?.includes('dynamically imported module')) {
      const hasReloaded = sessionStorage.getItem('error_boundary_reload');
      if (!hasReloaded) {
        sessionStorage.setItem('error_boundary_reload', '1');
        window.location.reload();
        return;
      }
      sessionStorage.removeItem('error_boundary_reload');
    }

    // Auto-retry once for transient errors (race conditions, hydration mismatches)
    if (this.state.retryCount < MAX_AUTO_RETRIES) {
      setTimeout(() => {
        this.setState((prev) => ({
          hasError: false,
          error: null,
          errorInfo: null,
          retryCount: prev.retryCount + 1,
        }));
      }, 1000);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-64 p-8 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="bg-primary hover:opacity-90 text-white px-4 py-2 rounded-xl text-sm font-medium transition"
            >
              Try again
            </button>
            <button
              onClick={this.handleReload}
              className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              Reload page
            </button>
          </div>
          {/* Debug info (only in development) */}
          {process.env.NODE_ENV !== 'production' && this.state.errorInfo && (
            <details className="mt-4 text-left text-xs text-gray-400 max-w-lg max-h-32 overflow-auto">
              <summary className="cursor-pointer">Stack trace</summary>
              <pre className="mt-1 whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
