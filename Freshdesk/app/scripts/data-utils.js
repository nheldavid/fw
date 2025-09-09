// Enhanced data-utils.js - Add global schema storage

// Ensure we only initialize once
if (!window.appState) {
    window.appState = {
        client: null,
        isInitialized: false,
        currentTicket: null,
        orderData: null,
        // Add global schema storage
        allSchemas: null,
        schemaIDs: {},
        // Always include customObjectData in the base state
        customObjectData: {
            execution: null,
            recipient: null,
            client: null,
            orderStatus: null,
            mediator: null,
            cart: null
        }
    };
}

/**
 * Fetches all schemas and stores them globally
 * @returns {Promise<Object>} Object with schema names as keys and IDs as values
 */
async function getAllSchemaIDs() {
    try {
        const schema = await window.appState.client.request.invokeTemplate("getSchema");
        const allSchemas = JSON.parse(schema.response).schemas;
        
        if (!allSchemas || !Array.isArray(allSchemas)) {
            console.warn('No schemas found or invalid format');
            return {};
        }

        // Store complete schema data
        window.appState.allSchemas = allSchemas;
        
        // Create a mapping of name -> ID for easy access
        const schemaIDMap = {};
             
        allSchemas.forEach(schema => {
            if (schema.name && schema.id) {
                schemaIDMap[schema.name] = schema.id;
            }
        });
        
        // Store in global state
        window.appState.schemaIDs = schemaIDMap;
        
        console.log('All Schema IDs loaded:', schemaIDMap);
        return schemaIDMap;
        
    } catch (error) {
        console.error('Error fetching all schema IDs:', error);
        window.appState.schemaIDs = {};
        return {};
    }
}

/**
 * Get schema ID from global cache (fast lookup)
 * @param {string} name - The name of the schema
 * @returns {string|null} Schema ID or null if not found
 */
function getSchemaIDFromCache(name) {
    if (!window.appState.schemaIDs || Object.keys(window.appState.schemaIDs).length === 0) {
        console.warn('Schema IDs not loaded yet. Call getAllSchemaIDs() first.');
        return null;
    }
    
    const schemaID = window.appState.schemaIDs[name];
    if (!schemaID) {
        console.warn(`Schema ID for "${name}" not found in cache`);
        return null;
    }
    
    return schemaID;
}

/**
 * Enhanced getSchemaID function that uses cache when available
 * @param {string} name - The name of the schema to fetch
 */
async function getSchemaID(name) {
    // Try cache first
    const cachedID = getSchemaIDFromCache(name);
    if (cachedID) {
        return cachedID;
    }
    
    // If not in cache, load all schemas
    await getAllSchemaIDs();
    
    // Try cache again
    return getSchemaIDFromCache(name);
}

/**
 * Initialize schema cache on app startup
 * Call this once when your app initializes
 */
async function initializeSchemaCache() {
    if (!window.appState.client) {
        console.warn('Client not initialized. Cannot load schema cache.');
        return false;
    }
    
    try {
        await getAllSchemaIDs();
        console.log('Schema cache initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize schema cache:', error);
        return false;
    }
}

/**
 * Get all available schema names
 * @returns {string[]} Array of schema names
 */
function getAvailableSchemaNames() {
    return Object.keys(window.appState.schemaIDs || {});
}

/**
 * Check if a schema exists
 * @param {string} name - Schema name to check
 * @returns {boolean} True if schema exists
 */
function schemaExists(name) {
    return !!(window.appState.schemaIDs && window.appState.schemaIDs[name]);
}

/**
 * Get complete schema information by name
 * @param {string} name - Schema name
 * @returns {Object|null} Complete schema object or null
 */
function getSchemaInfo(name) {
    if (!window.appState.allSchemas) {
        console.warn('Complete schema data not available. Call getAllSchemaIDs() first.');
        return null;
    }
    
    return window.appState.allSchemas.find(schema => schema.name === name) || null;
}

/**
 * Store data in customObjectData with schema ID
 * @param {string} objectName - Name of the custom object (e.g., 'execution', 'client')
 * @param {*} data - Data to store
 * @param {string} schemaID - Schema ID associated with this data
 */
function setCustomObjectData(objectName, data, schemaID = null) {
    if (!window.appState.customObjectData[objectName]) {
        window.appState.customObjectData[objectName] = { data: null, schemaID: null };
    }
    
    window.appState.customObjectData[objectName].data = data;
    window.appState.customObjectData[objectName].schemaID = schemaID;
    
    console.log(`Updated customObjectData.${objectName}:`, {
        hasData: !!data,
        schemaID: schemaID
    });
}

/**
 * Get data from customObjectData
 * @param {string} objectName - Name of the custom object
 * @returns {*} The stored data or null
 */
function getCustomObjectData(objectName) {
    return window.appState.customObjectData[objectName]?.data || null;
}

/**
 * Get schema ID from customObjectData
 * @param {string} objectName - Name of the custom object
 * @returns {string|null} The stored schema ID or null
 */
function getCustomObjectSchemaID(objectName) {
    return window.appState.customObjectData[objectName]?.schemaID || null;
}

/**
 * Get both data and schema ID from customObjectData
 * @param {string} objectName - Name of the custom object
 * @returns {Object} Object with data and schemaID properties
 */
