import { toast as sonnerToast } from "@/components/ui/sonner";
import { announceToScreenReader } from "@/utils/accessibility";

type ToastOptions = {
  description?: string;
  duration?: number;
  id?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

/**
 * Accessible toast component that announces messages to screen readers
 */
export const toast = {
  /**
   * Show a success toast with screen reader announcement
   */
  success: (message: string, options?: ToastOptions) => {
    sonnerToast.success(message, options);
    announceToScreenReader(`Success: ${message}${options?.description ? `. ${options.description}` : ''}`);
  },

  /**
   * Show an error toast with screen reader announcement
   */
  error: (message: string, options?: ToastOptions) => {
    sonnerToast.error(message, options);
    announceToScreenReader(`Error: ${message}${options?.description ? `. ${options.description}` : ''}`, 'assertive');
  },

  /**
   * Show a warning toast with screen reader announcement
   */
  warning: (message: string, options?: ToastOptions) => {
    sonnerToast.warning(message, options);
    announceToScreenReader(`Warning: ${message}${options?.description ? `. ${options.description}` : ''}`, 'assertive');
  },

  /**
   * Show an info toast with screen reader announcement
   */
  info: (message: string, options?: ToastOptions) => {
    sonnerToast.info(message, options);
    announceToScreenReader(`Information: ${message}${options?.description ? `. ${options.description}` : ''}`);
  },

  /**
   * Show a loading toast with screen reader announcement
   * @param message The message to display
   * @param options Toast options including optional ID for later dismissal
   */
  loading: (message: string, options?: ToastOptions) => {
    // Generate a unique ID if not provided
    const toastId = options?.id || `loading-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Set a default duration for loading toasts to prevent them from getting stuck
    const duration = options?.duration || 10000; // 10 seconds default timeout

    // Show the loading toast
    sonnerToast.loading(message, {
      ...options,
      id: toastId,
      duration: duration
    });

    // Announce to screen reader
    announceToScreenReader(`Loading: ${message}${options?.description ? `. ${options.description}` : ''}`);

    // Set a safety timeout to dismiss the toast if it's not dismissed manually
    const safetyTimeout = setTimeout(() => {
      sonnerToast.dismiss(toastId);
      console.log(`Safety timeout dismissed loading toast: ${toastId}`);
    }, duration + 1000); // Add 1 second buffer

    // Return the toast ID for manual dismissal
    return toastId;
  },

  /**
   * Dismiss all toasts or a specific toast by ID
   * @param id Optional toast ID to dismiss
   */
  dismiss: (id?: string) => {
    try {
      if (id) {
        // Dismiss a specific toast
        sonnerToast.dismiss(id);
        console.log(`Dismissed toast with ID: ${id}`);
      } else {
        // Dismiss all toasts
        sonnerToast.dismiss();
        console.log('Dismissed all toasts');

        // Add a small delay and dismiss again to catch any toasts that might be in the process of being created
        setTimeout(() => {
          sonnerToast.dismiss();
        }, 100);
      }
    } catch (error) {
      console.error('Error dismissing toast:', error);
    }
  },

  /**
   * Custom toast with screen reader announcement
   */
  custom: (message: string, options?: ToastOptions) => {
    sonnerToast(message, options);
    announceToScreenReader(message + (options?.description ? `. ${options.description}` : ''));
  }
};
