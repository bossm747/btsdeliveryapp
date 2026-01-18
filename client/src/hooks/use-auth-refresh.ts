import { useCallback, useRef, useEffect } from 'react';

// Token refresh configuration
const TOKEN_REFRESH_BUFFER_MS = 2 * 60 * 1000; // Refresh 2 minutes before expiry
const REFRESH_CHECK_INTERVAL_MS = 30 * 1000; // Check every 30 seconds

// Storage keys
const ACCESS_TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const TOKEN_EXPIRY_KEY = 'tokenExpiresAt';

// Event for cross-tab synchronization
const AUTH_CHANGE_EVENT = 'bts-auth-change';

interface TokenPayload {
  userId: string;
  exp: number;
  iat: number;
  type?: string;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: any;
}

// Parse JWT token to get expiration time
export function parseJwt(token: string): TokenPayload | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

// Get token expiration time in milliseconds
export function getTokenExpirationTime(token: string): number | null {
  const payload = parseJwt(token);
  if (!payload || !payload.exp) return null;
  return payload.exp * 1000; // Convert seconds to milliseconds
}

// Check if token is expired or about to expire
export function isTokenExpired(token: string, bufferMs: number = 0): boolean {
  const expirationTime = getTokenExpirationTime(token);
  if (!expirationTime) return true;
  return Date.now() >= expirationTime - bufferMs;
}

// Singleton refresh state to prevent concurrent refreshes across components
let isRefreshing = false;
let refreshPromise: Promise<RefreshResponse | null> | null = null;
let refreshSubscribers: Array<(token: string | null, error?: Error) => void> = [];

// Notify all subscribers when refresh completes
function notifySubscribers(token: string | null, error?: Error) {
  refreshSubscribers.forEach((callback) => callback(token, error));
  refreshSubscribers = [];
}

// Add subscriber to be notified when refresh completes
function subscribeToRefresh(callback: (token: string | null, error?: Error) => void) {
  refreshSubscribers.push(callback);
}

// Perform the actual token refresh
async function performTokenRefresh(): Promise<RefreshResponse | null> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Refresh failed' }));
    throw new Error(error.message || 'Token refresh failed');
  }

  const data: RefreshResponse = await response.json();

  // Store new tokens
  localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + data.expiresIn * 1000));

  // Notify other tabs
  window.dispatchEvent(new StorageEvent('storage', {
    key: ACCESS_TOKEN_KEY,
    newValue: data.accessToken,
    storageArea: localStorage,
  }));

  // Dispatch custom event for in-page listeners
  window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT, {
    detail: { type: 'refresh', accessToken: data.accessToken }
  }));

  return data;
}

// Main refresh function with queue management
export async function refreshAccessToken(): Promise<string | null> {
  // If already refreshing, wait for the existing refresh to complete
  if (isRefreshing && refreshPromise) {
    return new Promise((resolve, reject) => {
      subscribeToRefresh((token, error) => {
        if (error) reject(error);
        else resolve(token);
      });
    });
  }

  // Start new refresh
  isRefreshing = true;
  refreshPromise = performTokenRefresh();

  try {
    const result = await refreshPromise;
    const newToken = result?.accessToken || null;
    notifySubscribers(newToken);
    return newToken;
  } catch (error) {
    notifySubscribers(null, error as Error);
    throw error;
  } finally {
    isRefreshing = false;
    refreshPromise = null;
  }
}

// Get access token, refreshing if needed
export async function getValidAccessToken(): Promise<string | null> {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);

  if (!token) {
    return null;
  }

  // Check if token needs refresh (with buffer)
  if (isTokenExpired(token, TOKEN_REFRESH_BUFFER_MS)) {
    try {
      return await refreshAccessToken();
    } catch {
      return null;
    }
  }

  return token;
}

// Clear all auth tokens
export function clearAuthTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem('userRole');
  localStorage.removeItem('userId');

  // Notify other tabs
  window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT, {
    detail: { type: 'logout' }
  }));
}

// Hook for automatic token refresh
export function useAuthRefresh(
  onRefreshSuccess?: (user: any) => void,
  onRefreshFailure?: () => void
) {
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(true);

  // Schedule next refresh based on token expiration
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return;

    const expirationTime = getTokenExpirationTime(token);
    if (!expirationTime) return;

    // Calculate when to refresh (2 minutes before expiry)
    const refreshTime = expirationTime - TOKEN_REFRESH_BUFFER_MS;
    const delay = Math.max(0, refreshTime - Date.now());

    refreshTimerRef.current = setTimeout(async () => {
      if (!isActiveRef.current) return;

      try {
        const result = await refreshAccessToken();
        if (result && onRefreshSuccess) {
          // Fetch updated user data if needed
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${result}`,
            },
          });
          if (response.ok) {
            const user = await response.json();
            onRefreshSuccess(user);
          }
        }
        // Schedule next refresh
        scheduleRefresh();
      } catch (error) {
        console.error('Auto token refresh failed:', error);
        if (onRefreshFailure) {
          onRefreshFailure();
        }
      }
    }, delay);
  }, [onRefreshSuccess, onRefreshFailure]);

  // Periodic check as a fallback
  useEffect(() => {
    isActiveRef.current = true;

    const intervalCheck = setInterval(async () => {
      if (!isActiveRef.current) return;

      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) return;

      // If token is about to expire, trigger refresh
      if (isTokenExpired(token, TOKEN_REFRESH_BUFFER_MS)) {
        try {
          await refreshAccessToken();
          scheduleRefresh();
        } catch (error) {
          console.error('Periodic token refresh failed:', error);
          if (onRefreshFailure) {
            onRefreshFailure();
          }
        }
      }
    }, REFRESH_CHECK_INTERVAL_MS);

    // Initial schedule
    scheduleRefresh();

    return () => {
      isActiveRef.current = false;
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      clearInterval(intervalCheck);
    };
  }, [scheduleRefresh, onRefreshFailure]);

  // Listen for auth changes from other tabs
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === ACCESS_TOKEN_KEY) {
        if (!event.newValue) {
          // Token was removed, user logged out in another tab
          if (onRefreshFailure) {
            onRefreshFailure();
          }
        } else {
          // Token was updated, reschedule refresh
          scheduleRefresh();
        }
      }
    };

    const handleAuthChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.type === 'logout') {
        if (onRefreshFailure) {
          onRefreshFailure();
        }
      } else if (customEvent.detail?.type === 'refresh') {
        scheduleRefresh();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
    };
  }, [scheduleRefresh, onRefreshFailure]);

  return {
    refreshAccessToken,
    getValidAccessToken,
    clearAuthTokens,
    isTokenExpired,
  };
}

export default useAuthRefresh;
