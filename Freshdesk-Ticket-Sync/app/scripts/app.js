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
            showNotification("No ticket data found", "error");
            return;
        }

        // Get ticket ID from current ticket
        const ticketId = ticketdata.id;
        if (!ticketId) {
            showNotification("Ticket ID not found", "error");
            return;
        }

        // Show loading notification
        showNotification("Syncing ticket with attachments...", "info");

        // Build ticket payload WITHOUT attachments
        const ticketDetails = buildTicketDetails(ticketdata);

        // Validate required fields
        const validationError = validateTicketDetails(ticketDetails);
        if (validationError) {
            showNotification(validationError, "error");
            return;
        }
        
        // Create ticket in target domain
        const response = await appState.client.request.invokeTemplate("createTicket", {
            body: JSON.stringify(ticketDetails)
        });

        // Parse response
        const result = JSON.parse(response.response);
        const newTicketId = result.id;
        
        if (!newTicketId) {
            throw new Error(result.message || "Failed to get new ticket ID");
        }

        console.log(`New ticket created with ID: ${newTicketId}`);

        // Update source ticket status
        await updateSourceTicketStatus(ticketId, newTicketId);

        // Show success notification
        showNotification("Ticket synced with attachments successfully!", "success");

    } catch (err) {
        console.error('Sync error:', err);
        showNotification(extractErrorMessage(err), "danger");
        throw err;
    }
}

/**
 * Build ticket payload from current ticket
 * Returns plain JSON object WITHOUT attachments
 */
function buildTicketDetails(ticketdata) {
    const today = new Date();
    const formattedDate = today.toISOString().split("T")[0];

    const ticketDetails = {
        subject: ticketdata?.subject || 'No Subject',
        description: ticketdata?.description || '',
        email: ticketdata?.sender_email,
        status: ticketdata?.status || 2,
        priority: ticketdata?.priority || 1,
        custom_fields: {
            cf_create_date: formattedDate
        }
    };
    
    // Add optional fields only if they exist
    if (ticketdata?.type) {
        ticketDetails.type = ticketdata.type;
    }
    
    if (ticketdata?.tags && Array.isArray(ticketdata.tags) && ticketdata.tags.length > 0) {
        ticketDetails.tags = ticketdata.tags;
    }
    
    if (ticketdata?.category) {
        ticketDetails.category = ticketdata.category;
    }
    
    if (ticketdata?.source) {
        ticketDetails.source = ticketdata.source;
    }
    
    // Merge existing custom fields if any
    if (ticketdata?.custom_fields) {
        const customFields = { ...ticketdata.custom_fields };
        
        // If cf_note is null or undefined, set it to empty string to avoid data type mismatch
        if (customFields.cf_note === null || customFields.cf_note === undefined) {
            customFields.cf_note = '';
        }
        
        ticketDetails.custom_fields = {
            ...customFields,
            cf_create_date: formattedDate
        };
    }
    
    return ticketDetails;
}

/**
 * Validate ticket ticketDetails
 */
function validateTicketDetails(ticketDetails) {
    const requiredFields = {
        email: ticketDetails.email,
        subject: ticketDetails.subject,
        description: ticketDetails.description,
        status: ticketDetails.status,
        priority: ticketDetails.priority
    };
    
    const emptyFields = Object.entries(requiredFields)
        .filter(([, v]) => !v && v !== 0)
        .map(([k]) => k);

    if (emptyFields.length > 0) {
        console.warn("Validation failed. Missing fields:", emptyFields);
        return `Missing required fields: ${emptyFields.join(", ")}`;
    }
    
    return null;
}

/**
 * Update the source ticket status after sync
 */
async function updateSourceTicketStatus(sourceTicketId, targetTicketId, statusId = 5) {
    try {
        const response = await appState.client.request.invokeTemplate("updateTicket", {
            context: { ticket_id: sourceTicketId },
            body: JSON.stringify({
                status: statusId,
                type: "Transferred",
                custom_fields: {
                    cf_note: `Ticket ID: ${targetTicketId}` 
                }
            })
        });
        
        console.log(`Source ticket ${sourceTicketId} updated - Status: ${statusId}, Type: Transferred, Target Ticket: ${targetTicketId}`);
        return response;
        
    } catch (error) {
        console.error('Error updating source ticket status:', error);
        // Log but don't throw - ticket was already created successfully
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