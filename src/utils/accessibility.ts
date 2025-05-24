/**
 * Utility functions for accessibility
 */

/**
 * Announces a message to screen readers using ARIA live regions
 * @param message The message to announce
 * @param priority The priority of the announcement (polite or assertive)
 */
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  // Create a live region if it doesn't exist
  let liveRegion = document.getElementById(`aria-live-${priority}`);
  
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = `aria-live-${priority}`;
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-relevant', 'additions');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only'; // Screen reader only
    document.body.appendChild(liveRegion);
  }
  
  // Update the live region with the message
  liveRegion.textContent = '';
  
  // Use setTimeout to ensure the DOM update is recognized by screen readers
  setTimeout(() => {
    if (liveRegion) {
      liveRegion.textContent = message;
    }
  }, 100);
};

/**
 * Adds keyboard navigation to a group of elements
 * @param containerSelector The CSS selector for the container element
 * @param itemSelector The CSS selector for the focusable items
 * @param options Options for keyboard navigation
 */
export const setupKeyboardNavigation = (
  containerSelector: string,
  itemSelector: string,
  options: {
    vertical?: boolean;
    horizontal?: boolean;
    wrap?: boolean;
  } = { vertical: true, horizontal: false, wrap: true }
) => {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  
  container.addEventListener('keydown', (event) => {
    const key = event.key;
    const items = Array.from(container.querySelectorAll(itemSelector)) as HTMLElement[];
    const currentIndex = items.findIndex(item => item === document.activeElement);
    
    if (currentIndex === -1) return;
    
    let nextIndex = currentIndex;
    
    if (options.vertical) {
      if (key === 'ArrowDown') {
        nextIndex = currentIndex + 1;
      } else if (key === 'ArrowUp') {
        nextIndex = currentIndex - 1;
      }
    }
    
    if (options.horizontal) {
      if (key === 'ArrowRight') {
        nextIndex = currentIndex + 1;
      } else if (key === 'ArrowLeft') {
        nextIndex = currentIndex - 1;
      }
    }
    
    // Handle wrapping
    if (options.wrap) {
      if (nextIndex < 0) {
        nextIndex = items.length - 1;
      } else if (nextIndex >= items.length) {
        nextIndex = 0;
      }
    } else {
      if (nextIndex < 0 || nextIndex >= items.length) {
        return;
      }
    }
    
    // Focus the next item
    if (items[nextIndex]) {
      items[nextIndex].focus();
      event.preventDefault();
    }
  });
};

/**
 * Adds a skip link to the page for keyboard users to skip to the main content
 */
export const addSkipToContentLink = () => {
  // Check if the skip link already exists
  if (document.getElementById('skip-to-content')) return;
  
  // Create the skip link
  const skipLink = document.createElement('a');
  skipLink.id = 'skip-to-content';
  skipLink.href = '#main-content';
  skipLink.textContent = 'Skip to main content';
  skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:p-4 focus:bg-white focus:text-app-blue-900 focus:shadow-lg focus:rounded-md';
  
  // Add the skip link to the beginning of the body
  document.body.insertBefore(skipLink, document.body.firstChild);
  
  // Add an ID to the main content if it doesn't exist
  const main = document.querySelector('main');
  if (main && !main.id) {
    main.id = 'main-content';
  }
};

/**
 * Enhances focus visibility for keyboard users
 */
export const enhanceFocusVisibility = () => {
  // Add a class to the body when the user is navigating with the keyboard
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      document.body.classList.add('keyboard-user');
    }
  });
  
  // Remove the class when the user clicks with the mouse
  document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-user');
  });
  
  // Add styles for keyboard focus
  const style = document.createElement('style');
  style.textContent = `
    .keyboard-user :focus {
      outline: 3px solid #0ea5e9 !important;
      outline-offset: 2px !important;
    }
  `;
  document.head.appendChild(style);
};

/**
 * Initializes all accessibility features
 */
export const initializeAccessibility = () => {
  addSkipToContentLink();
  enhanceFocusVisibility();
  
  // Add ARIA live regions for announcements
  const politeRegion = document.createElement('div');
  politeRegion.id = 'aria-live-polite';
  politeRegion.setAttribute('aria-live', 'polite');
  politeRegion.setAttribute('aria-relevant', 'additions');
  politeRegion.setAttribute('aria-atomic', 'true');
  politeRegion.className = 'sr-only';
  document.body.appendChild(politeRegion);
  
  const assertiveRegion = document.createElement('div');
  assertiveRegion.id = 'aria-live-assertive';
  assertiveRegion.setAttribute('aria-live', 'assertive');
  assertiveRegion.setAttribute('aria-relevant', 'additions');
  assertiveRegion.setAttribute('aria-atomic', 'true');
  assertiveRegion.className = 'sr-only';
  document.body.appendChild(assertiveRegion);
};
