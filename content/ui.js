/**
 * UI Module - API-Based Architecture
 * Custom overlay UI for connection management without DOM manipulation
 */

const UI = {
  // UI elements cache
  elements: {},
  
  // State
  state: {
    searchTerm: '',
    filterType: 'all', // 'all' or 'recent'
    sortType: 'date-desc', // 'name-asc', 'name-desc', 'date-asc', 'date-desc'
    visibleConnections: [],
    displayedConnections: [],
    currentPage: 0,
    itemsPerPage: 50
  },

  /**
   * Initialize UI
   */
  async init() {
    console.log('LinkedIn Bulk Delete [UI]: Starting UI initialization...');
    
    try {
      await this.injectControlPanel();
      console.log('LinkedIn Bulk Delete [UI]: ✓ Control panel injected');
      
      this.bindEvents();
      console.log('LinkedIn Bulk Delete [UI]: ✓ Events bound');
      
      this.updateTheme();
      console.log('LinkedIn Bulk Delete [UI]: ✓ Theme updated');
      
      console.log('LinkedIn Bulk Delete [UI]: ✓ UI initialization complete');
    } catch (error) {
      console.error('LinkedIn Bulk Delete [UI]: ✗ UI initialization failed', error);
      console.error('LinkedIn Bulk Delete [UI]: Error stack:', error.stack);
      throw error;
    }
  },

  /**
   * Inject control panel into page
   */
  async injectControlPanel() {
    console.log('LinkedIn Bulk Delete [UI]: Starting control panel injection...');
    
    // Check if panel already exists
    const existingPanel = document.getElementById('linkedin-bulk-delete-panel');
    if (existingPanel) {
      console.log('LinkedIn Bulk Delete [UI]: Panel already exists, skipping injection');
      return;
    }

    // Create control panel
    const panel = document.createElement('div');
    panel.id = 'linkedin-bulk-delete-panel';
    panel.innerHTML = `
      <div class="lbd-panel-header">
        <h3>Bulk Delete Connections</h3>
        <div class="lbd-header-actions">
          <button class="lbtn lbtn-secondary" id="lbd-toggle-panel" title="Toggle Panel">
            <span class="lbtn-icon">◀</span>
          </button>
          <button class="lbtn lbtn-icon-only" id="lbd-close-panel" title="Close">×</button>
        </div>
      </div>
      
      <div class="lbd-panel-content">
        <!-- Connection Controls -->
        <div class="lbd-section">
          <div class="lbd-section-header">
            <h4>Connections</h4>
            <div class="lbd-stats-summary">
              <span class="lstat-item">
                <span class="lstat-label">Total:</span>
                <span class="lstat-value" id="lbd-total-count">0</span>
              </span>
              <span class="lstat-item">
                <span class="lstat-label">Selected:</span>
                <span class="lstat-value" id="lbd-selected-count">0</span>
              </span>
            </div>
          </div>

          <!-- Search and Filter -->
          <div class="lbd-controls-row">
            <div class="lsearch-box">
              <input type="text" id="lbd-search-input" placeholder="Search connections..." />
              <span class="lsearch-icon">🔍</span>
            </div>
            
            <div class="lfilter-box">
              <select id="lbd-filter-type">
                <option value="all">All Connections</option>
                <option value="recent">Last 30 Days</option>
              </select>
            </div>
            
            <div class="lsort-box">
              <select id="lbd-sort-type">
                <option value="date-desc">Recently Added</option>
                <option value="date-asc">Oldest First</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
              </select>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="lbd-actions-row">
            <button class="lbtn lbtn-secondary" id="lbd-fetch-connections">
              <span class="lbtn-icon">🔄</span>
              Fetch Connections
            </button>
            <button class="lbtn lbtn-secondary" id="lbd-select-all">
              Select All
            </button>
            <button class="lbtn lbtn-secondary" id="lbd-deselect-all">
              Deselect All
            </button>
          </div>

          <!-- Export/Import -->
          <div class="lbd-export-row">
            <button class="lbtn lbtn-secondary" id="lbd-export-csv">
              <span class="lbtn-icon">📥</span>
              Export CSV
            </button>
            <button class="lbtn lbtn-secondary" id="lbd-export-json">
              Export JSON
            </button>
            <label class="lbtn lbtn-secondary" id="lbd-import-label">
              <span class="lbtn-icon">📥</span>
              Import JSON
              <input type="file" id="lbd-import-file" accept=".json" style="display: none;" />
            </label>
          </div>
        </div>

        <!-- Connection List -->
        <div class="lbd-section">
          <div class="lbd-section-header">
            <h4>Connection List</h4>
            <span class="lbd-list-info" id="lbd-list-info">Showing 0 connections</span>
          </div>

          <!-- Connection List Container -->
          <div class="lbd-connection-list" id="lbd-connection-list">
            <div class="lbd-empty-state" id="lbd-empty-state">
              <div class="lbd-empty-icon">👥</div>
              <div class="lbd-empty-text">
                <p>No connections loaded</p>
                <p class="lbd-empty-sub">Click "Fetch Connections" to load your connections</p>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div class="lbd-pagination" id="lbd-pagination" style="display: none;">
            <button class="lbtn lbtn-secondary" id="lbd-prev-page" disabled>
              ← Previous
            </button>
            <span class="lbd-page-info">
              Page <span id="lbd-current-page">1</span> of <span id="lbd-total-pages">1</span>
            </span>
            <button class="lbtn lbtn-secondary" id="lbd-next-page" disabled>
              Next →
            </button>
          </div>
        </div>

        <!-- Deletion Controls -->
        <div class="lbd-section">
          <div class="lbd-section-header">
            <h4>Delete Selected</h4>
          </div>

          <!-- Statistics -->
          <div class="lbd-stats-grid">
            <div class="lstat-card">
              <span class="lstat-label">Deleted:</span>
              <span class="lstat-value lstat-success" id="lbd-deleted-count">0</span>
            </div>
            <div class="lstat-card">
              <span class="lstat-label">Failed:</span>
              <span class="lstat-value lstat-error" id="lbd-failed-count">0</span>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="lbd-progress-section" id="lbd-progress-section" style="display: none;">
            <div class="lbd-progress-bar">
              <div class="lbd-progress-fill" id="lbd-progress-fill"></div>
            </div>
            <div class="lbd-progress-info">
              <span id="lbd-progress-text">0%</span>
              <span id="lbd-progress-eta"></span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="lbd-actions-row lbd-delete-actions">
            <button class="lbtn lbtn-primary" id="lbd-delete-selected" disabled>
              <span class="lbtn-icon">🗑️</span>
              Delete Selected (<span id="lbd-delete-count">0</span>)
            </button>
            <button class="lbtn lbtn-warning" id="lbd-pause-resume" disabled>
              Pause
            </button>
            <button class="lbtn lbtn-danger" id="lbd-stop" disabled>
              Stop
            </button>
          </div>
        </div>

        <!-- Settings -->
        <div class="lbd-section">
          <div class="lbd-section-header">
            <h4>Settings</h4>
          </div>

          <div class="lbd-settings-grid">
            <div class="lsetting-item">
              <label for="lbd-delay">Delay (seconds):</label>
              <input type="number" id="lbd-delay" min="0.5" max="10" step="0.5" value="2.5" />
            </div>
            
            <div class="lsetting-item">
              <label>
                <input type="checkbox" id="lbd-show-confirmation" checked />
                Show confirmation
              </label>
            </div>

            <div class="lsetting-item">
              <label>Theme:</label>
              <select id="lbd-theme-select">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Notifications -->
        <div class="lbd-notifications" id="lbd-notifications"></div>
      </div>
    `;

    // Insert panel into body with fixed positioning
    panel.style.position = 'fixed';
    panel.style.top = '20px';
    panel.style.right = '20px';
    panel.style.zIndex = '9999';
    document.body.appendChild(panel);

    console.log('LinkedIn Bulk Delete [UI]: ✓ Panel injected successfully');

    // Cache elements
    this.cacheElements();
    console.log('LinkedIn Bulk Delete [UI]: ✓ Panel elements cached');
  },

  /**
   * Cache UI elements for quick access
   */
  cacheElements() {
    this.elements = {
      panel: document.getElementById('linkedin-bulk-delete-panel'),
      toggleBtn: document.getElementById('lbd-toggle-panel'),
      closeBtn: document.getElementById('lbd-close-panel'),
      totalCount: document.getElementById('lbd-total-count'),
      selectedCount: document.getElementById('lbd-selected-count'),
      searchInput: document.getElementById('lbd-search-input'),
      filterType: document.getElementById('lbd-filter-type'),
      sortType: document.getElementById('lbd-sort-type'),
      fetchBtn: document.getElementById('lbd-fetch-connections'),
      selectAllBtn: document.getElementById('lbd-select-all'),
      deselectAllBtn: document.getElementById('lbd-deselect-all'),
      exportCsvBtn: document.getElementById('lbd-export-csv'),
      exportJsonBtn: document.getElementById('lbd-export-json'),
      importLabel: document.getElementById('lbd-import-label'),
      importFile: document.getElementById('lbd-import-file'),
      connectionList: document.getElementById('lbd-connection-list'),
      emptyState: document.getElementById('lbd-empty-state'),
      listInfo: document.getElementById('lbd-list-info'),
      pagination: document.getElementById('lbd-pagination'),
      prevPageBtn: document.getElementById('lbd-prev-page'),
      nextPageBtn: document.getElementById('lbd-next-page'),
      currentPageSpan: document.getElementById('lbd-current-page'),
      totalPagesSpan: document.getElementById('lbd-total-pages'),
      deletedCount: document.getElementById('lbd-deleted-count'),
      failedCount: document.getElementById('lbd-failed-count'),
      progressSection: document.getElementById('lbd-progress-section'),
      progressFill: document.getElementById('lbd-progress-fill'),
      progressText: document.getElementById('lbd-progress-text'),
      progressEta: document.getElementById('lbd-progress-eta'),
      deleteBtn: document.getElementById('lbd-delete-selected'),
      deleteCountSpan: document.getElementById('lbd-delete-count'),
      pauseResumeBtn: document.getElementById('lbd-pause-resume'),
      stopBtn: document.getElementById('lbd-stop'),
      delayInput: document.getElementById('lbd-delay'),
      showConfirmationCheckbox: document.getElementById('lbd-show-confirmation'),
      themeSelect: document.getElementById('lbd-theme-select'),
      notifications: document.getElementById('lbd-notifications')
    };
  },

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Panel controls
    this.elements.toggleBtn?.addEventListener('click', () => this.togglePanel());
    this.elements.closeBtn?.addEventListener('click', () => this.cleanup());

    // Connection management
    this.elements.fetchBtn?.addEventListener('click', () => this.fetchConnections());
    this.elements.selectAllBtn?.addEventListener('click', () => this.selectAllConnections());
    this.elements.deselectAllBtn?.addEventListener('click', () => this.deselectAllConnections());

    // Search and filter
    this.elements.searchInput?.addEventListener('input', (e) => {
      this.state.searchTerm = e.target.value;
      this.applyFilters();
    });
    this.elements.filterType?.addEventListener('change', (e) => {
      this.state.filterType = e.target.value;
      this.applyFilters();
    });
    this.elements.sortType?.addEventListener('change', (e) => {
      this.state.sortType = e.target.value;
      this.applyFilters();
    });

    // Export/Import
    this.elements.exportCsvBtn?.addEventListener('click', () => this.exportConnections('csv'));
    this.elements.exportJsonBtn?.addEventListener('click', () => this.exportConnections('json'));
    this.elements.importFile?.addEventListener('change', (e) => this.importConnections(e.target.files[0]));

    // Pagination
    this.elements.prevPageBtn?.addEventListener('click', () => this.fetchPreviousPage());
    this.elements.nextPageBtn?.addEventListener('click', () => this.fetchNextPage());

    // Deletion controls
    this.elements.deleteBtn?.addEventListener('click', () => this.startDeletion());
    this.elements.pauseResumeBtn?.addEventListener('click', () => this.togglePauseResume());
    this.elements.stopBtn?.addEventListener('click', () => this.stopDeletion());

    // Settings
    this.elements.delayInput?.addEventListener('change', (e) => {
      const delay = parseFloat(e.target.value);
      if (delay >= 0.5 && delay <= 10) {
        Config.set('requestDelay', delay * 1000);
      }
    });
    this.elements.showConfirmationCheckbox?.addEventListener('change', (e) => {
      Config.set('showConfirmation', e.target.checked);
    });
    this.elements.themeSelect?.addEventListener('change', (e) => {
      Config.set('theme', e.target.value);
      this.updateTheme();
    });
  },

  /**
   * Fetch connections from API
   */
  async fetchConnections() {
    console.log('LinkedIn Bulk Delete [UI]: Fetching connections...');
    
    this.showLoading();
    this.elements.fetchBtn.disabled = true;
    this.elements.fetchBtn.innerHTML = '<span class="lbtn-icon">⏳</span> Fetching...';
 
    try {
      console.log('LinkedIn Bulk Delete [UI]: Calling fetchFirstPage...');
      const connections = await window.LinkedInBulkDelete.fetchFirstPage();
      console.log('LinkedIn Bulk Delete [UI]: Received connections:', {
        count: connections.length,
        isArray: Array.isArray(connections),
        firstItem: connections[0]
      });
      
      this.state.visibleConnections = connections;
      console.log('LinkedIn Bulk Delete [UI]: Calling renderCurrentPage...');
      this.renderCurrentPage();
      
      this.showNotification(`Successfully fetched ${connections.length} connections`, 'success');
    } catch (error) {
      console.error('LinkedIn Bulk Delete [UI]: Error fetching connections:', error);
      console.error('LinkedIn Bulk Delete [UI]: Error stack:', error.stack);
      this.showNotification('Failed to fetch connections', 'error');
    } finally {
      console.log('LinkedIn Bulk Delete [UI]: Calling hideLoading...');
      this.hideLoading();
      this.elements.fetchBtn.disabled = false;
      this.elements.fetchBtn.innerHTML = '<span class="lbtn-icon">🔄</span> Fetch Connections';
      console.log('LinkedIn Bulk Delete [UI]: Fetch complete');
    }
  },

  /**
   * Apply filters and render connections
   */
  applyFilters() {
    const state = window.LinkedInBulkDelete?.state;
    if (!state) {
      console.warn('LinkedIn Bulk Delete [UI]: State not available for filtering');
      return;
    }

    // Filter all connections from cache
    let filtered = [];
    state.pageCache.forEach((connections) => {
      filtered = [...filtered, ...connections];
    });

    // Apply search filter
    if (this.state.searchTerm) {
      const term = this.state.searchTerm.toLowerCase();
      filtered = filtered.filter(connection => {
        const matchesName = connection.fullName.toLowerCase().includes(term);
        const matchesHeadline = connection.headline.toLowerCase().includes(term);
        return matchesName || matchesHeadline;
      });
    }

    // Apply type filter
    if (this.state.filterType === 'recent') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filtered = filtered.filter(connection => {
        return connection.connectionDate && connection.connectionDate >= thirtyDaysAgo;
      });
    }

    // Sort connections
    switch (this.state.sortType) {
      case 'name-asc':
        filtered.sort((a, b) => a.fullName.localeCompare(b.fullName));
        break;
      case 'name-desc':
        filtered.sort((a, b) => b.fullName.localeCompare(a.fullName));
        break;
      case 'date-asc':
        filtered.sort((a, b) => {
          if (!a.connectionDate) return 1;
          if (!b.connectionDate) return -1;
          return a.connectionDate - b.connectionDate;
        });
        break;
      case 'date-desc':
      default:
        filtered.sort((a, b) => {
          if (!a.connectionDate) return -1;
          if (!b.connectionDate) return 1;
          return b.connectionDate - a.connectionDate;
        });
    }

    this.state.displayedConnections = filtered;
    
    // Note: Filtering doesn't work well with pagination since we cache pages
    // For now, we'll just show the current page from cache
    // A full implementation would need to rebuild the cache with filtered results
    console.warn('LinkedIn Bulk Delete [UI]: Filtering with pagination is limited. Showing current page from cache.');
    this.renderCurrentPage();
  },

  /**
   * Render current page from cache
   */
  renderCurrentPage() {
    const state = window.LinkedInBulkDelete?.state;
    if (!state) {
      console.warn('LinkedIn Bulk Delete [UI]: State not available');
      return;
    }

    const currentPage = state.currentPage;
    const pageConnections = state.pageCache.get(currentPage) || [];
    const totalPages = state.totalPages || 1;

    // Update list info
    const totalConnections = state.connections.length;
    const startRange = currentPage * state.connectionsPerPage + 1;
    const endRange = Math.min((currentPage + 1) * state.connectionsPerPage, totalConnections);
    this.elements.listInfo.textContent = totalConnections > 0
      ? `Showing ${startRange}-${endRange} of ${totalConnections} connections`
      : 'No connections loaded';

    // Update pagination controls
    this.updatePaginationControls(currentPage, totalPages);

    // Clear list
    this.elements.connectionList.innerHTML = '';

    // Show empty state if no connections
    if (pageConnections.length === 0) {
      this.elements.emptyState.style.display = 'block';
      this.elements.connectionList.appendChild(this.elements.emptyState);
      return;
    }

    // Render connection items
    pageConnections.forEach(connection => {
      const isSelected = state.selectedConnections?.has(connection.id) || false;
      
      const item = document.createElement('div');
      item.className = `lbd-connection-item ${isSelected ? 'lbd-selected' : ''}`;
      item.dataset.connectionId = connection.id;
      
      item.innerHTML = `
        <div class="lbd-connection-checkbox">
          <input type="checkbox"
                 id="lbd-checkbox-${connection.id}"
                 ${isSelected ? 'checked' : ''}
                 value="${connection.id}" />
        </div>
        <div class="lbd-connection-avatar">
          ${connection.profilePicture
            ? `<img src="${connection.profilePicture}" alt="${connection.fullName}" />`
            : '<div class="lbd-avatar-placeholder">' + connection.fullName.charAt(0) + '</div>'
          }
        </div>
        <div class="lbd-connection-info">
          <div class="lbd-connection-name">${connection.fullName}</div>
          <div class="lbd-connection-headline">${connection.headline}</div>
          ${connection.connectionDate
            ? `<div class="lbd-connection-date">Connected: ${connection.connectionDate.toLocaleDateString()}</div>`
            : ''
          }
        </div>
        <div class="lbd-connection-link">
          <a href="https://www.linkedin.com/in/${connection.publicIdentifier}"
             target="_blank"
             title="View profile">↗</a>
        </div>
      `;

      // Bind checkbox change event
      const checkbox = item.querySelector('input[type="checkbox"]');
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          state.selectedConnections?.add(connection.id);
        } else {
          state.selectedConnections?.delete(connection.id);
        }
        this.updateSelectedCount();
      });

      // Make entire item clickable
      item.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'A') {
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event('change'));
        }
      });

      this.elements.connectionList.appendChild(item);
    });
  },

  /**
   * Update pagination controls
   */
  updatePaginationControls(currentPage, totalPages) {
    const state = window.LinkedInBulkDelete?.state;
    if (!state) return;

    // Show pagination if we have connections
    if (state.connections.length > state.connectionsPerPage || state.totalPages > 1) {
      this.elements.pagination.style.display = 'flex';
      this.elements.currentPageSpan.textContent = currentPage + 1;
      
      // Show total pages if known, otherwise show "?"
      this.elements.totalPagesSpan.textContent = state.totalPages > 0 ? state.totalPages : '?';
      
      // Disable previous button on first page
      this.elements.prevPageBtn.disabled = currentPage === 0;
      
      // Disable next button on last page or if we don't know if there are more
      this.elements.nextPageBtn.disabled = !state.hasMoreConnections && currentPage >= state.totalPages - 1;
    } else {
      this.elements.pagination.style.display = 'none';
    }
  },

  /**
   * Fetch next page
   */
  async fetchNextPage() {
    console.log('LinkedIn Bulk Delete [UI]: Fetching next page...');
    this.showPageLoading();
    
    try {
      await window.LinkedInBulkDelete?.fetchNextPage?.();
      this.renderCurrentPage();
    } catch (error) {
      console.error('LinkedIn Bulk Delete [UI]: Error fetching next page:', error);
      this.showNotification('Failed to fetch next page', 'error');
    } finally {
      this.hidePageLoading();
    }
  },

  /**
   * Fetch previous page
   */
  async fetchPreviousPage() {
    console.log('LinkedIn Bulk Delete [UI]: Fetching previous page...');
    this.showPageLoading();
    
    try {
      await window.LinkedInBulkDelete?.fetchPreviousPage?.();
      this.renderCurrentPage();
    } catch (error) {
      console.error('LinkedIn Bulk Delete [UI]: Error fetching previous page:', error);
      this.showNotification('Failed to fetch previous page', 'error');
    } finally {
      this.hidePageLoading();
    }
  },

  /**
   * Show page loading state
   */
  showPageLoading() {
    const loadingItem = document.createElement('div');
    loadingItem.className = 'lbd-page-loading';
    loadingItem.innerHTML = `
      <div class="lbd-spinner"></div>
      <p>Loading page...</p>
    `;
    this.elements.connectionList.innerHTML = '';
    this.elements.connectionList.appendChild(loadingItem);
  },

  /**
   * Hide page loading state
   */
  hidePageLoading() {
    const loadingItem = this.elements.connectionList.querySelector('.lbd-page-loading');
    if (loadingItem) {
      loadingItem.remove();
    }
  },

  /**
   * Render connections list (deprecated - use renderCurrentPage instead)
   * @deprecated
   */
  renderConnections() {
    console.warn('LinkedIn Bulk Delete [UI]: renderConnections() is deprecated, use renderCurrentPage() instead');
    this.renderCurrentPage();
  },

  /**
   * Go to specific page (deprecated - use goToPage in content.js instead)
   * @deprecated
   */
  goToPage(page) {
    console.warn('LinkedIn Bulk Delete [UI]: goToPage() is deprecated, use window.LinkedInBulkDelete.goToPage() instead');
    window.LinkedInBulkDelete?.goToPage?.(page);
  },

  /**
   * Select all visible connections
   */
  selectAllConnections() {
    const checkboxes = this.elements.connectionList.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = true;
      const connectionId = checkbox.value;
      window.LinkedInBulkDelete?.state?.selectedConnections?.add(connectionId);
    });
    
    this.updateSelectedCount();
    this.showNotification('All visible connections selected', 'success');
  },

  /**
   * Deselect all connections
   */
  deselectAllConnections() {
    const checkboxes = this.elements.connectionList.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
    
    window.LinkedInBulkDelete?.state?.selectedConnections?.clear();
    this.updateSelectedCount();
    this.showNotification('All connections deselected', 'info');
  },

  /**
   * Update selected count display
   */
  updateSelectedCount() {
    const count = window.LinkedInBulkDelete?.state?.selectedConnections?.size || 0;
    if (this.elements.selectedCount) {
      this.elements.selectedCount.textContent = count;
    }
    if (this.elements.deleteCountSpan) {
      this.elements.deleteCountSpan.textContent = count;
    }
    this.elements.deleteBtn.disabled = count === 0;
  },

  /**
   * Update total connection count
   */
  updateConnectionCount(count) {
    if (this.elements.totalCount) {
      this.elements.totalCount.textContent = count;
    }
  },

  /**
   * Update deleted count display
   */
  updateDeletedCount(count) {
    if (this.elements.deletedCount) {
      this.elements.deletedCount.textContent = count;
    }
  },

  /**
   * Update failed count display
   */
  updateFailedCount(count) {
    if (this.elements.failedCount) {
      this.elements.failedCount.textContent = count;
    }
  },

  /**
   * Update progress bar
   */
  updateProgress(progress) {
    if (this.elements.progressFill) {
      this.elements.progressFill.style.width = `${progress}%`;
    }
    if (this.elements.progressText) {
      this.elements.progressText.textContent = `${progress}%`;
    }
  },

  /**
   * Update estimated time remaining
   */
  updateEta(seconds) {
    if (this.elements.progressEta) {
      if (seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        this.elements.progressEta.textContent = `ETA: ${minutes}m ${secs}s`;
      } else {
        this.elements.progressEta.textContent = '';
      }
    }
  },

  /**
   * Show progress section
   */
  showProgress() {
    if (this.elements.progressSection) {
      this.elements.progressSection.style.display = 'block';
    }
  },

  /**
   * Hide progress section
   */
  hideProgress() {
    if (this.elements.progressSection) {
      this.elements.progressSection.style.display = 'none';
    }
  },

  /**
   * Set processing state
   */
  setProcessingState(isProcessing) {
    // Enable/disable buttons
    this.elements.fetchBtn.disabled = isProcessing;
    this.elements.deleteBtn.disabled = isProcessing || window.LinkedInBulkDelete?.state?.selectedConnections?.size === 0;
    this.elements.pauseResumeBtn.disabled = !isProcessing;
    this.elements.stopBtn.disabled = !isProcessing;

    // Update pause/resume button text
    if (this.elements.pauseResumeBtn) {
      this.elements.pauseResumeBtn.textContent = isProcessing ? 'Pause' : 'Resume';
    }
  },

  /**
   * Start deletion process
   */
  async startDeletion() {
    console.log('LinkedIn Bulk Delete [UI]: Starting deletion process...');
    
    if (window.LinkedInBulkDelete?.state?.selectedConnections?.size === 0) {
      this.showNotification('Please select at least one connection', 'warning');
      return;
    }

    await window.LinkedInBulkDelete?.startDeletion?.();
  },

  /**
   * Toggle pause/resume
   */
  togglePauseResume() {
    const status = RequestQueue.getStatus();
    
    if (status.paused) {
      RequestQueue.resume();
      this.elements.pauseResumeBtn.textContent = 'Pause';
      this.showNotification('Resuming deletion...', 'info');
    } else {
      RequestQueue.pause();
      this.elements.pauseResumeBtn.textContent = 'Resume';
      this.showNotification('Paused deletion', 'warning');
    }
  },

  /**
   * Stop deletion
   */
  stopDeletion() {
    RequestQueue.stop();
    this.setProcessingState(false);
    this.hideProgress();
    this.showNotification('Deletion stopped', 'warning');
  },

  /**
   * Mark connection as deleted
   */
  markConnectionAsDeleted(connectionId) {
    const checkbox = document.getElementById(`lbd-checkbox-${connectionId}`);
    if (checkbox) {
      const item = checkbox.closest('.lbd-connection-item');
      item.classList.add('lbd-deleted');
      checkbox.disabled = true;
    }
  },

  /**
   * Mark connection as failed
   */
  markConnectionAsFailed(connectionId) {
    const checkbox = document.getElementById(`lbd-checkbox-${connectionId}`);
    if (checkbox) {
      const item = checkbox.closest('.lbd-connection-item');
      item.classList.add('lbd-failed');
    }
  },

  /**
   * Toggle panel visibility
   */
  togglePanel() {
    if (this.elements.panel) {
      this.elements.panel.classList.toggle('lbd-panel-hidden');
    }
  },

  /**
   * Update theme based on config
   */
  updateTheme() {
    const theme = Config.get('theme');
    if (this.elements.panel) {
      this.elements.panel.setAttribute('data-theme', theme);
    }
    if (this.elements.themeSelect) {
      this.elements.themeSelect.value = theme;
    }
  },

  /**
   * Show loading state
   */
  showLoading() {
    this.elements.connectionList.innerHTML = `
      <div class="lbd-loading-state">
        <div class="lbd-spinner"></div>
        <p>Fetching connections...</p>
      </div>
    `;
  },

  /**
   * Update fetch progress
   * @param {number} currentPage - Current page being fetched
   */
  updateFetchProgress(currentPage) {
    const loadingState = this.elements.connectionList.querySelector('.lbd-loading-state');
    if (loadingState) {
      const textElement = loadingState.querySelector('p');
      if (textElement) {
        textElement.textContent = `Fetching connections... Page ${currentPage}`;
      }
    }
  },

  /**
   * Hide loading state
   */
  hideLoading() {
    console.log('LinkedIn Bulk Delete [UI]: Hiding loading state');
    // Loading is hidden when renderConnections is called
    // But we should clear the loading state here in case renderConnections isn't called
    if (this.elements.connectionList.querySelector('.lbd-loading-state')) {
      console.log('LinkedIn Bulk Delete [UI]: Clearing loading state from DOM');
      this.elements.connectionList.innerHTML = '';
    }
  },

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    if (!this.elements.notifications) {
      return;
    }

    const notification = document.createElement('div');
    notification.className = `lbd-notification lbd-notification-${type}`;
    notification.textContent = message;

    this.elements.notifications.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.remove();
    }, 5000);
  },

  /**
   * Clear all notifications
   */
  clearNotifications() {
    if (this.elements.notifications) {
      this.elements.notifications.innerHTML = '';
    }
  },

  /**
   * Export connections
   */
  exportConnections(format) {
    window.LinkedInBulkDelete?.exportConnections?.(format);
  },

  /**
   * Import connections
   */
  async importConnections(file) {
    if (!file) {
      return;
    }
    await window.LinkedInBulkDelete?.importConnections?.(file);
  },

  /**
   * Get search term
   */
  getSearchTerm() {
    return this.state.searchTerm;
  },

  /**
   * Get filter type
   */
  getFilterType() {
    return this.state.filterType;
  },

  /**
   * Get sort type
   */
  getSortType() {
    return this.state.sortType;
  },

  /**
   * Clean up UI
   */
  cleanup() {
    if (this.elements.panel) {
      this.elements.panel.remove();
    }
    this.clearNotifications();
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UI;
}
