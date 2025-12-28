# LinkedIn Bulk Delete Connections

A comprehensive Chrome Extension for bulk deleting LinkedIn connections with rate limiting, visual feedback, and a professional user interface.

## Features

- **Bulk Selection**: Select multiple connections at once with checkboxes
- **Mass Deletion**: Delete selected connections in batches
- **Rate Limiting**: Configurable delay between requests to avoid LinkedIn's rate limits
- **Progress Tracking**: Real-time progress bar with ETA
- **Pause/Resume**: Control the deletion process with pause and resume functionality
- **Error Handling**: Comprehensive error handling with automatic retry logic
- **Visual Feedback**: Success/error indicators for each deletion
- **Auto-Scroll**: Automatically scroll to load more connections
- **Dark/Light Theme**: Support for both themes
- **Keyboard Shortcuts**: Quick access with Ctrl+Shift+D to toggle panel

## Installation

### Method 1: Load Unpacked Extension (Development)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked"
5. Select the `linkedin-bulk-delete-connections` folder
6. The extension is now installed!

### Method 2: Create Icon Files (Required)

Before installing, you need to create icon files:

1. Navigate to the `icons/` directory
2. Create three PNG files:
   - `icon16.png` (16x16 pixels)
   - `icon48.png` (48x48 pixels)
   - `icon128.png` (128x128 pixels)
3. Use a blue background (#0a66c2) with a white trash can icon
4. Save the files in the `icons/` directory

## Usage

1. **Navigate to LinkedIn Connections Page**
   - Go to https://www.linkedin.com/mynetwork/invite-connect/connections/
   - The extension will automatically activate

2. **Select Connections**
   - Checkboxes will appear on each connection card
   - Click individual checkboxes to select connections
   - Use "Select All" to select all visible connections
   - Use "Deselect All" to clear your selection

3. **Configure Settings** (Optional)
   - Adjust the delay between deletions (default: 2.5 seconds)
   - Enable/disable auto-scroll to load more connections

4. **Delete Selected Connections**
   - Click "Delete Selected" button
   - Confirm the deletion if prompted
   - Watch the progress bar and statistics
   - Use "Pause" to temporarily stop the process
   - Use "Resume" to continue
   - Use "Stop" to cancel the entire operation

5. **Monitor Progress**
   - Track selected, deleted, and failed counts
   - View real-time progress percentage
   - See estimated time remaining
   - Receive notifications for success/errors

## Configuration

The extension includes several configurable settings:

- **Request Delay**: Time between deletion requests (0.5-10 seconds, default: 2.5s)
- **Max Retries**: Number of retry attempts for failed requests (default: 3)
- **Auto-Scroll**: Automatically scroll to load more connections (default: enabled)
- **Show Confirmation**: Show confirmation dialog before deletion (default: enabled)
- **Theme**: Light or dark theme (default: light)

Settings are persisted using Chrome's storage API.

## File Structure

```
linkedin-bulk-delete-connections/
├── manifest.json              # Extension manifest (Manifest V3)
├── background.js              # Background service worker
├── popup.html                 # Extension popup interface
├── content/                   # Content scripts
│   ├── content.js            # Main content script (orchestrator)
│   ├── styles.css            # UI styling
│   ├── api.js                # LinkedIn API integration
│   ├── queue.js              # Request queue with rate limiting
│   ├── ui.js                 # UI components and visual indicators
│   ├── errorHandler.js       # Error handling and retry logic
│   └── config.js             # Configuration management
├── icons/                     # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── README.md
└── README.md                  # This file
```

## Module Descriptions

### content.js
Main orchestrator that:
- Detects when user is on LinkedIn Connections page
- Initializes all modules
- Manages page lifecycle (navigation, cleanup)
- Sets up mutation observers for dynamic content
- Handles keyboard shortcuts

### api.js
LinkedIn API integration that:
- Converts CURL commands to fetch requests
- Handles authentication using session cookies
- Manages CSRF tokens
- Implements connection deletion endpoints
- Extracts connection IDs from page elements

### queue.js
Request queue system that:
- Implements configurable delay between requests
- Provides pause/resume functionality
- Tracks queue status (pending, processing, completed, failed)
- Calculates estimated time remaining
- Supports retry of failed items

### ui.js
User interface module that:
- Injects control panel into the page
- Adds checkboxes to connection cards
- Displays progress bar and statistics
- Shows success/error notifications
- Manages button states and interactions

### errorHandler.js
Error handling module that:
- Classifies errors (network, API, rate limit, auth)
- Implements exponential backoff for retries
- Provides user-friendly error messages
- Logs errors for debugging
- Wraps functions with retry logic

### config.js
Configuration management that:
- Defines default settings
- Loads/saves settings to Chrome storage
- Validates configuration values
- Supports import/export of settings
- Manages theme preferences

### styles.css
Professional styling that:
- Provides responsive design
- Supports light and dark themes
- Animates UI elements
- Styles checkboxes, buttons, and notifications
- Ensures unobtrusive integration with LinkedIn

## Technical Details

### Manifest V3 Compliance
- Uses service workers instead of background pages
- No inline JavaScript in HTML files
- Proper host permissions for LinkedIn domains
- Content scripts injected at document_idle

### Rate Limiting
- Default delay of 2.5 seconds between deletions
- Configurable from 0.5 to 10 seconds
- Exponential backoff for retries
- Jitter added to avoid thundering herd

### Error Handling
- Automatic retry with exponential backoff
- Maximum 3 retry attempts by default
- Different handling for network vs. API errors
- User-friendly error messages

### Performance
- Debounced checkbox injection
- Efficient mutation observers
- Minimal DOM manipulation
- Optimized for large connection lists

## Browser Compatibility

- Chrome 88+
- Edge 88+
- Brave 1.20+
- Other Chromium-based browsers

## Security Considerations

- Uses LinkedIn's existing session cookies for authentication
- No external dependencies (vanilla JavaScript)
- All API calls made from content script (same origin)
- No data sent to external servers
- Settings stored locally in Chrome storage

## Troubleshooting

### Extension not activating
- Ensure you're on the LinkedIn Connections page
- Check that the extension is enabled in `chrome://extensions/`
- Refresh the page if needed

### Deletions failing
- Check your internet connection
- Verify you're logged into LinkedIn
- Increase the delay between requests
- Check browser console for error messages

### Checkboxes not appearing
- Wait for the page to fully load
- Try refreshing the page
- Check browser console for errors

### Rate limiting errors
- Increase the delay between requests
- Pause and wait before resuming
- Reduce the number of connections selected

## Development

To modify or extend the extension:

1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Reload the LinkedIn Connections page to test

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

This extension is provided as-is for educational purposes. Use responsibly and in accordance with LinkedIn's Terms of Service.

## Disclaimer

This extension is not affiliated with, endorsed by, or sponsored by LinkedIn Corporation. Use at your own risk. The authors are not responsible for any consequences arising from the use of this extension.

## Version History

### Version 1.0.0 (Initial Release)
- Bulk deletion of LinkedIn connections
- Rate limiting with configurable delay
- Progress tracking with ETA
- Pause/Resume functionality
- Error handling with retry logic
- Auto-scroll to load more connections
- Dark/Light theme support
- Keyboard shortcuts

## Support

For issues, questions, or suggestions, please open an issue on the project repository.
