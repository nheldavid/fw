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
 * Uses serverless function with unirest
 */
async function syncTicket() {
    try {
        const ticketdata = appState.currentTicket;
        if (!ticketdata) {
            return showNotification("No ticket data found", "error");
        }

        const ticketId = ticketdata.id;

        // Show loading notification
        showNotification("Syncing ticket with attachments...", "info");

        // Step 1: Fetch full ticket with attachments
        console.log("Fetching full ticket details...");
        const ticketResp = await appState.client.request.invokeTemplate("getTicket", {
            context: { ticket_id: ticketId },
        });
        const fullTicket = JSON.parse(ticketResp.response);

        // Step 2: Build ticket payload
        const ticketDetails = buildTicketDetails(ticketdata);
        const validationError = validateTicketDetails(ticketDetails);
        if (validationError) {
            throw new Error(validationError);
        }

        // Step 3: Extract attachment URLs
        console.log("Extracting attachment URLs...");
        let attachmentUrls = [];
        if (Array.isArray(fullTicket.attachments) && fullTicket.attachments.length > 0) {
            console.log(`Found ${fullTicket.attachments.length} attachments`);
            attachmentUrls = fullTicket.attachments.map(att => att.attachment_url);
            console.log(`Prepared ${attachmentUrls.length} attachment URLs for upload`);
        }
        
        // Step 5: Create ticket using unirest serverless function
        const response = await appState.client.request.invoke('createTicketWithAttachments', {
            body: JSON.stringify({
                ticketData: ticketDetails,
                attachmentUrls: attachmentUrls
            })
        });

        const result = JSON.parse(response.response);
        
        if (result.success) {
            const newTicket = JSON.parse(result.response);
            const newTicketId = newTicket.id;
            console.log(`New ticket created with ID: ${newTicketId}`);

            // Step 6: Update source ticket
            await updateSourceTicketStatus(ticketId, newTicketId);

            showNotification("Ticket synced with attachments successfully!", "success");
        } else {
            throw new Error(result.message || "Failed to create ticket");
        }

    } catch (err) {
        console.error('Sync error:', err);
        showNotification(extractErrorMessage(err), "danger");
        throw err;
    }
}

// /**
//  * Download attachment using serverless function
//  */
// async function downloadAttachmentAsBase64(url, filename) {
//     try {
//         console.log(`Downloading attachment from: ${url}`);
        
//         // Use serverless function to download (bypasses CORS)
//         const serverlessResponse = await appState.client.request.invoke('downloadAttachment', {
//             body: JSON.stringify({
//                 url: url,
//                 filename: filename
//             })
//         });
        
//         const result = JSON.parse(serverlessResponse.response);
        
//         if (result.success) {
//             console.log(`File downloaded successfully: ${filename}`);
            
//             // Save to IndexedDB for caching
//             try {
//                 await saveFileLocally(filename, result.base64);
//             } catch (cacheError) {
//                 console.warn('Could not cache file:', cacheError);
//             }
            
//             // Create a virtual path reference
//             const virtualPath = `/tmp/${filename}`;
            
//             return { base64: result.base64, path: virtualPath };
//         } else {
//             throw new Error(result.message || 'Failed to download via serverless');
//         }
        
//     } catch (error) {
//         console.error('Error downloading attachment:', error);
//         throw new Error(`Failed to download attachment: ${error.message}`);
//     }
// }

// /**
//  * Save file locally using available storage
//  */
// async function saveFileLocally(filename, base64Data) {
//     try {
//         // Use IndexedDB for storing files locally
//         const db = await openFileDatabase();
//         const transaction = db.transaction(['files'], 'readwrite');
//         const store = transaction.objectStore('files');
        
//         const fileData = {
//             filename: filename,
//             data: base64Data,
//             timestamp: Date.now()
//         };
        
//         await store.put(fileData);
//         console.log(`File saved locally: ${filename}`);
        
//     } catch (error) {
//         console.warn('Could not save file locally:', error);
//         // Non-critical - continue without local storage
//     }
// }

// /**
//  * Open IndexedDB for file storage
//  */
// function openFileDatabase() {
//     return new Promise((resolve, reject) => {
//         const request = indexedDB.open('FreshdeskAttachments', 1);
        
//         request.onerror = () => reject(request.error);
//         request.onsuccess = () => resolve(request.result);
        