function getCustomObjectInfo(objectName) {
    const obj = window.appState.customObjectData[objectName];
    return {
        data: obj?.data || null,
        schemaID: obj?.schemaID || null,
        hasData: !!(obj?.data),
        hasSchemaID: !!(obj?.schemaID)
    };
}

/**
 * Enhanced getData function that also stores schema ID in customObjectData
 * @param {string} name - The name of the schema to fetch data for
 * @param {boolean} storeInCustomObjects - Whether to store in customObjectData (default: true)
 */
async function getData(name, storeInCustomObjects = true) {
    try {
        const schemaID = await getSchemaID(name);
        if (!schemaID) return null;

        const data = await window.appState.client.request.invokeTemplate("getData", {
            context: { 
                schema_id: schemaID,
                ticketnummer: window.appState.currentTicket?.id
            } 
        });
        
        const parsedData = data?.response ? JSON.parse(data.response) : null;
        
        // Store in customObjectData if requested and if it's a known custom object
        if (storeInCustomObjects && window.appState.customObjectData.hasOwnProperty(name)) {
            setCustomObjectData(name, parsedData, schemaID);
        }
        
        return parsedData;
    } catch (error) {
        console.error(`Error fetching ${name} data:`, error);
        return null;
    }
}

/**
 * Enhanced getCartPositionsData function that also stores schema ID
 * @param {string} name - The name of the schema to fetch data for
 * @param {string} auftragsnummer - Order number
 * @param {boolean} storeInCustomObjects - Whether to store in customObjectData (default: true)
 */
async function getCartPositionsData(name, auftragsnummer, storeInCustomObjects = true) {
    try {
        const schemaID = await getSchemaID(name);
        if (!schemaID) return null;
        
        console.log(auftragsnummer);
        const data = await window.appState.client.request.invokeTemplate("getCartPositionsData", {
            context: { 
                schema_id: schemaID,
                auftragsnummer: auftragsnummer
            } 
        });
        
        const parsedData = data?.response ? JSON.parse(data.response) : null;
        
        // Store in customObjectData if requested and if it's a known custom object
        if (storeInCustomObjects && window.appState.customObjectData.hasOwnProperty(name)) {
            setCustomObjectData(name, parsedData, schemaID);
        }
        
        return parsedData;
    } catch (error) {
        console.error(`Error fetching ${name} data:`, error);
        return null;
    }
}

/**
 * Preload all custom object data with their schema IDs
 * @param {string} ticketId - Optional ticket ID (uses current ticket if not provided)
 */
async function preloadAllCustomObjectData(ticketId = null) {
    const customObjectNames = Object.keys(window.appState.customObjectData);
    const targetTicketId = ticketId || window.appState.currentTicket?.id;
    
    if (!targetTicketId) {
        console.warn('No ticket ID available for preloading custom object data');
        return;
    }
    
    console.log('Preloading custom object data for:', customObjectNames);
    
    const loadPromises = customObjectNames.map(async (objectName) => {
        try {
            await getData(objectName, true); // Will automatically store in customObjectData
            console.log(`✓ Loaded ${objectName} data`);
        } catch (error) {
            console.error(`✗ Failed to load ${objectName} data:`, error);
        }
    });
    
    await Promise.all(loadPromises);
    console.log('Custom object data preloading completed');
}

/**
 * Clear all custom object data
 */
function clearCustomObjectData() {
    Object.keys(window.appState.customObjectData).forEach(key => {
        window.appState.customObjectData[key] = { data: null, schemaID: null };
    });
    console.log('Custom object data cleared');
}

// Example usage:
/*
// 1. Initialize schema cache and automatically populate custom object IDs
await initializeSchemaCache();

// 2. Check the status of all custom object IDs
console.log('Custom Object Status:', getCustomObjectIDStatus());
printCustomObjectSummary();

// 3. Direct access to custom object schema IDs
console.log('Client schema ID:', getCustomObjectID('client'));
console.log('Execution schema ID:', getCustomObjectID('execution'));
console.log('Cart schema name:', getCustomObjectSchemaName('cart'));

// 4. Use custom object keys directly in getData calls
const clientData = await getData('client');        // Uses 'Kunden_KLASSIK' schema
const executionData = await getData('execution');  // Uses 'Ausführung_KLASSIK' schema
const cartData = await getCartPositionsData('cart', orderNumber); // Uses 'Warenkorb_Positionen' schema

// 5. Access all available schemas and custom object mappings
console.log('All schemas:', window.appState.schemaIDs);
console.log('Custom object mappings:', window.appState.customObject);

// 6. The system now automatically maps:
// - 'client' → 'Kunden_KLASSIK' → schema ID
// - 'recipient' → 'Empfänger_KLASSIK' → schema ID
// - 'execution' → 'Ausführung_KLASSIK' → schema ID
// - etc.

// 7. Example output of getCustomObjectIDStatus():
{
  client: { schemaName: 'Kunden_KLASSIK', id: '12345', hasID: true },
  recipient: { schemaName: 'Empfänger_KLASSIK', id: '67890', hasID: true },
  execution: { schemaName: 'Ausführung_KLASSIK', id: '11111', hasID: true },
  orderStatus: { schemaName: 'Auftragsstatus_KLASSIK', id: '22222', hasID: true },
  // ... etc
}
*/