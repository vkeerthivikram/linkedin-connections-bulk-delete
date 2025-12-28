/**
 * Main Content Script - API-Based Architecture
 * Coordinates all modules for pure API-based connection management
 */

(function() {
  'use strict';

  // Check if script has already been initialized
  if (window.linkedinBulkDeleteInitialized) {
    return;
  }
  window.linkedinBulkDeleteInitialized = true;

  // Module references
  const modules = {
    Config: null,
    ErrorHandler: null,
    LinkedInAPI: null,
    RequestQueue: null,
    UI: null
  };

  // State
  const state = {
    isConnectionsPage: false,
    connections: [],
    filteredConnections: [],
    selectedConnections: new Set(),
    isFetching: false,
    currentPage: 0,
    hasMoreConnections: true,
    totalPages: 0,
    fetchedPages: new Set(),
    pageCache: new Map(),
    connectionsPerPage: 40
  };

  /**
   * Check if current page is LinkedIn Connections page
   * @returns {boolean} True if on Connections page
   */
  function isConnectionsPage() {
    const url = window.location.href;
    return url.includes('/mynetwork/invite-connect/connections') ||
           url.includes('/mynetwork/invite-connect/connections/');
  }

  /**
   * Initialize all modules
   */
  async function initializeModules() {
    console.log('LinkedIn Bulk Delete: Initializing modules...');

    try {
      // Set up module references
      modules.Config = Config;
      modules.ErrorHandler = ErrorHandler;
      modules.LinkedInAPI = LinkedInAPI;
      modules.RequestQueue = RequestQueue;
      modules.UI = UI;

      console.log('LinkedIn Bulk Delete: All modules initialized successfully');
      return true;
    } catch (error) {
      console.error('LinkedIn Bulk Delete: Failed to initialize modules', error);
      return false;
    }
  }

  /**
   * Initialize the extension
   */
  async function init() {
    console.log('%cLinkedIn Bulk Delete: Starting API-based initialization...', 'color: #0a66c2; font-weight: bold; font-size: 14px;');
    console.log('LinkedIn Bulk Delete: Current URL:', window.location.href);

    // Check if we're on Connections page
    if (!isConnectionsPage()) {
      console.log('LinkedIn Bulk Delete: Not on Connections page, skipping initialization');
      return;
    }

    state.isConnectionsPage = true;
    console.log('LinkedIn Bulk Delete: ✓ Confirmed on Connections page');

    // Initialize modules
    const modulesInitialized = await initializeModules();
    if (!modulesInitialized) {
      console.error('LinkedIn Bulk Delete: ✗ Module initialization failed');
      return;
    }
    console.log('LinkedIn Bulk Delete: ✓ Modules initialized successfully');

    // Initialize UI
    console.log('LinkedIn Bulk Delete: Initializing UI...');
    try {
      await UI.init();
      console.log('LinkedIn Bulk Delete: ✓ UI initialized');
    } catch (error) {
      console.error('LinkedIn Bulk Delete: ✗ UI initialization failed', error);
      return;
    }

    // Set up URL change listener for SPA navigation
    console.log('LinkedIn Bulk Delete: Setting up URL change listener...');
    setupUrlChangeListener();

    console.log('%cLinkedIn Bulk Delete: ✓ Initialization complete!', 'color: #0a66c2; font-weight: bold; font-size: 14px;');
    console.log('LinkedIn Bulk Delete: Ready to use! Press Ctrl+Shift+D to toggle panel');
  }

  /**
   * Fetch first page of connections
   * @returns {Promise<Array>} Array of connection objects
   */
  async function fetchFirstPage() {
    console.log('LinkedIn Bulk Delete: Fetching first page...');
    
    // Reset state
    state.connections = [];
    state.currentPage = 0;
    state.totalPages = 0;
    state.fetchedPages.clear();
    state.pageCache.clear();
    state.hasMoreConnections = true;
    state.isFetching = true;

    UI.showLoading();
    UI.updateConnectionCount(0);

    try {
      // Fetch first page
      const connections = await fetchPage(0);
      
      console.log(`LinkedIn Bulk Delete: ✓ Successfully fetched first page with ${connections.length} connections`);
      UI.hideLoading();
      state.isFetching = false;
      
      return connections;
    } catch (error) {
      console.error('LinkedIn Bulk Delete: Error fetching first page:', error);
      UI.hideLoading();
      state.isFetching = false;
      UI.showNotification('Failed to fetch connections', 'error');
      throw error;
    }
  }

  /**
   * Fetch a specific page of connections
   * @param {number} pageNumber - Page number (0-indexed)
   * @returns {Promise<Array>} Array of connection objects for this page
   */
  async function fetchPage(pageNumber) {
    console.log(`LinkedIn Bulk Delete: Fetching page ${pageNumber + 1}...`);
    
    // Check if page is already cached
    if (state.pageCache.has(pageNumber)) {
      console.log(`LinkedIn Bulk Delete: Page ${pageNumber + 1} already cached, returning from cache`);
      return state.pageCache.get(pageNumber);
    }

    try {
      // Fetch page from API
      const result = await LinkedInAPI.fetchConnections({
        count: state.connectionsPerPage,
        start: pageNumber * state.connectionsPerPage
      });

      console.log('LinkedIn Bulk Delete: API result received:', {
        success: result.success,
        hasData: !!result.data
      });

      if (result.success && result.data) {
        console.log('LinkedIn Bulk Delete: Parsing connections response...');
        const connections = parseConnectionsResponse(result.data);
        
        console.log(`LinkedIn Bulk Delete: Parsed ${connections.length} connections from page ${pageNumber + 1}`);
        
        // Cache the page
        state.pageCache.set(pageNumber, connections);
        state.fetchedPages.add(pageNumber);
        
        // Update total connections count
        state.connections = [...state.connections, ...connections];
        UI.updateConnectionCount(state.connections.length);

        // Check if there are more pages
        if (connections.length < state.connectionsPerPage) {
          state.hasMoreConnections = false;
          state.totalPages = pageNumber + 1;
          console.log('LinkedIn Bulk Delete: No more connections to fetch');
        } else {
          // We don't know total pages yet, but we know there's at least one more
          state.totalPages = Math.max(state.totalPages, pageNumber + 2);
        }

        console.log(`LinkedIn Bulk Delete: Fetched ${connections.length} connections (total: ${state.connections.length})`);

        return connections;
      } else {
        state.hasMoreConnections = false;
        console.warn('LinkedIn Bulk Delete: Failed to fetch connections');
        return [];
      }
    } catch (error) {
      console.error('LinkedIn Bulk Delete: Error fetching page:', error);
      throw error;
    }
  }

  /**
   * Navigate to a specific page
   * @param {number} pageNumber - Page number (0-indexed)
   * @returns {Promise<void>}
   */
  async function goToPage(pageNumber) {
    console.log(`LinkedIn Bulk Delete: Navigating to page ${pageNumber + 1}...`);
    
    if (pageNumber < 0) {
      console.warn('LinkedIn Bulk Delete: Invalid page number (negative)');
      return;
    }

    // Check if page is already cached
    if (state.pageCache.has(pageNumber)) {
      console.log(`LinkedIn Bulk Delete: Page ${pageNumber + 1} already cached`);
      state.currentPage = pageNumber;
      UI.renderCurrentPage();
      return;
    }

    // If we need to fetch a page beyond what we've seen, fetch it
    if (pageNumber >= state.totalPages && state.hasMoreConnections) {
      console.log(`LinkedIn Bulk Delete: Fetching page ${pageNumber + 1} from API...`);
      try {
        await fetchPage(pageNumber);
        state.currentPage = pageNumber;
        UI.renderCurrentPage();
      } catch (error) {
        console.error('LinkedIn Bulk Delete: Error fetching page:', error);
        UI.showNotification('Failed to fetch page', 'error');
      }
    } else if (pageNumber < state.totalPages) {
      // Page should exist, fetch it
      try {
        await fetchPage(pageNumber);
        state.currentPage = pageNumber;
        UI.renderCurrentPage();
      } catch (error) {
        console.error('LinkedIn Bulk Delete: Error fetching page:', error);
        UI.showNotification('Failed to fetch page', 'error');
      }
    } else {
      console.warn('LinkedIn Bulk Delete: Page does not exist');
    }
  }

  /**
   * Fetch next page
   * @returns {Promise<void>}
   */
  async function fetchNextPage() {
    console.log('LinkedIn Bulk Delete: Fetching next page...');
    await goToPage(state.currentPage + 1);
  }

  /**
   * Fetch previous page
   * @returns {Promise<void>}
   */
  async function fetchPreviousPage() {
    console.log('LinkedIn Bulk Delete: Fetching previous page...');
    await goToPage(state.currentPage - 1);
  }

  /**
   * Parse connections response from API
   * @param {Object} data - API response data
   * @returns {Array>} Array of connection objects
   */
  function parseConnectionsResponse(data) {
    console.log('LinkedIn Bulk Delete: parseConnectionsResponse called with data:', data);
    const connections = [];

    // Check if data has elements array
    if (!data.data || !data.data['*elements']) {
      console.warn('LinkedIn Bulk Delete: No elements in response');
      console.warn('LinkedIn Bulk Delete: data.data:', data.data);
      console.warn('LinkedIn Bulk Delete: data.data["*elements"]:', data.data?.['*elements']);
      return connections;
    }

    const elementUrns = data.data['*elements'];
    const included = data.included || [];

    console.log(`LinkedIn Bulk Delete: Found ${elementUrns.length} element URNs`);
    console.log(`LinkedIn Bulk Delete: Found ${included.length} items in included array`);

    // Create a map of profiles by URN for quick lookup
    const profileMap = new Map();
    included.forEach(item => {
      if (item.entityUrn && item.entityUrn.includes('urn:li:fsd_profile:')) {
        profileMap.set(item.entityUrn, item);
      }
    });

    console.log(`LinkedIn Bulk Delete: Created profile map with ${profileMap.size} profiles`);

    // Parse each connection element
    let connectionCount = 0;
    let skippedCount = 0;
    
    elementUrns.forEach(urn => {
      if (!urn.includes('urn:li:fsd_connection:')) {
        skippedCount++;
        return;
      }

      // Find the connection object in included
      const connection = included.find(item => item.entityUrn === urn);
      if (!connection) {
        console.warn(`LinkedIn Bulk Delete: Connection object not found for URN: ${urn}`);
        skippedCount++;
        return;
      }

      // Get profile information
      const profileUrn = connection.connectedMember;
      const profile = profileMap.get(profileUrn);

      if (!profile) {
        console.warn(`LinkedIn Bulk Delete: Profile not found for URN: ${profileUrn}`);
        skippedCount++;
        return;
      }

      // Extract profile picture URL
      let profilePicture = null;
      if (profile.profilePicture) {
        const picRef = profile.profilePicture.displayImageReference ||
                       profile.profilePicture.displayImageWithFrameReferenceUnion;
        if (picRef && picRef.vectorImage) {
          const artifacts = picRef.vectorImage.artifacts || [];
          // Prefer 200x200 size
          const artifact = artifacts.find(a => a.width === 200) || artifacts[0];
          if (artifact && picRef.vectorImage.rootUrl) {
            profilePicture = picRef.vectorImage.rootUrl + artifact.fileIdentifyingUrlPathSegment;
          }
        }
      }

      // Extract connection date
      const connectionDate = connection.createdAt ? new Date(connection.createdAt) : null;

      connections.push({
        id: urn,
        profileUrn: profileUrn,
        publicIdentifier: profile.publicIdentifier,
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        fullName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
        headline: profile.headline || '',
        profilePicture: profilePicture,
        connectionDate: connectionDate,
        memorialized: profile.memorialized || false
      });
      
      connectionCount++;
    });

    console.log(`LinkedIn Bulk Delete: Parsed ${connectionCount} connections, skipped ${skippedCount} items`);
    console.log('LinkedIn Bulk Delete: Sample parsed connection:', connections[0]);

    return connections;
  }

  /**
   * Apply search and filter to connections
   * Note: Filtering is limited with pagination as we cache pages
   */
  function applyFilters() {
    const searchTerm = UI.getSearchTerm().toLowerCase();
    const filterType = UI.getFilterType();

    // Collect all connections from cache
    let allConnections = [];
    state.pageCache.forEach((connections) => {
      allConnections = [...allConnections, ...connections];
    });

    state.filteredConnections = allConnections.filter(connection => {
      // Apply search filter
      if (searchTerm) {
        const matchesName = connection.fullName.toLowerCase().includes(searchTerm);
        const matchesHeadline = connection.headline.toLowerCase().includes(searchTerm);
        const matchesCompany = connection.headline.toLowerCase().includes(searchTerm);
        
        if (!matchesName && !matchesHeadline && !matchesCompany) {
          return false;
        }
      }

      // Apply type filter
      if (filterType === 'recent') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return connection.connectionDate && connection.connectionDate >= thirtyDaysAgo;
      } else if (filterType === 'all') {
        return true;
      }

      return true;
    });

    // Apply sort
    applySort();

    console.log(`LinkedIn Bulk Delete: Filtered to ${state.filteredConnections.length} connections`);
    console.log('LinkedIn Bulk Delete: Note: Filtering with pagination shows current page from cache');
    UI.renderCurrentPage();
  }

  /**
   * Apply sorting to connections
   */
  function applySort() {
    const sortType = UI.getSortType();

    switch (sortType) {
      case 'name-asc':
        state.filteredConnections.sort((a, b) => a.fullName.localeCompare(b.fullName));
        break;
      case 'name-desc':
        state.filteredConnections.sort((a, b) => b.fullName.localeCompare(a.fullName));
        break;
      case 'date-asc':
        state.filteredConnections.sort((a, b) => {
          if (!a.connectionDate) return 1;
          if (!b.connectionDate) return -1;
          return a.connectionDate - b.connectionDate;
        });
        break;
      case 'date-desc':
        state.filteredConnections.sort((a, b) => {
          if (!a.connectionDate) return -1;
          if (!b.connectionDate) return 1;
          return b.connectionDate - a.connectionDate;
        });
        break;
      default:
        // Default: recently added
        state.filteredConnections.sort((a, b) => {
          if (!a.connectionDate) return 1;
          if (!b.connectionDate) return -1;
          return b.connectionDate - a.connectionDate;
        });
    }
  }

  /**
   * Start deletion process
   */
  async function startDeletion() {
    console.log('LinkedIn Bulk Delete: Starting deletion process...');

    if (state.selectedConnections.size === 0) {
      console.warn('LinkedIn Bulk Delete: No connections selected');
      UI.showNotification('Please select at least one connection', 'warning');
      return;
    }

    console.log(`LinkedIn Bulk Delete: ${state.selectedConnections.size} connections selected for deletion`);

    // Show confirmation if enabled
    if (Config.get('showConfirmation')) {
      const confirmed = confirm(
        `Are you sure you want to delete ${state.selectedConnections.size} connection(s)? This action cannot be undone.`
      );
      if (!confirmed) {
        console.log('LinkedIn Bulk Delete: User cancelled deletion');
        return;
      }
    }

    // Prepare queue items
    const items = Array.from(state.selectedConnections).map(connectionId => ({
      id: connectionId,
      action: async () => {
        return await LinkedInAPI.deleteConnectionWithFallback(connectionId);
      },
      status: 'pending'
    }));

    console.log(`LinkedIn Bulk Delete: Prepared ${items.length} queue items`);

    // Set up queue callbacks
    RequestQueue.on('onStart', (status) => {
      console.log('LinkedIn Bulk Delete: Deletion started');
      UI.setProcessingState(true);
      UI.showProgress();
      UI.showNotification('Starting deletion process...', 'info');
    });

    RequestQueue.on('onProgress', (status) => {
      UI.updateProgress(RequestQueue.getProgress());
      UI.updateDeletedCount(status.stats.successful);
      UI.updateFailedCount(status.stats.failed);
      
      const eta = RequestQueue.getEstimatedTimeRemaining();
      UI.updateEta(eta);
    });

    RequestQueue.on('onComplete', (status) => {
      console.log('LinkedIn Bulk Delete: Deletion complete', status);
      UI.setProcessingState(false);
      UI.hideProgress();
      
      const message = `Deletion complete: ${status.stats.successful} successful, ${status.stats.failed} failed`;
      UI.showNotification(message, status.stats.failed > 0 ? 'warning' : 'success');
      
      // Remove deleted connections from list
      removeDeletedConnections();
    });

    RequestQueue.on('onError', (data) => {
      console.error('LinkedIn Bulk Delete: Deletion error', data);
      UI.showNotification('An error occurred during deletion', 'error');
    });

    RequestQueue.on('onItemComplete', (data) => {
      console.log(`LinkedIn Bulk Delete: Item complete: ${data.item.id}`);
      UI.markConnectionAsDeleted(data.item.id);
    });

    RequestQueue.on('onItemError', (data) => {
      console.error(`LinkedIn Bulk Delete: Item error: ${data.item.id}`, data.error);
      UI.markConnectionAsFailed(data.item.id);
    });

    // Clear queue and add items
    RequestQueue.clear();
    RequestQueue.addItems(items);

    console.log('LinkedIn Bulk Delete: Starting queue processing...');
    // Start processing
    await RequestQueue.start();
  }

  /**
   * Remove deleted connections from the list
   */
  function removeDeletedConnections() {
    const deletedCount = RequestQueue.getStatus().stats.successful;
    
    // Remove deleted connections from all cached pages
    state.pageCache.forEach((connections, pageNumber) => {
      state.pageCache.set(pageNumber, connections.filter(conn => !state.selectedConnections.has(conn.id)));
    });
    
    // Update total connections
    state.connections = state.connections.filter(conn => !state.selectedConnections.has(conn.id));
    state.selectedConnections.clear();
    
    UI.updateConnectionCount(state.connections.length);
    UI.renderCurrentPage();
    
    console.log(`LinkedIn Bulk Delete: Removed ${deletedCount} deleted connections from list`);
  }

  /**
   * Export connections to CSV
   */
  function exportConnections(format = 'csv') {
    if (state.connections.length === 0) {
      UI.showNotification('No connections to export', 'warning');
      return;
    }

    const connectionsToExport = state.filteredConnections.length > 0 
      ? state.filteredConnections 
      : state.connections;

    if (format === 'csv') {
      exportToCSV(connectionsToExport);
    } else if (format === 'json') {
      exportToJSON(connectionsToExport);
    }
  }

  /**
   * Export connections to CSV file
   * @param {Array} connections - Connections to export
   */
  function exportToCSV(connections) {
    const headers = ['Name', 'Profile URL', 'Headline', 'Connection Date'];
    const rows = connections.map(conn => [
      `"${conn.fullName}"`,
      `"https://www.linkedin.com/in/${conn.publicIdentifier}"`,
      `"${conn.headline.replace(/"/g, '""')}"`,
      `"${conn.connectionDate ? conn.connectionDate.toISOString() : ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csvContent, 'linkedin-connections.csv', 'text/csv');
    
    console.log(`LinkedIn Bulk Delete: Exported ${connections.length} connections to CSV`);
    UI.showNotification(`Exported ${connections.length} connections to CSV`, 'success');
  }

  /**
   * Export connections to JSON file
   * @param {Array} connections - Connections to export
   */
  function exportToJSON(connections) {
    const jsonContent = JSON.stringify(connections, null, 2);
    downloadFile(jsonContent, 'linkedin-connections.json', 'application/json');
    
    console.log(`LinkedIn Bulk Delete: Exported ${connections.length} connections to JSON`);
    UI.showNotification(`Exported ${connections.length} connections to JSON`, 'success');
  }

  /**
   * Import connections from JSON file
   * @param {File} file - JSON file to import
   */
  async function importConnections(file) {
    try {
      const content = await file.text();
      const importedConnections = JSON.parse(content);
      
      if (!Array.isArray(importedConnections)) {
        throw new Error('Invalid file format');
      }

      // Select connections that match imported IDs
      let selectedCount = 0;
      importedConnections.forEach(importedConn => {
        // Search in all cached pages
        state.pageCache.forEach((connections) => {
          const connection = connections.find(c => c.id === importedConn.id);
          if (connection) {
            state.selectedConnections.add(connection.id);
            selectedCount++;
          }
        });
      });

      UI.updateSelectedCount(state.selectedConnections.size);
      UI.renderCurrentPage();
      
      console.log(`LinkedIn Bulk Delete: Imported ${selectedCount} connections`);
      UI.showNotification(`Selected ${selectedCount} connections from import`, 'success');
    } catch (error) {
      console.error('LinkedIn Bulk Delete: Error importing connections:', error);
      UI.showNotification('Failed to import connections', 'error');
    }
  }

  /**
   * Download file to user's computer
   * @param {string} content - File content
   * @param {string} filename - File name
   * @param {string} mimeType - MIME type
   */
  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Set up URL change listener for SPA navigation
   */
  function setupUrlChangeListener() {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      handleUrlChange();
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      handleUrlChange();
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
  }

  /**
   * Handle URL changes
   */
  function handleUrlChange() {
    console.log('LinkedIn Bulk Delete: URL changed');

    if (isConnectionsPage()) {
      if (!state.isConnectionsPage) {
        state.isConnectionsPage = true;
        init();
      }
    } else {
      if (state.isConnectionsPage) {
        state.isConnectionsPage = false;
        cleanup();
      }
    }
  }

  /**
   * Clean up resources
   */
  function cleanup() {
    console.log('LinkedIn Bulk Delete: Cleaning up...');

    // Stop queue if processing
    RequestQueue.stop();

    // Remove UI panel
    UI.cleanup();

    // Clear state
    state.connections = [];
    state.filteredConnections = [];
    state.selectedConnections.clear();

    console.log('LinkedIn Bulk Delete: Cleanup complete');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      init();
    });
  } else {
    init();
  }

  // Expose API to global scope for debugging and external access
  window.LinkedInBulkDelete = {
    modules,
    state,
    init,
    cleanup,
    fetchFirstPage,
    fetchPage,
    fetchNextPage,
    fetchPreviousPage,
    goToPage,
    applyFilters,
    startDeletion,
    exportConnections,
    importConnections,
    isConnectionsPage
  };

})();
