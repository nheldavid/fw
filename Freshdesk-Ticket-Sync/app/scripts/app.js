// Global app state
const appState = {
    client: null,
    isInitialized: false,
    currentTicket: null
};

// DOM elements - Crayons Web Components
const elements = {
    loadingState: null,
    errorState: null,
    contentContainer: null,
    retryBtn: null,
    syncBtn: null,
};

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    initializeApp();
});

/**
 * Initialize the Freshworks app
 * Entry point - called when DOM is loaded
 */
function initializeApp() {
    console.log('Initializing Freshdesk App...');
    
    // Check if we're in development mode
    const urlParams = new URLSearchParams(window.location.search);
    const isDevelopmentMode = urlParams.get('dev') === 'true';
    
    if (isDevelopmentMode) {
        console.log('Running in development mode with mock data');
        return;
    }
    
    // Initialize DOM elements
    initializeDOMElements();
    
    // Initialize Freshworks client
    app.initialized()
        .then(function(client) {
            console.log('Freshworks client initialized');
            appState.client = client;
            appState.isInitialized = true;
            
            // Load ticket data
            loadTicketData();
            
            // Set up event listeners
            setupEventListeners();
        })
        .catch(function(error) {
            console.error('Failed to initialize Freshworks client:', error);
            showErrorState('Failed to initialize app');
        });
}

/**
 * Initialize DOM element references
 */
function initializeDOMElements() {
    elements.loadingState = document.getElementById('loading-state');
    elements.errorState = document.getElementById('error-state');
    elements.contentContainer = document.getElementById('content-container');
    elements.retryBtn = document.getElementById('retry-btn');
    elements.syncBtn = document.getElementById('sync-btn');
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    if (elements.retryBtn) {
        elements.retryBtn.addEventListener('click', function() {
            console.log('Retry button clicked');
            loadTicketData();
        });
    }

    if (elements.syncBtn) {
        elements.syncBtn.addEventListener('click', async function() {
            console.log('Sync button clicked');
            
            // Disable button to prevent double-clicks
            elements.syncBtn.disabled = true;
            
            try {
                await syncTicket();
            } catch (error) {
                console.error('Sync failed:', error);
            } finally {
                // Re-enable button after operation completes
                elements.syncBtn.disabled = false;
            }
        });
    }
}

/**
 * Load ticket data from Freshdesk
 */
function loadTicketData() {
    console.log('Loading ticket data...');
    showLoadingState();
    
    if (!appState.client) {
        console.error('Freshworks client not initialized');
        showErrorState('App not properly initialized');
        return;
    }
    
    // Get ticket data using Freshworks client API
    appState.client.data.get('ticket')
        .then(function(data) {
            console.log('Ticket data received successfully:', {
                hasTicket: !!data.ticket,
                ticketId: data.ticket?.id,
                ticketSubject: data.ticket?.subject
            });
            
            // Validate ticket data structure
            if (!data || !data.ticket) {
                throw new Error('Invalid ticket data structure received');
            }
            
            appState.currentTicket = data.ticket;
            showContentState();
        })
        .catch(function(error) {
            console.error('Failed to load ticket data:', {
                error: error,
                message: error.message,
                stack: error.stack
            });
            
            const errorMessage = getErrorMessage(error);
            showErrorState(errorMessage);
        });
}

/**
 * Sync ticket to target domain
 * Calls serverless function to handle file operations
 */
async function syncTicket() {
    try {
        const ticketdata = appState.currentTicket;
        if (!ticketdata) {
            return showNotification("No ticket data found", "error");
        }

        // Show loading notification
        showNotification("Syncing ticket with attachments...", "info");

        // Call serverless function to handle the sync
        const response = await appState.client.request.invoke("syncTicketWithAttachments", {
            body: JSON.stringify({
                ticketId: ticketdata.id,
                ticketData: ticketdata
            })
        });

        const result = JSON.parse(response.response);
        
        if (result.success) {
            showNotification("Ticket synced with attachments successfully!", "success");
        } else {
            throw new Error(result.message || "Sync failed");
        }

    } catch (err) {
        console.error('Sync error:', err);
        showNotification(extractErrorMessage(err), "danger");
        throw err;
    }
}

/**
 * Extract error message from error object or API response
 * @param {Error} error - Error object
 * @returns {string} User-friendly error message
 */
function extractErrorMessage(error) {
    // Try to parse API error response
    if (error.response) {
        try {
            const errorData = JSON.parse(error.response);
            return errorData.description || errorData.message || "An error occurred while creating the ticket.";
        } catch (e) {
            // Not JSON, return as-is or default
            return error.response || error.message || "An error occurred while creating the ticket.";
        }
    }
    
    // Check for common error types
    if (error.message) {
        if (error.message.includes('network')) {
            return "Network error. Please check your connection.";
        }
        if (error.message.includes('permission') || error.message.includes('401') || error.message.includes('403')) {
            return "Permission denied. Please check your API credentials.";
        }
        if (error.message.includes('timeout')) {
            return "Request timed out. Please try again.";
        }
        return error.message;
    }
    
    return "An error occurred while creating the ticket. Please check logs.";
}

/**
 * Get appropriate error message based on error type
 * @param {Error} error - The error object
 * @returns {string} - User-friendly error message
 */
function getErrorMessage(error) {
    if (error.message && error.message.includes('permission')) {
        return 'Permission denied. Please check app permissions.';
    }
    if (error.message && error.message.includes('network')) {
        return 'Network error. Please check your connection.';
    }
    if (error.message && error.message.includes('Invalid ticket data')) {
        return 'Invalid ticket data received from Freshdesk.';
    }
    return 'Failed to load ticket information';
}

/**
 * Show notification utility
 * @param {string} message - Message text
 * @param {"success"|"error"|"warning"|"danger"|"info"} type - Notification type
 */
function showNotification(message, type = "success") {
    if (!appState.client) {
        console.error('Cannot show notification: Client not initialized');
        return;
    }
    
    // Map danger to error for Freshdesk notification
    const notificationType = type === "danger" ? "error" : type;
    
    const title = (notificationType === "success") ? "Success!!" : 
                  (notificationType === "warning") ? "Warning" : 
                  (notificationType === "info") ? "Info" : "Failed!!";
    
    appState.client.interface.trigger("showNotify", {
        type: notificationType,
        title: title,
        message: message
    });
}

/**
 * Show loading state
 */
function showLoadingState() {
    if (elements.loadingState) elements.loadingState.style.display = 'block';
    if (elements.errorState) elements.errorState.style.display = 'none';
    if (elements.contentContainer) elements.contentContainer.style.display = 'none';
}

/**
 * Show error state
 * @param {string} message - Error message to display
 */
function showErrorState(message) {
    console.log('Showing error state:', message);
    
    if (elements.loadingState) elements.loadingState.style.display = 'none';
    if (elements.errorState) {
        elements.errorState.style.display = 'block';
        // Update error message if there's a label element
        const errorLabel = elements.errorState.querySelector('fw-label[value*="Unable to load"]');
        if (errorLabel) {
            errorLabel.setAttribute('value', message);
        }
    }
    if (elements.contentContainer) elements.contentContainer.style.display = 'none';
}

/**
 * Show content state
 */
function showContentState() {
    if (elements.loadingState) elements.loadingState.style.display = 'none';
    if (elements.errorState) elements.errorState.style.display = 'none';
    if (elements.contentContainer) elements.contentContainer.style.display = 'block';
}