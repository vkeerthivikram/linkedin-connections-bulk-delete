/**
 * Configuration Management Module
 * Handles default settings, user preferences, and settings persistence
 */

const Config = {
  // Default configuration values
  defaults: {
    // Delay between deletion requests in milliseconds (default: 2.5 seconds)
    requestDelay: 2500,
    
    // Maximum number of retry attempts for failed requests
    maxRetries: 3,
    
    // Exponential backoff multiplier for retries
    retryBackoffMultiplier: 2,
    
    // Initial backoff delay in milliseconds
    initialBackoffDelay: 1000,
    
    // Maximum backoff delay in milliseconds
    maxBackoffDelay: 30000,
    
    // Enable/disable notifications
    enableNotifications: true,
    
    // Enable/disable sound effects
    enableSoundEffects: false,
    
    // Auto-scroll to load more connections
    autoScroll: true,
    
    // Scroll delay in milliseconds
    scrollDelay: 1000,
    
    // Maximum number of scroll attempts
    maxScrollAttempts: 5,
    
    // Show confirmation dialog before deletion
    showConfirmation: true,
    
    // Theme: 'light' or 'dark'
    theme: 'light'
  },

  // Current configuration (loaded from storage or defaults)
  current: {},

  /**
   * Initialize configuration by loading from storage
   * @returns {Promise<Object>} Loaded configuration
   */
  async init() {
    try {
      const stored = await chrome.storage.local.get('linkedinBulkDeleteConfig');
      this.current = { ...this.defaults, ...(stored.linkedinBulkDeleteConfig || {}) };
      return this.current;
    } catch (error) {
      console.error('Failed to load configuration:', error);
      this.current = { ...this.defaults };
      return this.current;
    }
  },

  /**
   * Get a configuration value
   * @param {string} key - Configuration key
   * @returns {*} Configuration value
   */
  get(key) {
    return this.current[key];
  },

  /**
   * Set a configuration value
   * @param {string} key - Configuration key
   * @param {*} value - Configuration value
   * @returns {Promise<void>}
   */
  async set(key, value) {
    this.current[key] = value;
    await this.save();
  },

  /**
   * Set multiple configuration values
   * @param {Object} settings - Object with key-value pairs
   * @returns {Promise<void>}
   */
  async setMultiple(settings) {
    Object.assign(this.current, settings);
    await this.save();
  },

  /**
   * Reset configuration to defaults
   * @returns {Promise<void>}
   */
  async reset() {
    this.current = { ...this.defaults };
    await this.save();
  },

  /**
   * Save current configuration to storage
   * @returns {Promise<void>}
   */
  async save() {
    try {
      await chrome.storage.local.set({
        linkedinBulkDeleteConfig: this.current
      });
    } catch (error) {
      console.error('Failed to save configuration:', error);
      throw error;
    }
  },

  /**
   * Export configuration as JSON
   * @returns {string} JSON string of current configuration
   */
  export() {
    return JSON.stringify(this.current, null, 2);
  },

  /**
   * Import configuration from JSON
   * @param {string} jsonString - JSON string of configuration
   * @returns {Promise<void>}
   */
  async import(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      // Validate imported configuration
      const validated = this.validate(imported);
      this.current = { ...this.defaults, ...validated };
      await this.save();
    } catch (error) {
      console.error('Failed to import configuration:', error);
      throw new Error('Invalid configuration format');
    }
  },

  /**
   * Validate configuration object
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validated configuration
   */
  validate(config) {
    const validated = {};
    
    // Validate numeric settings
    if (typeof config.requestDelay === 'number' && config.requestDelay >= 500) {
      validated.requestDelay = config.requestDelay;
    }
    
    if (typeof config.maxRetries === 'number' && config.maxRetries >= 0) {
      validated.maxRetries = config.maxRetries;
    }
    
    if (typeof config.retryBackoffMultiplier === 'number' && config.retryBackoffMultiplier >= 1) {
      validated.retryBackoffMultiplier = config.retryBackoffMultiplier;
    }
    
    if (typeof config.initialBackoffDelay === 'number' && config.initialBackoffDelay >= 0) {
      validated.initialBackoffDelay = config.initialBackoffDelay;
    }
    
    if (typeof config.maxBackoffDelay === 'number' && config.maxBackoffDelay >= 0) {
      validated.maxBackoffDelay = config.maxBackoffDelay;
    }
    
    // Validate boolean settings
    if (typeof config.enableNotifications === 'boolean') {
      validated.enableNotifications = config.enableNotifications;
    }
    
    if (typeof config.enableSoundEffects === 'boolean') {
      validated.enableSoundEffects = config.enableSoundEffects;
    }
    
    if (typeof config.autoScroll === 'boolean') {
      validated.autoScroll = config.autoScroll;
    }
    
    if (typeof config.showConfirmation === 'boolean') {
      validated.showConfirmation = config.showConfirmation;
    }
    
    // Validate numeric settings
    if (typeof config.scrollDelay === 'number' && config.scrollDelay >= 100) {
      validated.scrollDelay = config.scrollDelay;
    }
    
    if (typeof config.maxScrollAttempts === 'number' && config.maxScrollAttempts >= 1) {
      validated.maxScrollAttempts = config.maxScrollAttempts;
    }
    
    // Validate theme
    if (config.theme === 'light' || config.theme === 'dark') {
      validated.theme = config.theme;
    }
    
    return validated;
  }
};
