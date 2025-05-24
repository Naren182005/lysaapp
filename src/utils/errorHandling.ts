import { toast } from "@/components/ui/sonner";

/**
 * Wraps an async function with error handling
 * @param fn The async function to wrap
 * @param errorMessage The error message to display if the function fails
 * @returns A wrapped function that handles errors
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  errorMessage: string = "An error occurred"
): (...args: T) => Promise<R | undefined> {
  return async (...args: T): Promise<R | undefined> => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error(`Error in ${fn.name || 'anonymous function'}:`, error);
      
      // Show error toast
      toast.error(errorMessage, {
        description: error instanceof Error ? error.message : String(error),
        duration: 5000,
      });
      
      return undefined;
    }
  };
}

/**
 * Handles errors in async functions with a custom handler
 * @param promise The promise to handle errors for
 * @param errorHandler The function to call if an error occurs
 * @returns A tuple containing the result and any error
 */
export async function handleAsyncError<T>(
  promise: Promise<T>,
  errorHandler?: (error: any) => void
): Promise<[T | null, Error | null]> {
  try {
    const data = await promise;
    return [data, null];
  } catch (error) {
    if (errorHandler) {
      errorHandler(error);
    } else {
      console.error('Unhandled async error:', error);
      toast.error("An error occurred", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
    return [null, error instanceof Error ? error : new Error(String(error))];
  }
}

/**
 * Creates a retry function that will retry a function multiple times
 * @param fn The function to retry
 * @param maxRetries The maximum number of retries
 * @param delay The delay between retries in milliseconds
 * @returns A function that will retry the original function
 */
export function createRetry<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  maxRetries: number = 3,
  delay: number = 1000
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    let lastError: any;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        console.warn(`Attempt ${attempt + 1}/${maxRetries} failed:`, error);
        lastError = error;
        
        if (attempt < maxRetries - 1) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  };
}

/**
 * Validates that a value is not null or undefined
 * @param value The value to check
 * @param errorMessage The error message to throw if the value is null or undefined
 * @returns The value if it's not null or undefined
 * @throws Error if the value is null or undefined
 */
export function validateNotNull<T>(value: T | null | undefined, errorMessage: string): T {
  if (value === null || value === undefined) {
    throw new Error(errorMessage);
  }
  return value;
}
