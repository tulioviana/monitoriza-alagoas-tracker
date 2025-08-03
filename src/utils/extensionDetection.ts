/**
 * Utility functions for detecting and handling browser extension interference
 */

export interface ExtensionInfo {
  name: string;
  detected: boolean;
  problematic: boolean;
}

/**
 * Known problematic extensions and their detection patterns
 */
const PROBLEMATIC_EXTENSIONS = [
  {
    name: 'PIN Company Discounts',
    patterns: ['PIN Company', 'pin-company'],
    problematic: true
  },
  {
    name: 'AdBlock variants',
    patterns: ['adblock', 'ublock'],
    problematic: false
  },
  {
    name: 'Password managers',
    patterns: ['lastpass', '1password', 'bitwarden'],
    problematic: false
  }
];

/**
 * Detect potentially problematic browser extensions
 */
export function detectProblematicExtensions(): ExtensionInfo[] {
  const detected: ExtensionInfo[] = [];
  
  // Check for extension-injected elements in DOM
  PROBLEMATIC_EXTENSIONS.forEach(ext => {
    const isDetected = ext.patterns.some(pattern => {
      // Check for script tags or elements with extension patterns
      const scripts = document.querySelectorAll('script[src*="' + pattern + '"]');
      const elements = document.querySelectorAll('[class*="' + pattern + '"], [id*="' + pattern + '"]');
      return scripts.length > 0 || elements.length > 0;
    });
    
    if (isDetected) {
      detected.push({
        name: ext.name,
        detected: true,
        problematic: ext.problematic
      });
    }
  });
  
  return detected;
}

/**
 * Setup extension interference monitoring
 */
export function setupExtensionMonitoring(): void {
  // Monitor for unexpected DOM modifications
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              // Check for extension-injected elements
              if (element.tagName === 'SCRIPT' && element.getAttribute('src')?.includes('extension://')) {
                console.warn('Extension script detected:', element.getAttribute('src'));
              }
            }
          });
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // Monitor for extension-related console errors
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    if (message.includes('Extension') || message.includes('chrome-extension://')) {
      console.warn('Extension-related error filtered:', message);
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

/**
 * Check DOM integrity and detect potential extension interference
 */
export function checkDOMIntegrity(): boolean {
  try {
    // Basic checks for DOM integrity
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      console.error('Root element missing - possible extension interference');
      return false;
    }
    
    // Check for unexpected scripts
    const scripts = document.querySelectorAll('script[src*="extension://"]');
    if (scripts.length > 0) {
      console.warn('Extension scripts detected:', scripts.length);
    }
    
    return true;
  } catch (error) {
    console.error('DOM integrity check failed:', error);
    return false;
  }
}

/**
 * Initialize extension protection on app startup
 */
export function initializeExtensionProtection(): void {
  console.log('Initializing extension protection...');
  
  // Detect problematic extensions
  const problematicExtensions = detectProblematicExtensions();
  if (problematicExtensions.length > 0) {
    console.warn('Problematic extensions detected:', problematicExtensions);
  }
  
  // Setup monitoring
  setupExtensionMonitoring();
  
  // Initial DOM integrity check
  setTimeout(() => {
    checkDOMIntegrity();
  }, 1000);
}