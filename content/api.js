/**
 * LinkedIn API Integration Module
 * Handles API requests, authentication, and connection management
 * Updated for API-based architecture
 */

const LinkedInAPI = {
  // API endpoints (from research.md)
  endpoints: {
    // Connection deletion endpoint (from research.md)
    deleteConnection: () =>
      `https://www.linkedin.com/voyager/api/relationships/dash/connections?action=removeFromMyConnections`,
    
    // Fetch connections endpoint (from research.md)
    fetchConnections: ({ count = 40, start = 0, decorationId = 'com.linkedin.voyager.dash.deco.web.mynetwork.ConnectionListWithProfile-16' } = {}) =>
      `https://www.linkedin.com/voyager/api/relationships/dash/connections?decorationId=${decorationId}&count=${count}&q=search&sortType=RECENTLY_ADDED&start=${start}`,
    
    // Profile information endpoint
    getProfile: (profileId) =>
      `https://www.linkedin.com/voyager/api/identity/profiles/${profileId}`
  },

  // Request headers (from research.md)
  headers: {
    'accept': 'application/vnd.linkedin.normalized+json+2.1',
    'accept-language': 'en-US,en;q=0.9',
    'content-type': 'application/json; charset=UTF-8',
    'origin': 'https://www.linkedin.com',
    'referer': 'https://www.linkedin.com/mynetwork/invite-connect/connections/',
    'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Linux"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
    'x-li-lang': 'en_US',
    'x-li-page-instance': 'urn:li:page:d_flagship3_people_connections',
    'x-li-track': '{"clientVersion":"1.13.41695","mpVersion":"1.13.41695","osName":"web","timezoneOffset":5.5,"timezone":"Asia/Calcutta","deviceFormFactor":"DESKTOP","mpName":"voyager-web","displayDensity":1,"displayWidth":1920,"displayHeight":1080}',
    'x-restli-protocol-version': '2.0.0'
  },

  /**
   * Get CSRF token from page (from research.md)
   * Primary method: Extract from JSESSIONID cookie
   * @returns {string|null} CSRF token or null if not found
   */
  getCSRFToken() {
    // Try multiple methods to find CSRF token
    const methods = [
      // Method 1: From JSESSIONID cookie (primary method from research.md)
      () => {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'JSESSIONID') {
            // Extract value between quotes, e.g., "ajax:4083311973012218286"
            const match = value.match(/"([^"]+)"/);
            if (match) {
              console.log('LinkedIn Bulk Delete: CSRF token from JSESSIONID:', match[1]);
              return match[1];
            }
          }
        }
        return null;
      },
      
      // Method 2: From meta tag
      () => {
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (token) {
          console.log('LinkedIn Bulk Delete: CSRF token from meta tag:', token);
        }
        return token;
      },
      
      // Method 3: From page data
      () => {
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const match = script.textContent?.match(/csrfToken["\s:]+([a-zA-Z0-9_-]+)/);
          if (match) {
            console.log('LinkedIn Bulk Delete: CSRF token from script:', match[1]);
            return match[1];
          }
        }
        return null;
      },
      
      // Method 4: From window object
      () => {
        const token = window.btf?.csrfToken || window.IN?.csrfToken || null;
        if (token) {
          console.log('LinkedIn Bulk Delete: CSRF token from window:', token);
        }
        return token;
      }
    ];

    for (const method of methods) {
      const token = method();
      if (token) {
        return token;
      }
    }

    console.warn('LinkedIn Bulk Delete: CSRF token not found');
    return null;
  },

  /**
   * Get all cookies as a string for request (from research.md)
   * Key cookies identified: bcookie, bscookie, dfpfpt, fptctx2, li_rm, timezone, 
   * li_theme, li_theme_set, visit, lang, liap, li_at, JSESSIONID, lidc, UserMatchHistory
   * @returns {string} Cookies string
   */
  getCookies() {
    const cookies = document.cookie;
    console.log('LinkedIn Bulk Delete: Extracting cookies...');
    
    // Log presence of important cookies
    const importantCookies = ['JSESSIONID', 'li_at', 'bscookie', 'bcookie', 'lidc'];
    importantCookies.forEach(cookieName => {
      const hasCookie = cookies.includes(cookieName + '=');
      console.log(`LinkedIn Bulk Delete: ${cookieName} present:`, hasCookie);
    });
    
    return cookies;
  },

  /**
   * Build request headers with CSRF token and cookies (from research.md)
   * @returns {Object} Headers object
   */
  buildHeaders() {
    const csrfToken = this.getCSRFToken();
    const cookies = this.getCookies();
 
    const headers = {
      ...this.headers,
      'cookie': cookies
    };

    // Add CSRF token from research.md
    if (csrfToken) {
      headers['csrf-token'] = csrfToken;
    }

    return headers;
  },

  /**
   * Delete a connection (from research.md)
   * Uses POST method with action=removeFromMyConnections
   * @param {string} connectionId - Connection ID (urn:li:fsd_profile:ID)
   * @returns {Promise<Object>} Response data
   */
  async deleteConnection(connectionId) {
    if (!connectionId) {
      throw new Error('Connection ID is required');
    }

    // Use endpoint from research.md
    const url = this.endpoints.deleteConnection();
    const headers = this.buildHeaders();
 
    // Build request body from research.md
    const body = {
      connectedMember: connectionId
    };

    try {
      console.log('LinkedIn Bulk Delete: Deleting connection:', connectionId);
      const response = await fetch(url, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(body)
      });

      // Handle response
      if (response.ok) {
        console.log('LinkedIn Bulk Delete: Successfully deleted:', connectionId);
        return {
          success: true,
          connectionId,
          status: response.status
        };
      }

      // Handle error responses
      const errorData = await response.json().catch(() => ({}));
      console.error('LinkedIn Bulk Delete: Delete failed:', connectionId, errorData);
      throw new Error(
        `Delete failed: ${response.status} ${response.statusText}`,
        { cause: errorData }
      );

    } catch (error) {
      console.error('LinkedIn Bulk Delete: Error deleting connection:', connectionId, error);
      throw error;
    }
  },

  /**
   * Alternative delete method using different endpoint
   * @param {string} connectionId - Connection ID to delete
   * @returns {Promise<Object>} Response data
   */
  async deleteConnectionV2(connectionId) {
    if (!connectionId) {
      throw new Error('Connection ID is required');
    }

    // Alternative endpoint using memberConnections
    const url = `https://www.linkedin.com/voyager/api/identity/profiles/${connectionId}/memberConnections`;
    const headers = this.buildHeaders();
 
    try {
      console.log('LinkedIn Bulk Delete: Trying alternative delete method for:', connectionId);
      const response = await fetch(url, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      });

      if (response.ok) {
        console.log('LinkedIn Bulk Delete: Alternative delete succeeded:', connectionId);
        return {
          success: true,
          connectionId,
          status: response.status
        };
      }

      const errorData = await response.json().catch(() => ({}));
      console.error('LinkedIn Bulk Delete: Alternative delete failed:', connectionId, errorData);
      throw new Error(
        `Delete failed: ${response.status} ${response.statusText}`,
        { cause: errorData }
      );

    } catch (error) {
      console.error('LinkedIn Bulk Delete: Error deleting connection (v2):', connectionId, error);
      throw error;
    }
  },

  /**
   * Try multiple deletion methods
   * @param {string} connectionId - Connection ID to delete
   * @returns {Promise<Object>} Response data
   */
  async deleteConnectionWithFallback(connectionId) {
    // Try primary method first (from research.md)
    try {
      return await this.deleteConnection(connectionId);
    } catch (error) {
      console.warn('Primary delete method failed, trying fallback:', error);
      
      // Try fallback method
      try {
        return await this.deleteConnectionV2(connectionId);
      } catch (fallbackError) {
        console.error('Fallback delete method also failed:', fallbackError);
        throw fallbackError;
      }
    }
  },

  /**
   * Delete multiple connections
   * @param {Array<string>} connectionIds - Array of connection IDs
   * @param {Function} progressCallback - Callback for progress updates
   * @returns {Promise<Object>} Results object
   */
  async deleteMultipleConnections(connectionIds, progressCallback) {
    const results = {
      total: connectionIds.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < connectionIds.length; i++) {
      const connectionId = connectionIds[i];
      
      try {
        await this.deleteConnectionWithFallback(connectionId);
        results.successful++;
        
        if (progressCallback) {
          progressCallback({
            index: i,
            total: connectionIds.length,
            connectionId,
            success: true
          });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          connectionId,
          error: error.message
        });
        
        if (progressCallback) {
          progressCallback({
            index: i,
            total: connectionIds.length,
            connectionId,
            success: false,
            error: error.message
          });
        }
      }
    }

    return results;
  },

  /**
   * Check if user is authenticated
   * @returns {Promise<boolean>} Authentication status
   */
  async isAuthenticated() {
    try {
      // Check if we have necessary cookies (from research.md)
      const cookies = document.cookie;
      const hasSessionCookie = cookies.includes('JSESSIONID') || 
                               cookies.includes('li_at');
      
      if (!hasSessionCookie) {
        console.warn('LinkedIn Bulk Delete: No session cookie found');
        return false;
      }

      // Try to make a simple API call to verify authentication
      const headers = this.buildHeaders();
      const response = await fetch('https://www.linkedin.com/voyager/api/me', {
        method: 'GET',
        headers,
        credentials: 'include'
      });

      return response.ok;
    } catch (error) {
      console.error('LinkedIn Bulk Delete: Error checking authentication:', error);
      return false;
    }
  },

  /**
   * Fetch connections from LinkedIn API (from research.md)
   * Enhanced for pagination and proper parsing
   * @param {Object} options - Options for fetching connections
   * @returns {Promise<Object>} Response data
   */
  async fetchConnections(options = {}) {
    const {
      count = 40,
      start = 0,
      decorationId = 'com.linkedin.voyager.dash.deco.web.mynetwork.ConnectionListWithProfile-16'
    } = options;
 
    const url = this.endpoints.fetchConnections({ count, start, decorationId });
    const headers = this.buildHeaders();
 
    try {
      console.log('LinkedIn Bulk Delete: Fetching connections with options:', { count, start });
      console.log('LinkedIn Bulk Delete: Request URL:', url);
      console.log('LinkedIn Bulk Delete: Request headers:', Object.keys(headers));
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include'
      });

      console.log('LinkedIn Bulk Delete: Response status:', response.status, response.statusText);
      console.log('LinkedIn Bulk Delete: Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const data = await response.json();
        console.log('LinkedIn Bulk Delete: ✓ Successfully fetched connections');
        console.log('LinkedIn Bulk Delete: Raw response data structure:', {
          hasData: !!data,
          hasDataField: !!data?.data,
          hasElements: !!data?.data?.['*elements'],
          elementsCount: data?.data?.['*elements']?.length || 0,
          hasIncluded: !!data?.included,
          includedCount: data?.included?.length || 0
        });
        console.log('LinkedIn Bulk Delete: Full response data:', data);
        
        return {
          success: true,
          data
        };
      }

      const errorData = await response.json().catch(() => ({}));
      console.error('LinkedIn Bulk Delete: Failed to fetch connections:', errorData);
      throw new Error(
        `Fetch failed: ${response.status} ${response.statusText}`,
        { cause: errorData }
      );

    } catch (error) {
      console.error('LinkedIn Bulk Delete: Error fetching connections:', error);
      console.error('LinkedIn Bulk Delete: Error stack:', error.stack);
      throw error;
    }
  },

  /**
   * Parse connections response from API
   * Extracts connection data from the complex response structure
   * @param {Object} data - API response data
   * @returns {Array>} Array of connection objects
   */
  parseConnectionsResponse(data) {
    const connections = [];

    // Check if data has elements array
    if (!data.data || !data.data['*elements']) {
      console.warn('LinkedIn Bulk Delete: No elements in response');
      return connections;
    }

    const elementUrns = data.data['*elements'];
    const included = data.included || [];

    // Create a map of profiles by URN for quick lookup
    const profileMap = new Map();
    included.forEach(item => {
      if (item.entityUrn && item.entityUrn.includes('urn:li:fsd_profile:')) {
        profileMap.set(item.entityUrn, item);
      }
    });

    // Parse each connection element
    elementUrns.forEach(urn => {
      if (!urn.includes('urn:li:fsd_connection:')) {
        return;
      }

      // Find the connection object in included
      const connection = included.find(item => item.entityUrn === urn);
      if (!connection) {
        return;
      }

      // Get profile information
      const profileUrn = connection.connectedMember;
      const profile = profileMap.get(profileUrn);

      if (!profile) {
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
    });

    return connections;
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LinkedInAPI;
}
