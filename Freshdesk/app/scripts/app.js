/**
 * Fleurop Freshdesk App - Main Application Logic
 * This file contains the core functionality for the ticket sidebar app
 * 
 * CUSTOM FIELD SETUP REQUIREMENTS:
 * The following custom fields must be configured in Freshdesk Admin > Ticket Fields:
 * 
 * 1. Customer Name (cf_customer_name) - Single line text
 * 2. Order Number (cf_order_number) - Single line text  
 * 3. Delivery Date (cf_delivery_date) - Date field
 * 4. Order Status (cf_order_status) - Dropdown with options like:
 *    - Pending, Processing, Shipped, Delivered, Cancelled
 * 
 * These field keys are defined in CUSTOM_FIELD_CONFIG below.
 */

// Custom Field Configuration
// These field keys must match the custom fields configured in Freshdesk
const CUSTOM_FIELD_CONFIG = {
    customerName: 'cf_customer_name',    // Single line text field
    orderNumber: 'cf_order_number',      // Single line text field
    deliveryDate: 'cf_delivery_date',    // Date field
    orderStatus: 'cf_order_status'       // Dropdown field
};

// Field display names for logging and debugging
const FIELD_DISPLAY_NAMES = {
    [CUSTOM_FIELD_CONFIG.customerName]: 'Customer Name',
    [CUSTOM_FIELD_CONFIG.orderNumber]: 'Order Number',
    [CUSTOM_FIELD_CONFIG.deliveryDate]: 'Delivery Date',
    [CUSTOM_FIELD_CONFIG.orderStatus]: 'Order Status'
};

// Global app state
const appState = {
    client: null,
    isInitialized: false,
    currentTicket: null,
    orderData: null
};

// DOM elements - Crayons Web Components
const elements = {
    loadingState: null,
    errorState: null,
    contentContainer: null,
    retryBtn: null,
    customerName: null,
    orderNumber: null,
    deliveryDate: null,
    orderStatus: null
};

/**
 * Initialize the Freshworks app
 * Entry point - called when DOM is loaded
 */
