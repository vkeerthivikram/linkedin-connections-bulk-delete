/**
 * Background Service Worker
 * Handles extension lifecycle and background tasks
 */

// Install event
chrome.runtime.onInstalled.addListener((details) => {
  console.log('LinkedIn Bulk Delete Connections extension installed/updated', details);
  
  if (details.reason === 'install') {
    // Set default configuration on install
    chrome.storage.local.set({
      linkedinBulkDeleteConfig: {
        requestDelay: 2500,
        maxRetries: 3,
        retryBackoffMultiplier: 2,
        initialBackoffDelay: 1000,
        maxBackoffDelay: 30000,
        enableNotifications: true,
        enableSoundEffects: false,
        autoScroll: true,
        scrollDelay: 1000,
        maxScrollAttempts: 5,
        showConfirmation: true,
        theme: 'light'
      }
    });
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  if (request.action === 'getConfig') {
    chrome.storage.local.get('linkedinBulkDeleteConfig', (result) => {
      sendResponse(result.linkedinBulkDeleteConfig || {});
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'setConfig') {
    chrome.storage.local.get('linkedinBulkDeleteConfig', (result) => {
      const currentConfig = result.linkedinBulkDeleteConfig || {};
      const newConfig = { ...currentConfig, ...request.config };
      chrome.storage.local.set({ linkedinBulkDeleteConfig: newConfig }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }
  
  if (request.action === 'resetConfig') {
    chrome.storage.local.set({
      linkedinBulkDeleteConfig: {
        requestDelay: 2500,
        maxRetries: 3,
        retryBackoffMultiplier: 2,
        initialBackoffDelay: 1000,
        maxBackoffDelay: 30000,
        enableNotifications: true,
        enableSoundEffects: false,
        autoScroll: true,
        scrollDelay: 1000,
        maxScrollAttempts: 5,
        showConfirmation: true,
        theme: 'light'
      }
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked on tab:', tab.url);
  
  // Check if we're on LinkedIn Connections page
  if (tab.url && tab.url.includes('/mynetwork/invite-connect/connections')) {
    // Inject content script if not already injected
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content/config.js', 'content/errorHandler.js', 'content/api.js', 'content/queue.js', 'content/ui.js', 'content/content.js']
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error injecting content script:', chrome.runtime.lastError);
      } else {
        console.log('Content script injected successfully');
      }
    });
  } else {
    // Show notification that user needs to be on Connections page
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'LinkedIn Bulk Delete',
      message: 'Please navigate to the LinkedIn Connections page to use this extension.',
      priority: 2
    });
  }
});

// Log when service worker is activated
self.addEventListener('activate', (event) => {
  console.log('LinkedIn Bulk Delete service worker activated');
});