//         request.onupgradeneeded = (event) => {
//             const db = event.target.result;
//             if (!db.objectStoreNames.contains('files')) {
//                 const store = db.createObjectStore('files', { keyPath: 'filename' });
//                 store.createIndex('timestamp', 'timestamp', { unique: false });
//             }
//         };
//     });
// }

// /**
//  * Retrieve locally saved file
//  */
// async function getLocalFile(filename) {
//     try {
//         const db = await openFileDatabase();
//         const transaction = db.transaction(['files'], 'readonly');
//         const store = transaction.objectStore('files');
        
//         return new Promise((resolve, reject) => {
//             const request = store.get(filename);
//             request.onsuccess = () => resolve(request.result);
//             request.onerror = () => reject(request.error);
//         });
//     } catch (error) {
//         console.warn('Could not retrieve local file:', error);
//         return null;
//     }
// }

// /**
//  * Clear old cached files (cleanup utility)
//  */
// async function clearOldCachedFiles(maxAgeMs = 24 * 60 * 60 * 1000) {
//     try {
//         const db = await openFileDatabase();
//         const transaction = db.transaction(['files'], 'readwrite');
//         const store = transaction.objectStore('files');
//         const index = store.index('timestamp');
        
//         const cutoffTime = Date.now() - maxAgeMs;
//         const request = index.openCursor();
        
//         request.onsuccess = (event) => {
//             const cursor = event.target.result;
//             if (cursor) {
//                 if (cursor.value.timestamp < cutoffTime) {
//                     cursor.delete();
//                 }
//                 cursor.continue();
//             }
//         };
//     } catch (error) {
//         console.warn('Could not clear old cached files:', error);
//     }
// }

// /**
//  * Convert base64 to Blob
//  */
// function base64ToBlob(base64, mimeType) {
//     const byteCharacters = atob(base64);
//     const byteNumbers = new Array(byteCharacters.length);
    
//     for (let i = 0; i < byteCharacters.length; i++) {
//         byteNumbers[i] = byteCharacters.charCodeAt(i);
//     }
    
//     const byteArray = new Uint8Array(byteNumbers);
//     return new Blob([byteArray], { type: mimeType });
// }

// /**
//  * Save blob as file and return a virtual file path
//  * Creates a File object that can be used with FormData
//  */
// function saveBlobAsFile(filename, blob, base64Data) {
//     try {
//         // Create a File object from the blob
//         const file = new File([blob], filename, { type: blob.type });
        
//         // Store file reference in a temporary cache for the current session
//         if (!window.tempFileCache) {
//             window.tempFileCache = new Map();
//         }
        
//         const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
//         window.tempFileCache.set(fileId, {
//             file: file,
//             blob: blob,
//             base64: base64Data,
//             filename: filename
//         });
        
//         // Return a virtual path that includes the file ID
//         const virtualPath = `/tmp/freshdesk_attachments/${fileId}/${filename}`;
//         console.log(`File prepared with virtual path: ${virtualPath}`);
        
//         return virtualPath;
        
//     } catch (error) {
//         console.error('Error creating file path:', error);
//         throw error;
//     }
// }

/**
 * Build ticket payload from current ticket
 * Returns plain JSON object WITHOUT attachments
 */
function buildTicketDetails(ticketdata) {
    const today = new Date();
    const formattedDate = today.toISOString().split("T")[0];

    const details = {
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
        details.type = ticketdata.type;
    }
    
    if (ticketdata?.tags && Array.isArray(ticketdata.tags) && ticketdata.tags.length > 0) {
        details.tags = ticketdata.tags;
    }
    
    if (ticketdata?.category) {
        details.category = ticketdata.category;
    }
    
    if (ticketdata?.source) {
        details.source = ticketdata.source;
    }
    
    if (ticketdata?.company_id) {
        details.company_id = ticketdata.company_id;
    }
    
    // Merge existing custom fields if any
    if (ticketdata?.custom_fields) {
        const customFields = { ...ticketdata.custom_fields };
        
        // If cf_note is null or undefined, set it to empty string to avoid data type mismatch
        if (customFields.cf_note === null || customFields.cf_note === undefined) {
            customFields.cf_note = '';
        }
        
        details.custom_fields = {
            ...customFields,
            cf_create_date: formattedDate
        };
    }
    
    return details;
}

/**
 * Validate ticket details
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