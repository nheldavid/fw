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
    customerEmail: 'cf_customer_email', // Single line text field
    orderNumber: 'cf_order_number',      // Single line text field
    deliveryDate: 'cf_delivery_date',    // Date field
    orderStatus: 'cf_order_status',       // Dropdown field
    billingAdddress: 'cf_billing_address', // Single line text field    
    centralOrderAccount: 'cf_central_order_account', // Single line text field
    Communication: 'cf_communication', // Single line text field
    orderNumberFDE: 'cf_order_number_fde', // Single line text field
    orderDate: 'cf_order_date', // Date field   
    totalAmount: 'cf_total_amount', // Number field
    paymentMethod: 'cf_payment_method', // Single line text field
    orderComment: 'cf_order_comment', // Multi-line text field
    position: 'cf_position', // Single line text field
    productName: 'cf_product_name', // Single line text field
    quantity: 'cf_quantity', // Number field
    unitPrice: 'cf_unit_price', // Number field
    totalPrice: 'cf_total_price', // Number field
    optionalExtras: 'cf_optional_extras', // Multi-line text field
    plannedDeliveryDate: 'cf_planned_delivery_date', // Date field
    actualDeliveryDate: 'cf_actual_delivery_date', // Date field
    deliveryStatus: 'cf_delivery_status', // Dropdown field
    shipmentNumber: 'cf_shipment_number', // Single line text field
    //trackingLink: 'cf_tracking_link', // Single line text field
    selfDeliveryReceipt: 'cf_self_delivery_receipt', // Single line text field
    complaintReason1: 'cf_complaint_reason_1', // Single line text field
    complaintReason2: 'cf_complaint_reason_2', // Single line text field
    refundAmount: 'cf_refund_amount', // Number field
    creditNote: 'cf_credit_note', // Single line text field
    complaintStatus: 'cf_complaint_status', // Dropdown field
    centralNumber: 'cf_central_number', // Single line text field
    deliveryDate: 'cf_delivery_date', // Date field
    orderStatus: 'cf_order_status' // Dropdown field
};

