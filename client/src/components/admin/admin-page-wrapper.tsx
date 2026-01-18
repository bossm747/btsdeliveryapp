import { ReactNode, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import ErrorBoundary from "@/components/ErrorBoundary";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminPageWrapperProps {
  children: ReactNode;
  /** Query keys to invalidate on pull-to-refresh */
  refreshQueryKeys?: string[];
  /** Custom refresh function */
  onRefresh?: () => Promise<void>;
  /** Disable pull-to-refresh */
  disablePullToRefresh?: boolean;
  /** Additional class names */
  className?: string;
  /** Page title for accessibility */
  pageTitle?: string;
  /** Page description for screen readers */
  pageDescription?: string;
}

export function AdminPageWrapper({
  children,
  refreshQueryKeys = [],
  onRefresh,
  disablePullToRefresh = false,
  className,
  pageTitle,
  pageDescription,
}: AdminPageWrapperProps) {
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      await onRefresh();
    } else if (refreshQueryKeys.length > 0) {
      // Invalidate all specified query keys
      await Promise.all(
        refreshQueryKeys.map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] })
        )
      );
    } else {
      // Default: invalidate common admin queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/restaurants"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/riders"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/support"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] }),
      ]);
    }
  }, [onRefresh, queryClient, refreshQueryKeys]);

  const { isRefreshing, pullProgress, handlers } = usePullToRefresh({
    onRefresh: handleRefresh,
    disabled: disablePullToRefresh,
  });

  return (
    <ErrorBoundary>
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md"
      >
        Skip to main content
      </a>

      {/* Screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {isRefreshing && "Refreshing admin dashboard content..."}
      </div>

      {/* Page wrapper with touch handlers */}
      <div
        {...handlers}
        className={cn("relative", className)}
        role="main"
        id="main-content"
        aria-label={pageTitle}
        aria-describedby={pageDescription ? "page-description" : undefined}
      >
        {pageDescription && (
          <p id="page-description" className="sr-only">
            {pageDescription}
          </p>
        )}

        {/* Pull-to-refresh indicator */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 z-50 overflow-hidden",
            pullProgress > 0 || isRefreshing ? "opacity-100" : "opacity-0"
          )}
          style={{
            height: isRefreshing ? 48 : Math.min(pullProgress * 0.48, 48),
          }}
          aria-hidden="true"
        >
          <div
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200",
              isRefreshing && "animate-pulse"
            )}
          >
            {isRefreshing ? (
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            ) : (
              <RefreshCw
                className={cn(
                  "w-5 h-5 text-gray-400 transition-transform duration-200",
                  pullProgress >= 100 && "text-blue-600"
                )}
                style={{
                  transform: `rotate(${pullProgress * 1.8}deg)`,
                }}
              />
            )}
          </div>
        </div>

        {/* Main content */}
        <div
          className="transition-transform duration-200"
          style={{
            transform:
              pullProgress > 0 || isRefreshing
                ? `translateY(${isRefreshing ? 48 : Math.min(pullProgress * 0.48, 48)}px)`
                : "translateY(0)",
          }}
        >
          {children}
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default AdminPageWrapper;