function initializeApp() {
    console.log('Initializing Fleurop Freshdesk App...');
    
    // Check if we're in development mode
    const urlParams = new URLSearchParams(window.location.search);
    const isDevelopmentMode = urlParams.get('dev') === 'true';
    
    if (isDevelopmentMode) {
        console.log('Running in development mode with mock data');
        simulateTicketData();
        return;
    }
    
    // Initialize DOM elements
    initializeDOMElements();
    
    // Initialize Freshworks client
    app.initialized().then(function(client) {
        console.log('Freshworks client initialized');
        appState.client = client;
        appState.isInitialized = true;
        
        // Load ticket data
        loadTicketData();
        
        // Set up event listeners
        setupEventListeners();
        
    }).catch(function(error) {
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
    elements.customerName = document.getElementById('customer-name');
    elements.orderNumber = document.getElementById('order-number');
    elements.deliveryDate = document.getElementById('delivery-date');
    elements.orderStatus = document.getElementById('order-status');
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
            
            // Extract order information from custom fields
            extractOrderInformation(data.ticket);
            
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
 * Extract order information from ticket custom fields
 * @param {Object} ticket - The ticket object from Freshdesk
 */
function extractOrderInformation(ticket) {
    console.log('Extracting order information from ticket...', {
        ticketId: ticket.id,
        hasCustomFields: !!ticket.custom_fields,
        customFieldCount: ticket.custom_fields ? Object.keys(ticket.custom_fields).length : 0
    });
    
    try {
        // Initialize order data with defaults
        initializeOrderData();
        
        // Check if custom fields exist
        if (!ticket.custom_fields) {
            console.warn('No custom fields found in ticket data');
            applyFallbackStrategies(ticket);
            displayOrderInformation();
            return;
        }
        
        // Extract and process custom fields
        processCustomFields(ticket.custom_fields);
        
        // Apply fallback strategies for missing fields
        applyFallbackStrategies(ticket);
        
        // Display the information
        displayOrderInformation();
        
    } catch (error) {
        console.error('Error extracting order information:', error);
        showErrorState('Failed to process ticket data');
    }
}

/**
 * Initialize order data with default values
 */
function initializeOrderData() {
    appState.orderData = {
        customerName: 'Not available',
        orderNumber: 'Not available',
        deliveryDate: 'Not available',
        orderStatus: 'Not available'
    };
}

/**
 * Process custom fields and extract order data
 * @param {Object} customFields - The custom fields object
 */
function processCustomFields(customFields) {
    const customFieldKeys = Object.keys(customFields);
    console.log('Available custom fields:', customFieldKeys);
    
    // Extract each field with validation
    const extractedData = {};
    
    extractedData.customerName = extractAndValidateField(
        customFields, 
        CUSTOM_FIELD_CONFIG.customerName, 
        'string'
    );
    
    extractedData.orderNumber = extractAndValidateField(
        customFields, 
        CUSTOM_FIELD_CONFIG.orderNumber, 
        'string'
    );
    
    extractedData.deliveryDate = extractAndValidateField(
        customFields, 
        CUSTOM_FIELD_CONFIG.deliveryDate, 
        'date'
    );
    
    extractedData.orderStatus = extractAndValidateField(
        customFields, 
        CUSTOM_FIELD_CONFIG.orderStatus, 
        'string'
    );
    
    // Log extraction results
    logExtractionResults(extractedData);
    
    // Update order data with extracted values
    updateOrderDataWithExtractedValues(extractedData);
}

/**
 * Log extraction results for debugging
 * @param {Object} extractedData - The extracted data object
 */
function logExtractionResults(extractedData) {
    console.log('Field extraction results:', {
        customerName: extractedData.customerName ? 'Found' : 'Missing',
        orderNumber: extractedData.orderNumber ? 'Found' : 'Missing',
        deliveryDate: extractedData.deliveryDate ? 'Found' : 'Missing',
        orderStatus: extractedData.orderStatus ? 'Found' : 'Missing'
    });
}

/**
 * Update order data with extracted values
 * @param {Object} extractedData - The extracted data object
 */
function updateOrderDataWithExtractedValues(extractedData) {
    if (extractedData.customerName) appState.orderData.customerName = extractedData.customerName;
    if (extractedData.orderNumber) appState.orderData.orderNumber = extractedData.orderNumber;
    if (extractedData.deliveryDate) appState.orderData.deliveryDate = extractedData.deliveryDate;
    if (extractedData.orderStatus) appState.orderData.orderStatus = extractedData.orderStatus;
}

/**
 * Extract and validate a specific custom field
 * @param {Object} customFields - The custom fields object
 * @param {string} fieldKey - The field key to extract
 * @param {string} expectedType - Expected data type ('string', 'date', 'number')
 * @returns {string|null} - The field value or null if not found/invalid
 */
function extractAndValidateField(customFields, fieldKey, expectedType = 'string') {
    const fieldDisplayName = FIELD_DISPLAY_NAMES[fieldKey] || fieldKey;
    
    console.log(`Extracting field: ${fieldDisplayName} (${fieldKey})`);
    
    // Check if field exists
    if (!Object.prototype.hasOwnProperty.call(customFields, fieldKey)) {
        console.warn(`Field ${fieldDisplayName} not found in custom fields`);
        return null;
    }
    
    const fieldValue = customFields[fieldKey];
    
    // Check if field has a value
    if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
        console.warn(`Field ${fieldDisplayName} is empty or null`);
        return null;
    }
    
    // Validate based on expected type
    return validateFieldByType(fieldValue, expectedType, fieldDisplayName);
}

/**
 * Validate field value based on expected type
 * @param {*} fieldValue - The field value to validate
 * @param {string} expectedType - Expected data type
 * @param {string} fieldDisplayName - Display name for logging
 * @returns {*} - Validated field value
 */
function validateFieldByType(fieldValue, expectedType, fieldDisplayName) {
    switch (expectedType) {
        case 'string': {
            if (typeof fieldValue === 'string') {
                console.log(`✓ ${fieldDisplayName}: "${fieldValue}"`);
                return fieldValue.trim();
            }
            console.warn(`Field ${fieldDisplayName} is not a string:`, typeof fieldValue, fieldValue);
            return String(fieldValue).trim();
        }
        case 'date': {
            return validateDateField(fieldValue, fieldDisplayName);
        }
        case 'number': {
            const numValue = Number(fieldValue);
            if (!isNaN(numValue)) {
                console.log(`✓ ${fieldDisplayName}: ${numValue}`);
                return numValue;
            }
            console.warn(`Field ${fieldDisplayName} is not a valid number: "${fieldValue}"`);
            return fieldValue;
        }
        default: {
            console.log(`✓ ${fieldDisplayName}: ${fieldValue} (no validation)`);
            return fieldValue;
        }
    }
}

/**
 * Validate date field value
 * @param {*} fieldValue - The field value to validate
 * @param {string} fieldDisplayName - Display name for logging
 * @returns {string} - Validated date string
 */
function validateDateField(fieldValue, fieldDisplayName) {
    // Date fields can come as strings or Date objects
    if (fieldValue instanceof Date) {
        console.log(`✓ ${fieldDisplayName}: ${fieldValue.toISOString()}`);
        return fieldValue.toISOString().split('T')[0]; // Return YYYY-MM-DD format
    }
    if (typeof fieldValue === 'string') {
        const dateObj = new Date(fieldValue);
        if (!isNaN(dateObj.getTime())) {
            console.log(`✓ ${fieldDisplayName}: "${fieldValue}"`);
            return fieldValue;
        }
        console.warn(`Field ${fieldDisplayName} is not a valid date: "${fieldValue}"`);
        return fieldValue; // Return as-is, let display logic handle formatting
    }
    console.warn(`Field ${fieldDisplayName} is not a valid date type:`, typeof fieldValue, fieldValue);
    return String(fieldValue);
}

/**
 * Apply fallback strategies for missing custom field data
 * @param {Object} ticket - The ticket object
 */
function applyFallbackStrategies(ticket) {
    console.log('Applying fallback strategies for missing data...');
    
    // Fallback for customer name: use requester name
    applyCustomerNameFallback(ticket);
    
    // Fallback for order number: use ticket ID
    applyOrderNumberFallback(ticket);
}

/**
 * Apply fallback strategy for customer name
 * @param {Object} ticket - The ticket object
 */
function applyCustomerNameFallback(ticket) {
    if (appState.orderData.customerName === 'Not available' && ticket.requester) {
        if (ticket.requester.name) {
            appState.orderData.customerName = ticket.requester.name;
            console.log('✓ Applied fallback: Customer name from requester');
        } else if (ticket.requester.email) {
            appState.orderData.customerName = ticket.requester.email.split('@')[0];
            console.log('✓ Applied fallback: Customer name from requester email');
        }
    }
}

/**
 * Apply fallback strategy for order number
 * @param {Object} ticket - The ticket object
 */
function applyOrderNumberFallback(ticket) {
    if (appState.orderData.orderNumber === 'Not available' && ticket.id) {
        appState.orderData.orderNumber = `TKT-${ticket.id}`;
        console.log('✓ Applied fallback: Order number from ticket ID');
    }
}

/**
 * Display order information in the UI
 */
function displayOrderInformation() {
    console.log('Displaying order information in UI...');
    
    if (!appState.orderData) {
        console.error('No order data available to display');
        showErrorState('No order data available');
        return;
    }
    
    try {
        updateUIElements();
        console.log('✓ Order information displayed successfully');
        showContentState();
        
    } catch (error) {
        console.error('Error displaying order information:', error);
        showErrorState('Failed to display order information');
    }
}

/**
 * Update UI elements with order data
 */
function updateUIElements() {
    // Update customer name
    if (elements.customerName) {
        elements.customerName.setAttribute('value', appState.orderData.customerName);
    }
    
    // Update order number
    if (elements.orderNumber) {
        elements.orderNumber.setAttribute('value', appState.orderData.orderNumber);
    }
    
    // Update delivery date with formatting
    if (elements.deliveryDate) {
        const formattedDate = formatDate(appState.orderData.deliveryDate);
        elements.deliveryDate.setAttribute('value', formattedDate);
    }
    
    // Update order status with appropriate color
    if (elements.orderStatus) {
        elements.orderStatus.setAttribute('value', appState.orderData.orderStatus);
        const statusColor = getStatusColor(appState.orderData.orderStatus);
        elements.orderStatus.setAttribute('color', statusColor);
    }
}

/**
 * Format date string for display
 * @param {string} dateString - The date string to format
 * @returns {string} - Formatted date string
 */
function formatDate(dateString) {
    if (!dateString || dateString === 'Not available') {
        return 'Not available';
    }
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            console.warn('Invalid date string:', dateString);
            return dateString; // Return original if can't parse
        }
        
        // Format as readable date (e.g., "May 25, 2025")
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        
        return date.toLocaleDateString('en-US', options);
        
    } catch (error) {
        console.warn('Error formatting date:', error);
        return dateString; // Return original on error
    }
}