// Field display names for logging and debugging
const FIELD_DISPLAY_NAMES = {
    [CUSTOM_FIELD_CONFIG.customerName]: 'Customer Name',
    [CUSTOM_FIELD_CONFIG.customerEmail]: 'Customer Email',
    [CUSTOM_FIELD_CONFIG.billingAdddress]: 'Billing Address',
    [CUSTOM_FIELD_CONFIG.centralOrderAccount]: 'Central Order Account',
    [CUSTOM_FIELD_CONFIG.Communication]: 'Communication',
    [CUSTOM_FIELD_CONFIG.orderNumber]: 'Order Number',
    [CUSTOM_FIELD_CONFIG.orderNumberFDE]: 'FDE Order Number',
    [CUSTOM_FIELD_CONFIG.orderDate]: 'Order Date',
    [CUSTOM_FIELD_CONFIG.totalAmount]: 'Total Amount',
    [CUSTOM_FIELD_CONFIG.paymentMethod]: 'Payment Method',
    [CUSTOM_FIELD_CONFIG.orderComment]: 'Order Comment',
    [CUSTOM_FIELD_CONFIG.position]: 'Position',
    [CUSTOM_FIELD_CONFIG.productName]: 'Product Name',
    [CUSTOM_FIELD_CONFIG.quantity]: 'Quantity',
    [CUSTOM_FIELD_CONFIG.unitPrice]: 'Unit Price',
    [CUSTOM_FIELD_CONFIG.totalPrice]: 'Total Price',
    [CUSTOM_FIELD_CONFIG.optionalExtras]: 'Optional Extras',
    [CUSTOM_FIELD_CONFIG.plannedDeliveryDate]: 'Planned Delivery Date',
    [CUSTOM_FIELD_CONFIG.actualDeliveryDate]: 'Actual Delivery Date',
    [CUSTOM_FIELD_CONFIG.deliveryStatus]: 'Delivery Status',
    [CUSTOM_FIELD_CONFIG.shipmentNumber]: 'Shipment Number',
    //[CUSTOM_FIELD_CONFIG.trackingLink]: 'Tracking Link',
    [CUSTOM_FIELD_CONFIG.selfDeliveryReceipt]: 'Self Delivery Receipt',
    [CUSTOM_FIELD_CONFIG.complaintReason1]: 'Complaint Reason 1',
    [CUSTOM_FIELD_CONFIG.complaintReason2]: 'Complaint Reason 2',
    [CUSTOM_FIELD_CONFIG.refundAmount]: 'Refund Amount',
    [CUSTOM_FIELD_CONFIG.creditNote]: 'Credit Note',
    [CUSTOM_FIELD_CONFIG.complaintStatus]: 'Complaint Status',
    [CUSTOM_FIELD_CONFIG.centralNumber]: 'Central Number',

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
    customerEmail: null,
    billingAdddress: null,
    centralOrderAccount: null,
    Communication: null,    
    orderNumber: null,
    orderNumberFDE: null,
    orderDate: null,
    totalAmount: null,
    paymentMethod: null,
    orderComment: null,
    position: null,
    productName: null,
    quantity: null,
    unitPrice: null,
    totalPrice: null,
    optionalExtras: null,
    plannedDeliveryDate: null,
    actualDeliveryDate: null,
    deliveryStatus: null,
    shipmentNumber: null,
    //trackingLink: null,
    selfDeliveryReceipt: null,
    complaintReason1: null,
    complaintReason2: null,
    refundAmount: null,
    creditNote: null,
    complaintStatus: null,
    centralNumber: null,
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
    elements.customerEmail = document.getElementById('customer-email');
    elements.billingAdddress = document.getElementById('billing-address');
    elements.centralOrderAccount = document.getElementById('central-order-account');
    elements.Communication = document.getElementById('communication');
    elements.orderNumberFDE = document.getElementById('order-number-fde');
    elements.orderNumber = document.getElementById('order-number');
    elements.orderDate = document.getElementById('order-date');
    elements.totalAmount = document.getElementById('total-amount');
    elements.paymentMethod = document.getElementById('payment-method');
    elements.orderComment = document.getElementById('order-comment');
    elements.position = document.getElementById('position');
    elements.productName = document.getElementById('product-name');
    elements.quantity = document.getElementById('quantity');
    elements.unitPrice = document.getElementById('unit-price');
    elements.totalPrice = document.getElementById('total-price');
    elements.optionalExtras = document.getElementById('optional-extras');
    elements.plannedDeliveryDate = document.getElementById('planned-delivery-date');
    elements.actualDeliveryDate = document.getElementById('actual-delivery-date');
    elements.deliveryStatus = document.getElementById('delivery-status');
    elements.shipmentNumber = document.getElementById('shipment-number');
    //elements.trackingLink = document.getElementById('tracking-link');
    elements.selfDeliveryReceipt = document.getElementById('self-delivery-receipt');
    elements.complaintReason1 = document.getElementById('complaint-reason-1');
    elements.complaintReason2 = document.getElementById('complaint-reason-2');
    elements.refundAmount = document.getElementById('refund-amount');
    elements.creditNote = document.getElementById('credit-note');
    elements.complaintStatus = document.getElementById('complaint-status');
    elements.centralNumber = document.getElementById('central-number');
    
    // Ensure deliveryDate and orderStatus are initialized
    // These fields are optional and may not be present in all tickets
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
        customerEmail: 'Not available',
        billingAdddress: 'Not available',
        centralOrderAccount: 'Not available',
        Communication: 'Not available',
        orderNumberFDE: 'Not available',
        orderDate: 'Not available',
        totalAmount: 0,
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

    // Additional fields can be extracted similarly
    extractedData.customerEmail = extractAndValidateField(
        customFields, 
        CUSTOM_FIELD_CONFIG.customerEmail,  
        'string'
    );

    extractedData.billingAdddress = extractAndValidateField(
        customFields,
        CUSTOM_FIELD_CONFIG.billingAdddress,
        'string'
    );
    extractedData.centralOrderAccount = extractAndValidateField(
        customFields,
        CUSTOM_FIELD_CONFIG.centralOrderAccount,
        'string'
    );
    extractedData.Communication = extractAndValidateField(
        customFields,
        CUSTOM_FIELD_CONFIG.Communication,
        'string'
    );
    extractedData.orderNumberFDE = extractAndValidateField(
        customFields,
        CUSTOM_FIELD_CONFIG.orderNumberFDE,
        'string'
    );
    extractedData.orderDate = extractAndValidateField(  
        customFields,
        CUSTOM_FIELD_CONFIG.orderDate,
        'date'
    );
    extractedData.totalAmount = extractAndValidateField(
        customFields,
        CUSTOM_FIELD_CONFIG.totalAmount,
        'number'
    );
    extractedData.paymentMethod = extractAndValidateField(
        customFields,
        CUSTOM_FIELD_CONFIG.paymentMethod,
        'string'
    );
    extractedData.orderComment = extractAndValidateField(
        customFields,
        CUSTOM_FIELD_CONFIG.orderComment,
        'string'
    );
    extractedData.position = extractAndValidateField(
        customFields,
        CUSTOM_FIELD_CONFIG.position,
        'string'
    );
    extractedData.productName = extractAndValidateField(
        customFields,
        CUSTOM_FIELD_CONFIG.productName,
        'string'
    );
    extractedData.quantity = extractAndValidateField(
        customFields,
        CUSTOM_FIELD_CONFIG.quantity,
        'number'
    );
    extractedData.unitPrice = extractAndValidateField(
        customFields,
        CUSTOM_FIELD_CONFIG.unitPrice,
        'number'
    );
    extractedData.totalPrice = extractAndValidateField(
        customFields,
        CUSTOM_FIELD_CONFIG.totalPrice,
        'number'
    );
    extractedData.optionalExtras = extractAndValidateField(
        customFields,
        CUSTOM_FIELD_CONFIG.optionalExtras,
        'string'
    );
    extractedData.plannedDeliveryDate = extractAndValidateField(
        customFields,
        CUSTOM_FIELD_CONFIG.plannedDeliveryDate,
        'date'
    );
    extractedData.actualDeliveryDate = extractAndValidateField(
        customFields,
        CUSTOM_FIELD_CONFIG.actualDeliveryDate,
        'date'
    );
    extractedData.deliveryStatus = extractAndValidateField(
        customFields,
        CUSTOM_FIELD_CONFIG.deliveryStatus,
        'string'
    );
    extractedData.shipmentNumber = extractAndValidateField(
        customFields,
        CUSTOM_FIELD_CONFIG.shipmentNumber,
        'string'
    );
    // extractedData.trackingLink = extractAndValidateField(
    //     customFields,
    //     CUSTOM_FIELD_CONFIG.trackingLink,
    //     'string'
    // );
    extractedData.selfDeliveryReceipt = extractAndValidateField(
        customFields,
        CUSTOM_FIELD_CONFIG.selfDeliveryReceipt,
        'string'
    );
    extractedData.complaintReason1 = extractAndValidateField(
        customFields,
        CUSTOM_FIELD_CONFIG.complaintReason1,
        'string'
    );
    extractedData.complaintReason2 = extractAndValidateField(
        customFields,
        CUSTOM_FIELD_CONFIG.complaintReason2,
        'string'
    );
    extractedData.refundAmount = extractAndValidateField(
        customFields,
        CUSTOM_FIELD_CONFIG.refundAmount,
        'number'
    );
    extractedData.creditNote = extractAndValidateField(
        customFields,
        CUSTOM_FIELD_CONFIG.creditNote,
        'string'
    );
    extractedData.complaintStatus = extractAndValidateField(
        customFields,
        CUSTOM_FIELD_CONFIG.complaintStatus,
        'string'
    );
    extractedData.centralNumber = extractAndValidateField(
        customFields,
        CUSTOM_FIELD_CONFIG.centralNumber,
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
        customerEmail: extractedData.customerEmail ? 'Found' : 'Missing',
        billingAdddress: extractedData.billingAdddress ? 'Found' : 'Missing',
        centralOrderAccount: extractedData.centralOrderAccount ? 'Found' : 'Missing',
        Communication: extractedData.Communication ? 'Found' : 'Missing',
        orderNumber: extractedData.orderNumber ? 'Found' : 'Missing',
        orderNumberFDE: extractedData.orderNumberFDE ? 'Found' : 'Missing',
        orderDate: extractedData.orderDate ? 'Found' : 'Missing',
        totalAmount: extractedData.totalAmount ? 'Found' : 'Missing',
        paymentMethod: extractedData.paymentMethod ? 'Found' : 'Missing',
        orderComment: extractedData.orderComment ? 'Found' : 'Missing',
        position: extractedData.position ? 'Found' : 'Missing',
        productName: extractedData.productName ? 'Found' : 'Missing',   
        quantity: extractedData.quantity ? 'Found' : 'Missing',
        unitPrice: extractedData.unitPrice ? 'Found' : 'Missing',
        totalPrice: extractedData.totalPrice ? 'Found' : 'Missing',
        optionalExtras: extractedData.optionalExtras ? 'Found' : 'Missing',
        plannedDeliveryDate: extractedData.plannedDeliveryDate ? 'Found' : 'Missing',
        actualDeliveryDate: extractedData.actualDeliveryDate ? 'Found' : 'Missing',
        deliveryStatus: extractedData.deliveryStatus ? 'Found' : 'Missing',
        shipmentNumber: extractedData.shipmentNumber ? 'Found' : 'Missing',
        selfDeliveryReceipt: extractedData.selfDeliveryReceipt ? 'Found' : 'Missing',
        complaintReason1: extractedData.complaintReason1 ? 'Found' : 'Missing',
        complaintReason2: extractedData.complaintReason2 ? 'Found' : 'Missing',
        refundAmount: extractedData.refundAmount ? 'Found' : 'Missing',
        creditNote: extractedData.creditNote ? 'Found' : 'Missing',
        complaintStatus: extractedData.complaintStatus ? 'Found' : 'Missing',
        centralNumber: extractedData.centralNumber ? 'Found' : 'Missing',
        deliveryDate: extractedData.deliveryDate ? 'Found' : 'Missing',
        orderStatus: extractedData.orderStatus ? 'Found' : 'Missing'
        //trackingLink: extractedData.trackingLink ? 'Found' : 'Missing',
    });
}

