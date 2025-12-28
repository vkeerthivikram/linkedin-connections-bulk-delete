/**
 * Error Handling Module
 * Comprehensive error catching, logging, and retry logic with backoff
 */

const ErrorHandler = {
  // Error types
  ErrorTypes: {
    NETWORK_ERROR: 'NETWORK_ERROR',
    API_ERROR: 'API_ERROR',
    RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
  },

  // Error log storage
  errorLog: [],

  /**
   * Handle an error with appropriate action
   * @param {Error} error - The error object
   * @param {Object} context - Additional context about the error
   * @param {number} retryCount - Current retry attempt
   * @returns {Object} Error handling result
   */
  async handle(error, context = {}, retryCount = 0) {
    const errorInfo = this.classifyError(error);
    
    // Log the error
    this.logError(error, errorInfo, context, retryCount);
    
    // Determine if we should retry
    const shouldRetry = await this.shouldRetry(errorInfo, retryCount);
    
    if (shouldRetry) {
      const backoffDelay = this.calculateBackoff(retryCount);
      return {
        shouldRetry: true,
        delay: backoffDelay,
        errorInfo
      };
    }
    
    return {
      shouldRetry: false,
      errorInfo,
      userMessage: this.getUserMessage(errorInfo)
    };
  },

  /**
   * Classify the error type
   * @param {Error} error - The error object
   * @returns {Object} Error classification
   */
  classifyError(error) {
    if (!error) {
      return {
        type: this.ErrorTypes.UNKNOWN_ERROR,
        message: 'Unknown error occurred',
        severity: 'high'
      };
    }

    const errorMessage = error.message || '';
    const errorName = error.name || '';

    // Network errors
    if (errorName === 'TypeError' && errorMessage.includes('fetch')) {
      return {
        type: this.ErrorTypes.NETWORK_ERROR,
        message: 'Network connection failed',
        severity: 'medium'
      };
    }

    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
      return {
        type: this.ErrorTypes.NETWORK_ERROR,
        message: 'Network connection failed',
        severity: 'medium'
      };
    }

    // Rate limit errors (LinkedIn specific)
    if (errorMessage.includes('429') || errorMessage.includes('rate limit') || 
        errorMessage.includes('too many requests')) {
      return {
        type: this.ErrorTypes.RATE_LIMIT_ERROR,
        message: 'Rate limit exceeded',
        severity: 'high'
      };
    }

    // Authentication errors
    if (errorMessage.includes('401') || errorMessage.includes('403') ||
        errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
      return {
        type: this.ErrorTypes.AUTHENTICATION_ERROR,
        message: 'Authentication failed',
        severity: 'high'
      };
    }

    // API errors
    if (errorMessage.includes('400') || errorMessage.includes('500') ||
        errorMessage.includes('API error')) {
      return {
        type: this.ErrorTypes.API_ERROR,
        message: 'API request failed',
        severity: 'medium'
      };
    }

    // Default to unknown error
    return {
      type: this.ErrorTypes.UNKNOWN_ERROR,
      message: errorMessage || 'Unknown error occurred',
      severity: 'medium'
    };
  },

  /**
   * Determine if an error should be retried
   * @param {Object} errorInfo - Error classification
   * @param {number} retryCount - Current retry attempt
   * @returns {Promise<boolean>} Whether to retry
   */
  async shouldRetry(errorInfo, retryCount) {
    const maxRetries = Config.get('maxRetries');
    
    // Don't retry if we've exceeded max retries
    if (retryCount >= maxRetries) {
      return false;
    }

    // Retry network errors
    if (errorInfo.type === this.ErrorTypes.NETWORK_ERROR) {
      return true;
    }

    // Retry rate limit errors
    if (errorInfo.type === this.ErrorTypes.RATE_LIMIT_ERROR) {
      return true;
    }

    // Retry API errors with 5xx status
    if (errorInfo.type === this.ErrorTypes.API_ERROR && errorInfo.severity === 'medium') {
      return true;
    }

    // Don't retry authentication errors
    if (errorInfo.type === this.ErrorTypes.AUTHENTICATION_ERROR) {
      return false;
    }

    // Don't retry validation errors
    if (errorInfo.type === this.ErrorTypes.VALIDATION_ERROR) {
      return false;
    }

    // Default: don't retry unknown errors
    return false;
  },

  /**
   * Calculate exponential backoff delay
   * @param {number} retryCount - Current retry attempt
   * @returns {number} Delay in milliseconds
   */
  calculateBackoff(retryCount) {
    const initialDelay = Config.get('initialBackoffDelay');
    const multiplier = Config.get('retryBackoffMultiplier');
    const maxDelay = Config.get('maxBackoffDelay');
    
    // Exponential backoff: delay = initial * (multiplier ^ retryCount)
    let delay = initialDelay * Math.pow(multiplier, retryCount);
    
    // Cap at maximum delay
    delay = Math.min(delay, maxDelay);
    
    // Add some randomness (jitter) to avoid thundering herd
    const jitter = Math.random() * 1000; // 0-1000ms jitter
    
    return Math.floor(delay + jitter);
  },

  /**
   * Log error to console and internal log
   * @param {Error} error - The error object
   * @param {Object} errorInfo - Error classification
   * @param {Object} context - Additional context
   * @param {number} retryCount - Current retry attempt
   */
  logError(error, errorInfo, context, retryCount) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: errorInfo.type,
      message: errorInfo.message,
      severity: errorInfo.severity,
      retryCount,
      context,
      stack: error?.stack
    };

    // Add to internal log
    this.errorLog.push(logEntry);

    // Keep only last 100 errors
    if (this.errorLog.length > 100) {
      this.errorLog.shift();
    }

    // Log to console
    console.error(`[${errorInfo.type}] ${errorInfo.message}`, {
      error,
      context,
      retryCount
    });
  },

  /**
   * Get user-friendly error message
   * @param {Object} errorInfo - Error classification
   * @returns {string} User-friendly message
   */
  getUserMessage(errorInfo) {
    switch (errorInfo.type) {
      case this.ErrorTypes.NETWORK_ERROR:
        return 'Network connection failed. Please check your internet connection and try again.';
      
      case this.ErrorTypes.RATE_LIMIT_ERROR:
        return 'Rate limit exceeded. Please wait a moment and try again.';
      
      case this.ErrorTypes.AUTHENTICATION_ERROR:
        return 'Authentication failed. Please log in to LinkedIn and refresh the page.';
      
      case this.ErrorTypes.API_ERROR:
        return 'LinkedIn API error. Please try again later.';
      
      case this.ErrorTypes.VALIDATION_ERROR:
        return 'Invalid data. Please check your selection and try again.';
      
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  },

  /**
   * Get error log
   * @param {number} limit - Maximum number of entries to return
   * @returns {Array} Error log entries
   */
  getErrorLog(limit = 50) {
    return this.errorLog.slice(-limit);
  },

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = [];
  },

  /**
   * Wrap an async function with error handling
   * @param {Function} fn - Async function to wrap
   * @param {Object} context - Context for error handling
   * @returns {Function} Wrapped function
   */
  wrap(fn, context = {}) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        const result = await this.handle(error, context);
        if (result.shouldRetry) {
          await new Promise(resolve => setTimeout(resolve, result.delay));
          return this.wrap(fn, context)(...args);
        }
        throw new Error(result.userMessage);
      }
    };
  },

  /**
   * Create a retryable async function
   * @param {Function} fn - Async function to make retryable
   * @param {Object} options - Retry options
   * @returns {Function} Retryable function
   */
  retryable(fn, options = {}) {
    const maxRetries = options.maxRetries || Config.get('maxRetries');
    
    return async (...args) => {
      let lastError;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await fn(...args);
        } catch (error) {
          lastError = error;
          
          const errorInfo = this.classifyError(error);
          this.logError(error, errorInfo, options.context || {}, attempt);
          
          if (attempt < maxRetries) {
            const shouldRetry = await this.shouldRetry(errorInfo, attempt);
            if (shouldRetry) {
              const delay = this.calculateBackoff(attempt);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          }
          
          break;
        }
      }
      
      throw lastError;
    };
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorHandler;
}
