/**
 * Utility functions for handling online/offline mode
 */

import { API_ENDPOINTS } from '@/config/apiConfig';

/**
 * Checks if the application is in online mode
 * @returns True if online mode is enabled, false otherwise
 */
export const isOnlineModeEnabled = (): boolean => {
  const savedMode = localStorage.getItem('isOnlineMode');
  return savedMode !== null ? savedMode === 'true' : true;
};

/**
 * Checks if the server is available by making a connectivity check
 * @returns A promise that resolves to true if the server is available, false otherwise
 */
export const isServerAvailable = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(API_ENDPOINTS.CONNECTIVITY, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return data.connected === true;
    }

    return false;
  } catch (error) {
    console.warn('Server connectivity check failed:', error);
    return false;
  }
};

/**
 * Determines if we should use online services based on mode setting and connectivity
 * @returns A promise that resolves to true if we should use online services, false otherwise
 */
export const shouldUseOnlineServices = async (): Promise<boolean> => {
  // If offline mode is explicitly set, don't use online services
  if (!isOnlineModeEnabled()) {
    return false;
  }

  // If online mode is set, check if the server is actually available
  return await isServerAvailable();
};

/**
 * Checks internet connectivity by making a request to a known endpoint
 * @returns A promise that resolves to true if connected, false otherwise
 */
export const checkInternetConnectivity = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // Try to fetch a small resource from a reliable source
    const response = await fetch(API_ENDPOINTS.CONNECTIVITY, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store' // Prevent caching
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error("Internet connectivity check failed:", error);
    return false;
  }
};