/**
 * Get appropriate color for order status
 * @param {string} status - The order status
 * @returns {string} - Crayons color name
 */
function getStatusColor(status) {
    if (!status || status === 'Not available') {
        return 'text-secondary';
    }
    
    const statusLower = status.toLowerCase();
    
    // Use object mapping for better performance and readability
    const statusColorMap = {
        'delivered': 'success',
        'shipped': 'warning',
        'processing': 'warning',
        'pending': 'text-primary',
        'cancelled': 'danger'
    };
    
    return statusColorMap[statusLower] || 'text-primary';
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

/**
 * Simulate ticket data for development/testing
 */
function simulateTicketData() {
    console.log('Simulating ticket data for development mode...');
    
    // Initialize DOM elements
    initializeDOMElements();
    
    // Create mock ticket data
    const mockTicket = {
        id: 12345,
        subject: 'Test Order - Flower Delivery Issue',
        requester: {
            name: 'Maria Schmidt',
            email: 'maria.schmidt@example.com'
        },
        custom_fields: {
            [CUSTOM_FIELD_CONFIG.customerName]: 'Maria Schmidt',
            [CUSTOM_FIELD_CONFIG.orderNumber]: 'FLR-2025-001234',
            [CUSTOM_FIELD_CONFIG.deliveryDate]: '2025-02-14',
            [CUSTOM_FIELD_CONFIG.orderStatus]: 'Processing'
        }
    };
    
    // Set up event listeners
    setupEventListeners();
    
    // Simulate the data extraction process
    appState.currentTicket = mockTicket;
    extractOrderInformation(mockTicket);
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    initializeApp();
});
