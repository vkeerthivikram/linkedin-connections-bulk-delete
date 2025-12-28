/**
 * Request Queue Module
 * Implements request queue with configurable delay, pause/resume, and status tracking
 */

const RequestQueue = {
  // Queue state
  queue: [],
  processing: false,
  paused: false,
  currentIndex: 0,
  
  // Statistics
  stats: {
    total: 0,
    completed: 0,
    successful: 0,
    failed: 0,
    skipped: 0
  },
  
  // Event callbacks
  callbacks: {
    onStart: null,
    onProgress: null,
    onComplete: null,
    onError: null,
    onItemStart: null,
    onItemComplete: null,
    onItemError: null
  },

  /**
   * Initialize the queue
   */
  init() {
    this.queue = [];
    this.processing = false;
    this.paused = false;
    this.currentIndex = 0;
    this.resetStats();
  },

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      total: 0,
      completed: 0,
      successful: 0,
      failed: 0,
      skipped: 0
    };
  },

  /**
   * Add items to the queue
   * @param {Array} items - Array of items to add
   */
  addItems(items) {
    this.queue.push(...items);
    this.stats.total = this.queue.length;
  },

  /**
   * Add a single item to the queue
   * @param {Object} item - Item to add
   */
  addItem(item) {
    this.queue.push(item);
    this.stats.total = this.queue.length;
  },

  /**
   * Remove an item from the queue
   * @param {string} itemId - Item ID to remove
   */
  removeItem(itemId) {
    const index = this.queue.findIndex(item => item.id === itemId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.stats.total = this.queue.length;
    }
  },

  /**
   * Clear the queue
   */
  clear() {
    this.queue = [];
    this.resetStats();
    this.currentIndex = 0;
  },

  /**
   * Get queue status
   * @returns {Object} Queue status object
   */
  getStatus() {
    return {
      processing: this.processing,
      paused: this.paused,
      currentIndex: this.currentIndex,
      queueLength: this.queue.length,
      stats: { ...this.stats }
    };
  },

  /**
   * Set event callback
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (this.callbacks.hasOwnProperty(event)) {
      this.callbacks[event] = callback;
    }
  },

  /**
   * Trigger event callback
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  trigger(event, data) {
    if (this.callbacks[event] && typeof this.callbacks[event] === 'function') {
      this.callbacks[event](data);
    }
  },

  /**
   * Start processing the queue
   * @returns {Promise<Object>} Processing results
   */
  async start() {
    if (this.processing) {
      console.warn('Queue is already processing');
      return this.getStatus();
    }

    if (this.queue.length === 0) {
      console.warn('Queue is empty');
      return this.getStatus();
    }

    this.processing = true;
    this.paused = false;
    this.resetStats();
    this.stats.total = this.queue.length;
    this.currentIndex = 0;

    this.trigger('onStart', this.getStatus());

    try {
      await this.processQueue();
      this.trigger('onComplete', this.getStatus());
    } catch (error) {
      console.error('Queue processing error:', error);
      this.trigger('onError', { error, status: this.getStatus() });
    } finally {
      this.processing = false;
    }

    return this.getStatus();
  },

  /**
   * Process the queue
   */
  async processQueue() {
    const requestDelay = Config.get('requestDelay');

    while (this.currentIndex < this.queue.length && !this.paused) {
      const item = this.queue[this.currentIndex];
      
      try {
        this.trigger('onItemStart', { item, index: this.currentIndex });
        
        // Execute the item's action
        const result = await this.executeItem(item);
        
        this.stats.completed++;
        this.stats.successful++;
        
        this.trigger('onItemComplete', {
          item,
          index: this.currentIndex,
          result
        });
        
      } catch (error) {
        this.stats.completed++;
        this.stats.failed++;
        
        this.trigger('onItemError', {
          item,
          index: this.currentIndex,
          error
        });
      }

      this.currentIndex++;

      // Trigger progress update
      this.trigger('onProgress', this.getStatus());

      // Add delay between requests (unless it's the last item)
      if (this.currentIndex < this.queue.length && !this.paused) {
        await this.delay(requestDelay);
      }
    }
  },

  /**
   * Execute a single queue item
   * @param {Object} item - Queue item
   * @returns {Promise<Object>} Execution result
   */
  async executeItem(item) {
    if (!item.action || typeof item.action !== 'function') {
      throw new Error('Item must have an action function');
    }

    // Use ErrorHandler to wrap the action with retry logic
    const retryableAction = ErrorHandler.retryable(item.action, {
      context: { itemId: item.id }
    });

    return await retryableAction();
  },

  /**
   * Pause queue processing
   */
  pause() {
    if (this.processing && !this.paused) {
      this.paused = true;
      console.log('Queue paused');
    }
  },

  /**
   * Resume queue processing
   * @returns {Promise<Object>} Processing results
   */
  async resume() {
    if (this.paused) {
      this.paused = false;
      console.log('Queue resumed');
      
      if (this.processing) {
        await this.processQueue();
        this.trigger('onComplete', this.getStatus());
      }
    }
    
    return this.getStatus();
  },

  /**
   * Stop queue processing
   */
  stop() {
    this.processing = false;
    this.paused = false;
    console.log('Queue stopped');
  },

  /**
   * Get pending items
   * @returns {Array} Pending items
   */
  getPendingItems() {
    return this.queue.slice(this.currentIndex);
  },

  /**
   * Get completed items
   * @returns {Array} Completed items
   */
  getCompletedItems() {
    return this.queue.slice(0, this.currentIndex);
  },

  /**
   * Get failed items
   * @returns {Array} Failed items
   */
  getFailedItems() {
    const failedItems = [];
    
    for (let i = 0; i < this.currentIndex; i++) {
      const item = this.queue[i];
      if (item.status === 'failed') {
        failedItems.push(item);
      }
    }
    
    return failedItems;
  },

  /**
   * Retry failed items
   * @returns {Promise<Object>} Processing results
   */
  async retryFailed() {
    const failedItems = this.getFailedItems();
    
    if (failedItems.length === 0) {
      console.log('No failed items to retry');
      return this.getStatus();
    }

    // Reset failed items and add them back to queue
    const itemsToRetry = failedItems.map(item => ({
      ...item,
      status: 'pending'
    }));

    // Clear failed items from queue
    this.queue = this.queue.filter(item => item.status !== 'failed');
    
    // Add items to retry at the end
    this.addItems(itemsToRetry);

    // Resume processing
    return await this.resume();
  },

  /**
   * Skip current item
   */
  skipCurrent() {
    if (this.currentIndex < this.queue.length) {
      const item = this.queue[this.currentIndex];
      item.status = 'skipped';
      this.stats.skipped++;
      this.currentIndex++;
      console.log('Skipped item:', item.id);
    }
  },

  /**
   * Delay execution
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Update item status
   * @param {string} itemId - Item ID
   * @param {string} status - New status
   */
  updateItemStatus(itemId, status) {
    const item = this.queue.find(item => item.id === itemId);
    if (item) {
      item.status = status;
    }
  },

  /**
   * Get item by ID
   * @param {string} itemId - Item ID
   * @returns {Object|null} Item or null if not found
   */
  getItem(itemId) {
    return this.queue.find(item => item.id === itemId) || null;
  },

  /**
   * Get progress percentage
   * @returns {number} Progress percentage (0-100)
   */
  getProgress() {
    if (this.stats.total === 0) {
      return 0;
    }
    return Math.round((this.stats.completed / this.stats.total) * 100);
  },

  /**
   * Get estimated time remaining
   * @returns {number} Estimated seconds remaining
   */
  getEstimatedTimeRemaining() {
    if (this.currentIndex === 0 || this.paused || !this.processing) {
      return null;
    }

    const requestDelay = Config.get('requestDelay');
    const itemsRemaining = this.queue.length - this.currentIndex;
    
    // Estimate based on request delay
    return Math.ceil((itemsRemaining * requestDelay) / 1000);
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RequestQueue;
}
