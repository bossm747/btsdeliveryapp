import { useState, useEffect, useCallback } from "react";
import { WifiOff, Wifi, RefreshCw, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface OfflineIndicatorProps {
  /** Whether data is from cache */
  isFromCache?: boolean;
  /** Timestamp when data was cached */
  cacheTimestamp?: number | null;
  /** Callback when user clicks refresh (only shown when back online) */
  onRefresh?: () => void;
  /** Whether a refresh is in progress */
  isRefreshing?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * OfflineIndicator Component
 * Shows the user's online/offline status and cache information
 */
export function OfflineIndicator({
  isFromCache = false,
  cacheTimestamp = null,
  onRefresh,
  isRefreshing = false,
  className,
}: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // User just came back online
        setWasOffline(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [wasOffline]);

  const formatCacheTime = useCallback((timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    return "Just now";
  }, []);

  // Show nothing if online and not showing cached data
  if (isOnline && !isFromCache) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-3 mb-4 transition-all duration-300",
        !isOnline
          ? "bg-amber-50 border-amber-200 text-amber-800"
          : isFromCache
          ? "bg-blue-50 border-blue-200 text-blue-800"
          : "bg-green-50 border-green-200 text-green-800",
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!isOnline ? (
            <>
              <WifiOff className="h-4 w-4" aria-hidden="true" />
              <span className="font-medium">You are offline</span>
            </>
          ) : isFromCache ? (
            <>
              <Clock className="h-4 w-4" aria-hidden="true" />
              <span className="font-medium">Showing cached data</span>
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4" aria-hidden="true" />
              <span className="font-medium">Back online</span>
            </>
          )}
        </div>

        {isOnline && onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={cn(
              "flex items-center gap-1 px-2 py-1 text-sm rounded-md transition-colors",
              "bg-white/50 hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            aria-label="Refresh data"
          >
            <RefreshCw
              className={cn("h-3 w-3", isRefreshing && "animate-spin")}
              aria-hidden="true"
            />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        )}
      </div>

      <p className="text-sm mt-1 opacity-90">
        {!isOnline ? (
          <>Showing cached order history. Some features may be limited.</>
        ) : isFromCache && cacheTimestamp ? (
          <>
            Last updated {formatCacheTime(cacheTimestamp)}. Click refresh for
            latest data.
          </>
        ) : isFromCache ? (
          <>Data may not be up to date. Click refresh for latest data.</>
        ) : (
          <>Your connection has been restored.</>
        )}
      </p>
    </div>
  );
}

/**
 * Hook to track online/offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Compact offline banner for use in headers or other tight spaces
 */
export function OfflineBanner({ className }: { className?: string }) {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      className={cn(
        "bg-amber-500 text-white text-center py-1 px-2 text-sm font-medium",
        className
      )}
      role="alert"
    >
      <WifiOff className="h-3 w-3 inline-block mr-1" aria-hidden="true" />
      You are offline - showing cached data
    </div>
  );
}

export default OfflineIndicator;