/**
 * Update order data with extracted values
 * @param {Object} extractedData - The extracted data object
 */
function updateOrderDataWithExtractedValues(extractedData) {
    if (extractedData.customerName) appState.orderData.customerName = extractedData.customerName;
    if (extractedData.customerEmail) appState.orderData.customerEmail = extractedData.customerEmail;
    if (extractedData.billingAdddress) appState.orderData.billingAdddress = extractedData.billingAdddress;
    if (extractedData.centralOrderAccount) appState.orderData.centralOrderAccount = extractedData.centralOrderAccount;
    if (extractedData.Communication) appState.orderData.Communication = extractedData.Communication;
    if (extractedData.orderNumber) appState.orderData.orderNumber = extractedData.orderNumber;
    if (extractedData.orderNumberFDE) appState.orderData.orderNumberFDE = extractedData.orderNumberFDE;
    if (extractedData.orderDate) appState.orderData.orderDate = extractedData.orderDate;
    if (extractedData.totalAmount) appState.orderData.totalAmount = extractedData.totalAmount;
    if (extractedData.paymentMethod) appState.orderData.paymentMethod = extractedData.paymentMethod;
    if (extractedData.orderComment) appState.orderData.orderComment = extractedData.orderComment;
    if (extractedData.position) appState.orderData.position = extractedData.position;
    if (extractedData.productName) appState.orderData.productName = extractedData.productName;
    if (extractedData.quantity) appState.orderData.quantity = extractedData.quantity;
    if (extractedData.unitPrice) appState.orderData.unitPrice = extractedData.unitPrice;
    if (extractedData.totalPrice) appState.orderData.totalPrice = extractedData.totalPrice;
    if (extractedData.optionalExtras) appState.orderData.optionalExtras = extractedData.optionalExtras;
    if (extractedData.plannedDeliveryDate) appState.orderData.plannedDeliveryDate = extractedData.plannedDeliveryDate;
    if (extractedData.actualDeliveryDate) appState.orderData.actualDeliveryDate = extractedData.actualDeliveryDate;
    if (extractedData.deliveryStatus) appState.orderData.deliveryStatus = extractedData.deliveryStatus;
    if (extractedData.shipmentNumber) appState.orderData.shipmentNumber = extractedData.shipmentNumber;
    //if (extractedData.trackingLink) appState.orderData.trackingLink = extractedData.trackingLink;
    if (extractedData.selfDeliveryReceipt) appState.orderData.selfDeliveryReceipt = extractedData.selfDeliveryReceipt;
    if (extractedData.complaintReason1) appState.orderData.complaintReason1 = extractedData.complaintReason1;
    if (extractedData.complaintReason2) appState.orderData.complaintReason2 = extractedData.complaintReason2;
    if (extractedData.refundAmount) appState.orderData.refundAmount = extractedData.refundAmount;
    if (extractedData.creditNote) appState.orderData.creditNote = extractedData.creditNote;
    if (extractedData.complaintStatus) appState.orderData.complaintStatus = extractedData.complaintStatus;
    if (extractedData.centralNumber) appState.orderData.centralNumber = extractedData.centralNumber;
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
    // Update customer email
    if (elements.customerEmail) {
        elements.customerEmail.setAttribute('value', appState.orderData.customerEmail);
    }
    // Update billing address
    if (elements.billingAdddress) {
        elements.billingAdddress.setAttribute('value', appState.orderData.billingAdddress);
    }
    // Update central order account
    if (elements.centralOrderAccount) { 
        elements.centralOrderAccount.setAttribute('value', appState.orderData.centralOrderAccount);
    }
    // Update communication method
    if (elements.Communication) {
        elements.Communication.setAttribute('value', appState.orderData.Communication);
    }    
    // Update order number
    if (elements.orderNumber) {
        elements.orderNumber.setAttribute('value', appState.orderData.orderNumber);
    }
    // Update FDE order number
    if (elements.orderNumberFDE) {
        elements.orderNumberFDE.setAttribute('value', appState.orderData.orderNumberFDE);
    }
    // Update order date with formatting
    if (elements.orderDate) {   
        const formattedDate = formatDate(appState.orderData.orderDate);
        elements.orderDate.setAttribute('value', formattedDate);
    }
    // Update total amount
    if (elements.totalAmount) {
        elements.totalAmount.setAttribute('value', appState.orderData.totalAmount);
    }
    // Update payment method
    if (elements.paymentMethod) {
        elements.paymentMethod.setAttribute('value', appState.orderData.paymentMethod);
    }
    // Update order comment
    if (elements.orderComment) {
        elements.orderComment.setAttribute('value', appState.orderData.orderComment);
    }
    // Update position
    if (elements.position) {
        elements.position.setAttribute('value', appState.orderData.position);
    }
    // Update product name
    if (elements.productName) {
        elements.productName.setAttribute('value', appState.orderData.productName);
    }
    // Update quantity
    if (elements.quantity) {
        elements.quantity.setAttribute('value', appState.orderData.quantity);    
    }
    // Update unit price
    if (elements.unitPrice) {
        elements.unitPrice.setAttribute('value', appState.orderData.unitPrice);
    }
    // Update total price
    if (elements.totalPrice) {
        elements.totalPrice.setAttribute('value', appState.orderData.totalPrice);
    }
    // Update optional extras
    if (elements.optionalExtras) {
        elements.optionalExtras.setAttribute('value', appState.orderData.optionalExtras);
    }
    // Update planned delivery date with formatting
    if (elements.plannedDeliveryDate) {
        const formattedDate = formatDate(appState.orderData.plannedDeliveryDate);
        elements.plannedDeliveryDate.setAttribute('value', formattedDate);
    }
    // Update actual delivery date with formatting
    if (elements.actualDeliveryDate) {
        const formattedDate = formatDate(appState.orderData.actualDeliveryDate);
        elements.actualDeliveryDate.setAttribute('value', formattedDate);
    }
    // Update delivery status
    if (elements.deliveryStatus) {
        elements.deliveryStatus.setAttribute('value', appState.orderData.deliveryStatus);
        const statusColor = getStatusColor(appState.orderData.deliveryStatus);  
        elements.deliveryStatus.setAttribute('color', statusColor);
    }
    // Update shipment number
    if (elements.shipmentNumber) {  
        elements.shipmentNumber.setAttribute('value', appState.orderData.shipmentNumber);
        // Add click event to open tracking link in new tab
        elements.shipmentNumber.addEventListener('click', function() {
            if (appState.orderData.shipmentNumber) {
                window.open(`https://www.dhl.com/ph-en/home/tracking.html?tracking-id=${appState.orderData.shipmentNumber}&submit=1`, '_blank');
            }
        });
    }
    // Update self delivery receipt
    if (elements.selfDeliveryReceipt) {
        elements.selfDeliveryReceipt.setAttribute('value', appState.orderData.selfDeliveryReceipt);
    }
    // Update complaint reason 1
    if (elements.complaintReason1) {
        elements.complaintReason1.setAttribute('value', appState.orderData.complaintReason1);
    }
    // Update complaint reason 2
    if (elements.complaintReason2) {
        elements.complaintReason2.setAttribute('value', appState.orderData.complaintReason2);
    }   
    // Update refund amount
    if (elements.refundAmount) {
        elements.refundAmount.setAttribute('value', appState.orderData.refundAmount);
    }
    // Update credit note
    if (elements.creditNote) {  
        elements.creditNote.setAttribute('value', appState.orderData.creditNote);
    }
    // Update complaint status with appropriate color   
    if (elements.complaintStatus) {
        elements.complaintStatus.setAttribute('value', appState.orderData.complaintStatus);
        const statusColor = getStatusColor(appState.orderData.complaintStatus); 
        elements.complaintStatus.setAttribute('color', statusColor);
    }
    // Update central number
    if (elements.centralNumber) {
        elements.centralNumber.setAttribute('value', appState.orderData.centralNumber);
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

async function showModal() {
  try {

    // store info to variable for later use in modal
    const data = await appState.client.interface.trigger('showModal', {
        title: 'Fleurop Order Information',
        template: './views/modal.html',
        data: {
            customerName: document.getElementById('customer-name').value,
            customerEmail: document.getElementById('customer-email').value,
            billingAddress: document.getElementById('billing-address').value,
            centralOrderAccount: document.getElementById('central-order-account').value,
            communication: document.getElementById('communication').value,
            orderNumber: document.getElementById('order-number').value,
            fdeOrderNumber: document.getElementById('fde-order-number').value,
            orderDate: document.getElementById('order-date').value,
            totalAmount: document.getElementById('total-amount').value, 
            paymentMethod: document.getElementById('payment-method').value,
            orderComment: document.getElementById('order-comment').value,
            position: document.getElementById('position').value,
            productName: document.getElementById('product-name').value,
            quantity: document.getElementById('quantity').value,
            unitPrice: document.getElementById('unit-price').value,
            totalPrice: document.getElementById('total-price').value,
            optionalExtras: document.getElementById('optional-extras').value
            // plannedDeliveryDate: document.getElementById('planned-delivery-date').value,
            // actualDeliveryDate: document.getElementById('actual-delivery-date').value,
            // deliveryStatus: document.getElementById('delivery-status').value,
            // shipmentNumber: document.getElementById('shipment-number').value,
            // selfDeliveryReceipt: document.getElementById('self-delivery-receipt').value,
            // complaintReason1: document.getElementById('complaint-reason-1').value,
            // complaintReason2: document.getElementById('complaint-reason-2').value,
            // refundAmount: document.getElementById('refund-amount').value,
            // creditNote: document.getElementById('credit-note').value,
            // complaintStatus: document.getElementById('complaint-status').value,
            // centralNumber: document.getElementById('central-number').value,
            // deliveryDate: document.getElementById('delivery-date').value,
            // orderStatus: document.getElementById('order-status').value  
      }
    });
    console.log('Parent:InterfaceAPI:showModal', data);
  } catch (error) {
    console.log('Parent:InterfaceAPI:showModal', error);
  }
}