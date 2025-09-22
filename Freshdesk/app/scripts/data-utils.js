// Enhanced data-utils.js - Add global schema storage and raw data storage

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
        newFieldsCollection: {
            allNewFields: {},           // All new fields organized by schema
            fieldsByType: {},           // New fields organized by field type
            fieldsByPage: {},           // New fields mapped to UI pages/contexts
            collectionMetadata: {
                lastUpdated: null,
                totalNewFields: 0,
                schemasCovered: []
            }
        },
        // Schema comparison results
        schemaComparison: {
            baselineSchemas: null,
            currentSchemas: null,
            newFields: {},
            removedFields: {},
            modifiedFields: {},
            lastComparisonDate: null
        },
        // Processed custom object data
        customObjectData: {
            ausfuehrung: null,
            empfaenger: null,
            auftraggeber: null,
            auftragsstatus: null,
            vermittler: null,
            warenkorb: null
        },
        // NEW: Raw custom object data (unprocessed)
        rawCustomObjectData: {
            ausfuehrung: null,
            empfaenger: null,
            auftraggeber: null,
            auftragsstatus: null,
            vermittler: null,
            warenkorb: null,
            // Modal-specific raw data
            modalData: {
                ot: null,
                gutscheine: null,
                kopfpauschalen: null,
                warenkorbPositionen: null
            }
        }
    };
}

/** Fetches the complete schema list from Freshdesk
 * @returns {Promise<Object>} The full schema response object
 */
async function getSchema() {
    return await window.appState.client.request.invokeTemplate("getSchema");
}

/**
 * Fetches all schemas and stores them globally
 * @returns {Promise<Object>} Object with schema names as keys and IDs as values
 */
async function getAllSchemaIDs() {
    try {
        
        const schema = await getSchema();
        const allSchemas = JSON.parse(schema.response).schemas;

        console.log('Fetched all schemas:', allSchemas);
        console.log('schema:', schema);
        
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
        console.warn('client not initialized. Cannot load schema cache.');
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
 * Store processed data in customObjectData with schema ID
 * @param {string} objectName - Name of the custom object (e.g., 'ausfuehrung', 'auftraggeber')
 * @param {*} processedData - Processed data to store
 * @param {*} rawData - Raw unprocessed data to store
 * @param {string} schemaID - Schema ID associated with this data
 */
function setCustomObjectData(objectName, processedData, rawData = null, schemaID = null) {
    if (!window.appState.customObjectData[objectName]) {
        window.appState.customObjectData[objectName] = { data: null, schemaID: null };
    }
    
    if (!window.appState.rawCustomObjectData[objectName]) {
        window.appState.rawCustomObjectData[objectName] = { data: null, schemaID: null };
    }
    
    // Store processed data
    window.appState.customObjectData[objectName].data = processedData;
    window.appState.customObjectData[objectName].schemaID = schemaID;
    
    // Store raw data
    window.appState.rawCustomObjectData[objectName].data = rawData;
    window.appState.rawCustomObjectData[objectName].schemaID = schemaID;
    
    console.log(`Updated customObjectData.${objectName}:`, {
        hasProcessedData: !!processedData,
        hasRawData: !!rawData,
        schemaID: schemaID
    });
}

/**
 * Store modal-specific data (both processed and raw)
 * @param {string} objectName - Name of the modal object (e.g., 'ot', 'gutscheine')
 * @param {*} processedData - Processed data array to store
 * @param {*} rawData - Raw unprocessed data array to store  
 * @param {string} schemaID - Schema ID associated with this data
 */
function setModalObjectData(objectName, processedData, rawData = null, schemaID = null) {
    if (!window.appState.customObjectData.modalData) {
        window.appState.customObjectData.modalData = {};
    }
    
    if (!window.appState.rawCustomObjectData.modalData) {
        window.appState.rawCustomObjectData.modalData = {};
    }
    
    // Store processed modal data
    window.appState.customObjectData.modalData[objectName] = processedData;
    
    // Store raw modal data
    window.appState.rawCustomObjectData.modalData[objectName] = rawData;
    
    console.log(`Updated modalData.${objectName}:`, {
        hasProcessedData: !!processedData,
        hasRawData: !!rawData,
        processedLength: Array.isArray(processedData) ? processedData.length : 'N/A',
        rawLength: Array.isArray(rawData) ? rawData.length : 'N/A',
        schemaID: schemaID
    });
}

/**
 * Get processed data from customObjectData
 * @param {string} objectName - Name of the custom object
 * @returns {*} The stored processed data or null
 */
function getCustomObjectData(objectName) {
    return window.appState.customObjectData[objectName]?.data || null;
}

/**
 * Get raw data from rawCustomObjectData
 * @param {string} objectName - Name of the custom object
 * @returns {*} The stored raw data or null
 */
function getRawCustomObjectData(objectName) {
    return window.appState.rawCustomObjectData[objectName]?.data || null;
}

/**
 * Get processed modal data
 * @param {string} objectName - Name of the modal object
 * @returns {*} The stored processed modal data or null
 */
function getModalObjectData(objectName) {
    return window.appState.customObjectData?.modalData?.[objectName] || null;
}

/**
 * Get raw modal data
 * @param {string} objectName - Name of the modal object
 * @returns {*} The stored raw modal data or null
 */
function getRawModalObjectData(objectName) {
    return window.appState.rawCustomObjectData?.modalData?.[objectName] || null;
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
 * Get both processed and raw data from customObjectData
 * @param {string} objectName - Name of the custom object
 * @returns {Object} Object with processedData, rawData and schemaID properties
 */
function getCustomObjectInfo(objectName) {
    const processedObj = window.appState.customObjectData[objectName];
    const rawObj = window.appState.rawCustomObjectData[objectName];
    
    return {
        processedData: processedObj?.data || null,
        rawData: rawObj?.data || null,
        schemaID: processedObj?.schemaID || null,
        hasProcessedData: !!(processedObj?.data),
        hasRawData: !!(rawObj?.data),
        hasSchemaID: !!(processedObj?.schemaID)
    };
}

/**
 * Enhanced getData function that stores both raw and processed data
 * @param {string} name - The name of the schema to fetch data for
 * @param {boolean} storeInCustomObjects - Whether to store in customObjectData (default: true)
 * @param {Object} config - Processing configuration (optional)
 */
async function getData(name, storeInCustomObjects = true, config = null) {
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
        const rawData = parsedData?.records?.[0]?.data || null;
        
        // Process data if config is provided
        let processedData = null;
        if (rawData && config) {
            processedData = processData(rawData, config);
        }
        
        // Store in customObjectData if requested and if it's a known custom object
        if (storeInCustomObjects && window.appState.customObjectData.hasOwnProperty(name)) {
            setCustomObjectData(name, processedData, rawData, schemaID);
        }
        
        return parsedData;
    } catch (error) {
        console.error(`Error fetching ${name} data:`, error);
        return null;
    }
}

/**
 * Enhanced getwarenkorbPositionsData function that stores both raw and processed data
 * @param {string} name - The name of the schema to fetch data for
 * @param {string} auftragsnummer - Order number
 * @param {boolean} storeInCustomObjects - Whether to store in customObjectData (default: true)
 * @param {Object} config - Processing configuration (optional)
 */
async function getWarenkorbPositionsData(name, auftragsnummer, storeInCustomObjects = true, config = null) {
    try {
        const schemaID = await getSchemaID(name);
        if (!schemaID) return null;
        
        //console.log(auftragsnummer);
        const data = await window.appState.client.request.invokeTemplate("getWarenkorbPositionsData", {
            context: { 
                schema_id: schemaID,
                auftragsnummer: auftragsnummer
            } 
        });
        
        const parsedData = data?.response ? JSON.parse(data.response) : null;
        const rawDataArray = parsedData?.records?.map(record => record.data) || [];
        
        // Process data if config is provided
        let processedDataArray = null;
        if (rawDataArray.length > 0 && config) {
            processedDataArray = processMultipleRecords(rawDataArray, config);
        }
        
        // Store in modalData if requested
        if (storeInCustomObjects && name === 'Warenkorb_Positionen') {
            setModalObjectData('WarenkorbPositionen', processedDataArray, rawDataArray, schemaID);
        }
        
        return parsedData;
    } catch (error) {
        console.error(`Error fetching ${name} data:`, error);
        return null;
    }
}

/**
 * Clear all custom object data (both processed and raw)
 */
function clearCustomObjectData() {
    Object.keys(window.appState.customObjectData).forEach(key => {
        if (key !== 'modalData') {
            window.appState.customObjectData[key] = { data: null, schemaID: null };
            window.appState.rawCustomObjectData[key] = { data: null, schemaID: null };
        }
    });
    
    // Clear modal data
    window.appState.customObjectData.modalData = {};
    window.appState.rawCustomObjectData.modalData = {};
    
    console.log('Custom object data (processed and raw) cleared');
}

/**
 * Debug function to log both processed and raw data states
 */
function debugDataState() {
    console.log('=== PROCESSED DATA STATE ===');
    console.log(window.appState.customObjectData);
    console.log('=== RAW DATA STATE ===');
    console.log(window.appState.rawCustomObjectData);
}

/**
 * Generic data processing function
 * @param {Object} data - Raw data from API
 * @param {Object} config - Configuration for field processing
 * @returns {Object} Processed data object
 */
function processData(data, config) {
    const result = {};
    
    Object.entries(config).forEach(([key, fieldConfig]) => {
        if (typeof fieldConfig === 'string') {
            // Simple field mapping
            result[key] = getValue(data[fieldConfig]);
        } else if (Array.isArray(fieldConfig)) {
            // Array of fields to combine with space
            result[key] = combineFields(data, fieldConfig, ' ');
        } else if (typeof fieldConfig === 'object' && fieldConfig.fields) {
            // Complex field with custom separator
            result[key] = combineFields(data, fieldConfig.fields, fieldConfig.separator);
        } 
    });
    
    return result;
}

/**
 * Process multiple records from fetched data
 * @param {Array} dataArray - Array of data objects from records
 * @param {Object} config - Configuration for field processing
 * @returns {Array} Array of processed data objects
 */
function processMultipleRecords(dataArray, config) {
    if (!Array.isArray(dataArray)) {
        console.warn('processMultipleRecords: Expected array, got:', typeof dataArray);
        return [];
    }

    return dataArray.map((data, index) => {
        try {
            return processData(data, config);
        } catch (error) {
            console.error(`Error processing record ${index}:`, error);
            return null;
        }
    }).filter(result => result !== null); // Remove any failed processing results
}

/**
 * Combine multiple fields with filtering and custom separator
 * @param {Object} data - Source data
 * @param {Array} fields - Field names to combine
 * @param {string} separator - Separator to use
 * @returns {string} Combined string
 */
function combineFields(data, fields, separator = ' ') {
    return fields
        .map(field => data[field])
        .filter(val => val && String(val).trim())
        .join(separator);
}

function getValue(val) {
    return val ?? ''; // Use nullish coalescing to avoid overwriting falsy but valid values like 0 or false
}

/**
 * Formats a phone/fax number for German format
 * @param {string} value - The phone/fax number to format
 * @returns {string} Formatted phone/fax number
 */
function formatPhoneNumber(value) {
    if (!value) return '';
    
    // Clean the number - remove all non-digits and common separators
    let cleaned = String(value).replace(/[\s\-\(\)\/\.]/g, '');
    
    // Handle international prefix
    if (cleaned.startsWith('0049')) {
        cleaned = '+49' + cleaned.substring(4);
    } else if (cleaned.startsWith('49') && cleaned.length > 10) {
        cleaned = '+49' + cleaned.substring(2);
    } else if (cleaned.startsWith('0')) {
        // German national format, convert to international
        cleaned = '+49' + cleaned.substring(1);
    }
    
    // Format German numbers (+49 xxx xxxxxxx or +49 xxxx xxxxxx)
    if (cleaned.startsWith('+49')) {
        const number = cleaned.substring(3);
        
        // Mobile numbers (15x, 16x, 17x, 179x)
        if (number.match(/^(15|16|17)/)) {
            if (number.length >= 10) {
                return `+49 ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}`;
            }
        }
        
        // Landline numbers - various city codes
        if (number.length >= 7) {
            // Try different city code lengths (2-5 digits)
            for (let cityCodeLength of [5, 4, 3, 2]) {
                if (number.length >= cityCodeLength + 4) {
                    const cityCode = number.substring(0, cityCodeLength);
                    const localNumber = number.substring(cityCodeLength);
                    
                    // Format local number in groups
                    if (localNumber.length >= 6) {
                        const mid = Math.floor(localNumber.length / 2);
                        return `+49 ${cityCode} ${localNumber.substring(0, mid)} ${localNumber.substring(mid)}`;
                    } else {
                        return `+49 ${cityCode} ${localNumber}`;
                    }
                }
            }
        }
        
        // Fallback for other formats
        return cleaned.replace('+49', '+49 ');
    }
    
    // For non-German numbers or unrecognized format, return as-is with basic spacing
    return value.replace(/(\d{3,4})(\d{3,4})(\d{3,4})/, '$1 $2 $3').trim();
}

/**
 * Formats a value based on its key name (already lowercase).
 * @param {*} value - The value to format
 * @param {string} [keyName] - Optional key name for formatting logic
 * @param {string} [elementId] - Optional DOM element ID for special cases (e.g., tracking link)
 * @returns {string} Formatted HTML string
 */
function formatValue(value, keyName = '', elementId = '') {
    // Lists for formatting logic
    const booleanKeys = ['storniert', 'active', 'aktiv']; // exact match
    const dateKeys = ['date', 'datum']; // substring match
    const currencyKeys = ['amount', 'preis', 'betrag', 'preis_brutto']; // substring match
    const numberKeys = ['menge', 'anzahl', 'stück', 'quantity', 'wert', 'molliwert', 'steuer']; // substring match
    const phoneKeys = ['telefon', 'phone', 'fax', 'handy', 'mobil', 'mobile']; // substring match
    const emailKeys = ['email', 'e-mail', 'mail', 'e_mail']; // substring match

    // Special: Tracking number → DHL link
    if ((elementId === 'trackingnummer' || keyName === 'trackingnummer') && value) {
        const safeVal = encodeURIComponent(String(value));
        return `<a href="https://www.dhl.com/de-de/home/tracking/tracking-parcel.html?submit=1&tracking-id=${safeVal}" target="_blank" rel="noopener noreferrer">${value}</a>`;
    }

    // Email → formatted with clickable mailto link
    if (keyName && emailKeys.some(k => keyName.includes(k))) {
        if (value && String(value).includes('@')) {
            const email = String(value).trim();
            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (emailRegex.test(email)) {
                return `<a href="mailto:${email}">${email}</a>`;
            }
        }
        return value ? String(value) : '';
    }

    // Phone/Fax → formatted with clickable link
    if (keyName && phoneKeys.some(k => keyName.includes(k))) {
        const formatted = formatPhoneNumber(value);
        if (formatted && formatted !== '') {
            // Create clickable tel: link for phones, but not for fax
            if (keyName.includes('fax')) {
                return `${formatted}`;
            } else {
                // Remove formatting for tel: link (needs clean number)
                const cleanForLink = String(value).replace(/[\s\-\(\)\/\.]/g, '');
                return `<a href="tel:${cleanForLink}">${formatted}</a>`;
            }
        }
        return '';
    }

    // Boolean → checkbox
    if (typeof value === 'boolean' || (keyName && booleanKeys.includes(keyName))) {
        const boolVal = (value === true || value === 'true' || value === 1 || value === '1');
        return `<input type="checkbox" class="checkbox" ${boolVal ? 'checked' : ''} disabled>
                <span>${boolVal ? 'Ja' : 'Nein'}</span>`;
    }

    // Date-like → formatted date
    if (keyName && dateKeys.some(k => keyName.includes(k))) {
        if (value) {
            const d = new Date(value);
            return !isNaN(d.getTime()) ? d.toLocaleDateString() : String(value);
        }
        return '';
    }

    // Currency-like → Euro format
    if (keyName && currencyKeys.some(k => keyName.includes(k))) {
        const num = Number(value);
        return (value !== undefined && value !== null && !isNaN(num))
            ? num.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
            : '';
    }

    // Number-like → formatted number
    if (keyName && numberKeys.some(k => keyName.includes(k))) {
        const num = Number(value);
        return (value !== undefined && value !== null && !isNaN(num))
            ? num.toLocaleString('de-DE') 
            : '';
    }

    // Default number formatting
    if (typeof value === 'number') {
        return value.toLocaleString('de-DE');
    }

    // Fallback
    return (value !== undefined && value !== null && value !== '') ? String(value) : 'Nicht verfügbar';
}

async function loadJsonFile(filePath) {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.error("Error loading JSON file:", error);
  }
}

/**
 * Compare schemas from loadJsonFile (baseline) and getSchema (current)
 * @param {string} jsonFilePath - Path to the baseline JSON schema file
 * @returns {Promise<Object>} Comparison results with new fields detected
 */
async function compareSchemas(jsonFilePath = 'JSON/schema.json') {
    try {
        console.log('Starting schema comparison...');
        
        // Load baseline schema from JSON file
        const baselineData = await loadJsonFile(jsonFilePath);
        const currentSchemaResponse = await getSchema();
        const currentData = JSON.parse(currentSchemaResponse.response);
        
        if (!baselineData || !currentData) {
            console.error('Failed to load schema data for comparison');
            return null;
        }
        
        const baselineSchemas = baselineData.schemas || [];
        const currentSchemas = currentData.schemas || [];
        
        // Store schemas in appState for reference
        window.appState.schemaComparison.baselineSchemas = baselineSchemas;
        window.appState.schemaComparison.currentSchemas = currentSchemas;
        window.appState.schemaComparison.lastComparisonDate = new Date().toISOString();
        
        // Perform detailed comparison
        const comparison = performDetailedSchemaComparison(baselineSchemas, currentSchemas);
        
        // Store results
        window.appState.schemaComparison.newFields = comparison.newFields;
        window.appState.schemaComparison.removedFields = comparison.removedFields;
        window.appState.schemaComparison.modifiedFields = comparison.modifiedFields;
        
        console.log('Schema comparison completed:', {
            totalNewFields: Object.keys(comparison.newFields).length,
            totalRemovedFields: Object.keys(comparison.removedFields).length,
            totalModifiedFields: Object.keys(comparison.modifiedFields).length
        });
        
        return comparison;
        
    } catch (error) {
        console.error('Error comparing schemas:', error);
        return null;
    }
}

/**
 * Perform detailed comparison between baseline and current schemas
 * @param {Array} baselineSchemas - Baseline schema array from JSON file
 * @param {Array} currentSchemas - Current schema array from API
 * @returns {Object} Detailed comparison results
 */
function performDetailedSchemaComparison(baselineSchemas, currentSchemas) {
    const newFields = {};
    const removedFields = {};
    const modifiedFields = {};
    
    // Create maps for easier lookup
    const baselineMap = createSchemaMap(baselineSchemas);
    const currentMap = createSchemaMap(currentSchemas);
    
    // Check for new and modified schemas
    currentSchemas.forEach(currentSchema => {
        const schemaName = currentSchema.name;
        const baselineSchema = baselineMap[schemaName];
        
        if (!baselineSchema) {
            // Completely new schema
            newFields[schemaName] = {
                type: 'new_schema',
                schema: currentSchema,
                fields: extractSchemaFields(currentSchema)
            };
            console.log(`🆕 New schema detected: ${schemaName}`);
        } else {
            // Compare existing schema for field changes
            const fieldComparison = compareSchemaFields(baselineSchema, currentSchema);
            if (fieldComparison.hasChanges) {
                if (fieldComparison.newFields.length > 0) {
                    newFields[schemaName] = {
                        type: 'new_fields',
                        schema: currentSchema,
                        newFields: fieldComparison.newFields,
                        allFields: extractSchemaFields(currentSchema)
                    };
                    console.log(`🆕 New fields in ${schemaName}:`, fieldComparison.newFields);
                }
                
                if (fieldComparison.removedFields.length > 0) {
                    removedFields[schemaName] = {
                        type: 'removed_fields',
                        removedFields: fieldComparison.removedFields
                    };
                }
                
                if (fieldComparison.modifiedFields.length > 0) {
                    modifiedFields[schemaName] = {
                        type: 'modified_fields',
                        modifiedFields: fieldComparison.modifiedFields
                    };
                }
            }
        }
    });
    
    // Check for removed schemas
    baselineSchemas.forEach(baselineSchema => {
        const schemaName = baselineSchema.name;
        if (!currentMap[schemaName]) {
            removedFields[schemaName] = {
                type: 'removed_schema',
                schema: baselineSchema
            };
            console.log(`🗑️ Removed schema: ${schemaName}`);
        }
    });
    
    return { newFields, removedFields, modifiedFields };
}

/**
 * Create a map of schemas by name for easier lookup
 * @param {Array} schemas - Array of schema objects
 * @returns {Object} Map of schema name to schema object
 */
function createSchemaMap(schemas) {
    const map = {};
    schemas.forEach(schema => {
        if (schema.name) {
            map[schema.name] = schema;
        }
    });
    return map;
}

/**
 * Extract field information from a schema
 * @param {Object} schema - Schema object
 * @returns {Array} Array of field objects
 */
function extractSchemaFields(schema) {
    const fields = [];
    
    if (schema.fields && Array.isArray(schema.fields)) {
        schema.fields.forEach(field => {
            fields.push({
                name: field.name,
                //type: field.type,
                label: field.label
                //required: field.required || false,
                //options: field.options || null
            });
        });
    }
    
    return fields;
}

/**
 * Compare fields between two schemas
 * @param {Object} baselineSchema - Baseline schema
 * @param {Object} currentSchema - Current schema
 * @returns {Object} Field comparison results
 */
function compareSchemaFields(baselineSchema, currentSchema) {
    const baselineFields = extractSchemaFields(baselineSchema);
    const currentFields = extractSchemaFields(currentSchema);
    
    const baselineFieldMap = {};
    const currentFieldMap = {};
    
    // Create field maps
    baselineFields.forEach(field => {
        baselineFieldMap[field.name] = field;
    });
    
    currentFields.forEach(field => {
        currentFieldMap[field.name] = field;
    });
    
    const newFields = [];
    const removedFields = [];
    const modifiedFields = [];
    
    // Check for new and modified fields
    currentFields.forEach(currentField => {
        const baselineField = baselineFieldMap[currentField.name];
        
        if (!baselineField) {
            newFields.push(currentField);
        } else {
            // Check if field properties have changed
            const hasChanged = hasFieldChanged(baselineField, currentField);
            if (hasChanged) {
                modifiedFields.push({
                    name: currentField.name,
                    baseline: baselineField,
                    current: currentField,
                    changes: getFieldChanges(baselineField, currentField)
                });
            }
        }
    });
    
    // Check for removed fields
    baselineFields.forEach(baselineField => {
        if (!currentFieldMap[baselineField.name]) {
            removedFields.push(baselineField);
        }
    });
    
    return {
        hasChanges: newFields.length > 0 || removedFields.length > 0 || modifiedFields.length > 0,
        newFields,
        removedFields,
        modifiedFields
    };
}

/**
 * Check if a field has changed between baseline and current
 * @param {Object} baselineField - Baseline field object
 * @param {Object} currentField - Current field object
 * @returns {boolean} True if field has changed
 */
function hasFieldChanged(baselineField, currentField) {
    return (
        baselineField.type !== currentField.type ||
        baselineField.label !== currentField.label ||
        baselineField.required !== currentField.required ||
        JSON.stringify(baselineField.options) !== JSON.stringify(currentField.options)
    );
}

/**
 * Get specific changes between baseline and current field
 * @param {Object} baselineField - Baseline field object
 * @param {Object} currentField - Current field object
 * @returns {Array} Array of change descriptions
 */
function getFieldChanges(baselineField, currentField) {
    const changes = [];
    
    if (baselineField.type !== currentField.type) {
        changes.push(`Type changed from ${baselineField.type} to ${currentField.type}`);
    }
    
    if (baselineField.label !== currentField.label) {
        changes.push(`Label changed from "${baselineField.label}" to "${currentField.label}"`);
    }
    
    if (baselineField.required !== currentField.required) {
        changes.push(`Required changed from ${baselineField.required} to ${currentField.required}`);
    }
    
    if (JSON.stringify(baselineField.options) !== JSON.stringify(currentField.options)) {
        changes.push('Options changed');
    }
    
    return changes;
}

/**
 * Get new fields detected in the comparison
 * @returns {Object} Object containing new fields by schema name
 */
function getNewFieldsDetected() {
    return window.appState.schemaComparison.newFields || {};
}

/**
 * Get new fields for a specific schema
 * @param {string} schemaName - Name of the schema
 * @returns {Array|null} Array of new fields or null if schema not found
 */
function getNewFieldsForSchema(schemaName) {
    const newFields = window.appState.schemaComparison.newFields;
    
    if (!newFields || !newFields[schemaName]) {
        return null;
    }
    
    const schemaData = newFields[schemaName];
    
    if (schemaData.type === 'new_schema') {
        return schemaData.fields;
    } else if (schemaData.type === 'new_fields') {
        return schemaData.newFields;
    }
    
    return null;
}

/**
 * Generate dynamic UI elements for new fields
 * @param {string} schemaName - Name of the schema
 * @param {string} containerSelector - CSS selector for the container to insert elements
 * @returns {string} HTML string for new field elements
 */
function generateDynamicUIElements(schemaName, containerSelector = null) {
    const newFields = getNewFieldsForSchema(schemaName);
    
    if (!newFields || newFields.length === 0) {
        return '';
    }
    
    let html = '<!-- Dynamically generated fields -->\n';
    
    newFields.forEach(field => {
        const fieldId = `dynamic-${schemaName.toLowerCase()}-${field.name}`;
        const fieldLabel = field.label || field.name;
        
        html += `<div class="dynamic-field" data-field-name="${field.name}" data-schema="${schemaName}">\n`;
        html += `    <span class="label">${fieldLabel}:</span>\n`;
        html += `    <span class="field field-m" id="${fieldId}"></span>\n`;
        html += `</div>\n`;
    });
    
    // If container selector is provided, insert the HTML
    if (containerSelector && typeof document !== 'undefined') {
        const container = document.querySelector(containerSelector);
        if (container) {
            container.innerHTML += html;
            console.log(`✅ Dynamic UI elements added to ${containerSelector} for ${schemaName}`);
        } else {
            console.warn(`Container ${containerSelector} not found for dynamic elements`);
        }
    }
    
    return html;
}

/**
 * Initialize schema comparison and generate dynamic elements
 * @param {string} jsonFilePath - Path to baseline schema JSON file
 * @param {Object} uiConfig - Configuration for UI element generation
 * @returns {Promise<Object>} Comparison results
 */
async function initializeSchemaComparisonAndUI(jsonFilePath = 'JSON/schema.json', uiConfig = {}) {
    try {
        // Perform schema comparison
        const comparison = await compareSchemas(jsonFilePath);

        console.log('comparison result', comparison);

        if (!comparison) {
            console.error('Schema comparison failed');
            return null;
        }
        
        // Generate dynamic UI elements for schemas with new fields
        Object.keys(comparison.newFields).forEach(schemaName => {
            const containerSelector = uiConfig[schemaName];
            if (containerSelector) {
                generateDynamicUIElements(schemaName, containerSelector);
            } else {
                console.log(`No UI container configured for schema: ${schemaName}`);
                // Generate HTML but don't insert it
                const html = generateDynamicUIElements(schemaName);
                console.log(`Generated HTML for ${schemaName}:`, html);
            }
        });
        
        return comparison;
        
    } catch (error) {
        console.error('Error initializing schema comparison and UI:', error);
        return null;
    }
}

/**
 * Update dynamic field values with data
 * @param {string} schemaName - Name of the schema
 * @param {Object} data - Data object containing field values
 */
function updateDynamicFieldValues(schemaName, data) {
    const newFields = getNewFieldsForSchema(schemaName);
    
    if (!newFields || !data) {
        return;
    }
    
    newFields.forEach(field => {
        const fieldId = `dynamic-${schemaName.toLowerCase()}-${field.name}`;
        const element = document.getElementById(fieldId);
        
        if (element && data[field.name] !== undefined) {
            const formattedValue = formatValue(data[field.name], field.name.toLowerCase(), fieldId);
            element.innerHTML = formattedValue;
        }
    });
}

/**
 * Collect and organize all new fields detected in schema comparison
 * @param {Object} comparisonResults - Results from compareSchemas function
 * @returns {Object} Organized collection of new fields
 */
function collectNewFields(comparisonResults) {
    if (!comparisonResults || !comparisonResults.newFields) {
        console.warn('No comparison results provided for field collection');
        return null;
    }
    
    const collection = {
        allNewFields: {},
        fieldsByType: {},
        fieldsByPage: {},
        collectionMetadata: {
            lastUpdated: new Date().toISOString(),
            totalNewFields: 0,
            schemasCovered: []
        }
    };
    
    let totalFields = 0;
    
    // Process each schema with new fields
    Object.entries(comparisonResults.newFields).forEach(([schemaName, schemaData]) => {
        const fieldsToProcess = getFieldsFromSchemaData(schemaData);
        
        if (fieldsToProcess && fieldsToProcess.length > 0) {
            // Store all new fields for this schema
            collection.allNewFields[schemaName] = {
                schemaType: schemaData.type,
                fields: fieldsToProcess,
                fieldCount: fieldsToProcess.length
            };
            
            // Organize by field type
            fieldsToProcess.forEach(field => {
                if (!collection.fieldsByType[field.type]) {
                    collection.fieldsByType[field.type] = [];
                }
                collection.fieldsByType[field.type].push({
                    schemaName,
                    field
                });
            });
            
            totalFields += fieldsToProcess.length;
            collection.collectionMetadata.schemasCovered.push(schemaName);
        }
    });
    
    collection.collectionMetadata.totalNewFields = totalFields;
    
    // Store in global appState
    window.appState.newFieldsCollection = collection;
    
    console.log(`📦 Collected ${totalFields} new fields from ${collection.collectionMetadata.schemasCovered.length} schemas:`, 
                collection.collectionMetadata.schemasCovered);
    
    return collection;
}

/**
 * Extract fields from schema data regardless of type
 * @param {Object} schemaData - Schema data from comparison results
 * @returns {Array} Array of field objects
 */
function getFieldsFromSchemaData(schemaData) {
    switch (schemaData.type) {
        case 'new_schema':
            return schemaData.fields || [];
        case 'new_fields':
            return schemaData.newFields || [];
        default:
            console.warn(`Unknown schema data type: ${schemaData.type}`);
            return [];
    }
}

/**
 * Map new fields to specific UI pages/contexts for targeted updates
 * @param {Object} pageMapping - Mapping of schema names to page contexts
 * @returns {Object} Fields organized by page context
 */
function mapFieldsToPages(pageMapping = {}) {
    const collection = window.appState.newFieldsCollection;
    
    if (!collection || !collection.allNewFields) {
        console.warn('No new fields collection available for page mapping');
        return {};
    }
    
    const defaultPageMapping = {
        'Empfänger': ['overview', 'modal'],
        'Auftraggeber': ['overview', 'modal'],
        'Ausführung': ['overview', 'modal'],
        'Auftragsstatus': ['overview', 'modal'],
        'Vermittler': ['modal'],
        'Warenkorb': ['overview', 'modal'],
        'Warenkorb_Positionen': ['overview'],
        'Auftragsstatus_KLASSIK_OT': ['overview'],
        'Auftragsstatus_KLASSIK_GTSCHN': ['overview'],
        'Auftragsstatus_KLASSIK_KOPF_PS': ['overview']
    };
    
    const mapping = { ...defaultPageMapping, ...pageMapping };
    const fieldsByPage = {};
    
    // Initialize page containers
    ['overview', 'modal', 'sidebar'].forEach(page => {
        fieldsByPage[page] = {};
    });
    
    // Map fields to pages
    Object.entries(collection.allNewFields).forEach(([schemaName, schemaInfo]) => {
        const pages = mapping[schemaName] || ['overview']; // default to overview
        
        pages.forEach(page => {
            if (!fieldsByPage[page][schemaName]) {
                fieldsByPage[page][schemaName] = [];
            }
            fieldsByPage[page][schemaName] = schemaInfo.fields;
        });
    });
    
    // Store in collection
    collection.fieldsByPage = fieldsByPage;
    window.appState.newFieldsCollection = collection;
    
    console.log('📋 Fields mapped to pages:', Object.keys(fieldsByPage).map(page => 
        `${page}: ${Object.keys(fieldsByPage[page]).length} schemas`
    ).join(', '));
    
    return fieldsByPage;
}

/**
 * Get new fields for a specific use case
 * @param {Object} options - Options for field retrieval
 * @returns {Object|Array} Filtered new fields
 */
function getNewFieldsFor(options = {}) {
    const collection = window.appState.newFieldsCollection;
    
    if (!collection) {
        console.warn('No new fields collection available');
        return null;
    }
    
    const { schema, type, page, format = 'object' } = options;
    
    // Get by schema name
    if (schema) {
        const schemaFields = collection.allNewFields[schema];
        return schemaFields ? schemaFields.fields : [];
    }
    
    // Get by field type
    if (type) {
        return collection.fieldsByType[type] || [];
    }
    
    // Get by page context
    if (page) {
        return collection.fieldsByPage[page] || {};
    }
    
    // Return all fields in requested format
    if (format === 'flat') {
        const allFields = [];
        Object.entries(collection.allNewFields).forEach(([schemaName, schemaInfo]) => {
            schemaInfo.fields.forEach(field => {
                allFields.push({ ...field, schemaName });
            });
        });
        return allFields;
    }
    
    return collection.allNewFields;
}

/**
 * Create a reusable configuration object for new fields
 * @returns {Object} Configuration object with field mappings
 */
function createNewFieldsConfig() {
    const collection = window.appState.newFieldsCollection;
    
    if (!collection) {
        console.warn('No new fields collection available for config creation');
        return {};
    }
    
    const config = {
        // Data processing configs for new fields
        dataConfigs: {},
        
        // UI element mappings for new fields
        uiMappings: {},
        
        // Container selectors for dynamic insertion
        containers: {
            overview: {},
            modal: {}
        },
        
        // Field metadata for formatting
        fieldMetadata: {}
    };
    
    Object.entries(collection.allNewFields).forEach(([schemaName, schemaInfo]) => {
        // Create data config for this schema's new fields
        config.dataConfigs[schemaName] = {};
        config.uiMappings[schemaName] = {};
        config.fieldMetadata[schemaName] = {};
        
        schemaInfo.fields.forEach(field => {
            const fieldName = field.name;
            
            // Simple field mapping (can be enhanced based on field type)
            config.dataConfigs[schemaName][fieldName] = fieldName;
            
            // UI element ID mapping
            const elementId = `dynamic-${schemaName.toLowerCase()}-${fieldName}`;
            config.uiMappings[schemaName][elementId] = fieldName;
            
            // Store field metadata for later use
            config.fieldMetadata[schemaName][fieldName] = {
                type: field.type,
                label: field.label,
                required: field.required,
                options: field.options
            };
        });
        
        // Set container selectors based on schema
        config.containers.overview[schemaName] = getContainerSelectorForSchema(schemaName, 'overview');
        config.containers.modal[schemaName] = getContainerSelectorForSchema(schemaName, 'modal');
    });
    
    console.log('⚙️ Created configuration for new fields:', {
        schemas: Object.keys(config.dataConfigs).length,
        totalFields: Object.values(config.dataConfigs).reduce((sum, schema) => 
            sum + Object.keys(schema).length, 0)
    });
    
    return config;
}

/**
 * Get appropriate container selector for schema and context
 * @param {string} schemaName - Name of the schema
 * @param {string} context - UI context ('overview', 'modal')
 * @returns {string} CSS selector for container
 */
function getContainerSelectorForSchema(schemaName, context) {
    const selectorMap = {
        overview: {
            'Empfänger': '.empf-insertion-point',
            'Ausführung': '.ausf-insertion-point',
            'Auftraggeber': '.auftraggeber-insertion-point',
            'Auftragsstatus': '.auftragsstatus-insertion-point',
            'Warenkorb': '.warenkorb-insertion-point'
        },
        modal: {
            'Empfänger': '.modal-empf-insertion-point',
            'Ausführung': '.modal-ausf-insertion-point',
            'Auftraggeber': '.modal-auftraggeber-insertion-point',
            'Auftragsstatus': '.modal-auftragsstatus-insertion-point',
            'Warenkorb': '.modal-warenkorb-insertion-point'
        }
    };
    
    return selectorMap[context]?.[schemaName] || `.${schemaName.toLowerCase()}-new-fields`;
}

/**
 * Export new fields collection to different formats for external use
 * @param {string} format - Export format ('json', 'csv', 'html')
 * @returns {string} Exported data in requested format
 */
function exportNewFields(format = 'json') {
    const collection = window.appState.newFieldsCollection;
    
    if (!collection) {
        console.warn('No new fields collection to export');
        return null;
    }
    
    switch (format.toLowerCase()) {
        case 'json':
            return JSON.stringify(collection, null, 2);
            
        case 'csv':
            return exportNewFieldsAsCSV(collection);
            
        case 'html':
            return exportNewFieldsAsHTML(collection);
            
        default:
            console.warn(`Unknown export format: ${format}`);
            return JSON.stringify(collection, null, 2);
    }
}

/**
 * Export new fields as CSV format
 * @param {Object} collection - New fields collection
 * @returns {string} CSV formatted string
 */
function exportNewFieldsAsCSV(collection) {
    const rows = [['Schema', 'Field Name', 'Field Type', 'Label', 'Required']];
    
    Object.entries(collection.allNewFields).forEach(([schemaName, schemaInfo]) => {
        schemaInfo.fields.forEach(field => {
            rows.push([
                schemaName,
                field.name,
                field.type,
                field.label || '',
                field.required || false
            ]);
        });
    });
    
    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

/**
 * Export new fields as HTML table format
 * @param {Object} collection - New fields collection
 * @returns {string} HTML formatted string
 */
function exportNewFieldsAsHTML(collection) {
    let html = '<table border="1"><thead><tr><th>Schema</th><th>Field Name</th><th>Type</th><th>Label</th><th>Required</th></tr></thead><tbody>';
    
    Object.entries(collection.allNewFields).forEach(([schemaName, schemaInfo]) => {
        schemaInfo.fields.forEach(field => {
            html += `<tr>
                <td>${schemaName}</td>
                <td>${field.name}</td>
                <td>${field.type}</td>
                <td>${field.label || ''}</td>
                <td>${field.required || false}</td>
            </tr>`;
        });
    });
    
    html += '</tbody></table>';
    return html;
}

/**
 * Complete initialization function that collects new fields and creates config
 * @param {string} jsonFilePath - Path to baseline schema JSON
 * @param {Object} pageMapping - Custom page mapping (optional)
 * @returns {Promise<Object>} Complete new fields setup
 */
async function initializeNewFieldsCollection(jsonFilePath = 'JSON/schema.json', pageMapping = {}) {
    try {
        // Perform schema comparison
        const comparison = await compareSchemas(jsonFilePath);
        
        if (!comparison) {
            console.error('Schema comparison failed - cannot collect new fields');
            return null;
        }
        
        // Collect and organize new fields
        const collection = collectNewFields(comparison);
        
        if (!collection || collection.collectionMetadata.totalNewFields === 0) {
            console.log('No new fields detected in comparison');
            return { collection: null, config: null, pageMapping: {} };
        }
        
        // Map fields to pages
        const fieldsByPage = mapFieldsToPages(pageMapping);
        
        // Create reusable config
        const config = createNewFieldsConfig();
        
        console.log(`🎯 New fields collection initialized: ${collection.collectionMetadata.totalNewFields} fields from ${collection.collectionMetadata.schemasCovered.length} schemas`);
        
        return {
            collection,
            config,
            fieldsByPage,
            metadata: collection.collectionMetadata
        };
        
    } catch (error) {
        console.error('Error initializing new fields collection:', error);
        return null;
    }
}

/**
 * Debug function to show collected new fields information
 */
function debugNewFieldsCollection() {
    const collection = window.appState.newFieldsCollection;
    
    console.log('=== NEW FIELDS COLLECTION DEBUG ===');
    
    if (!collection) {
        console.log('No new fields collection found');
        return;
    }
    
    console.log('Collection metadata:', collection.collectionMetadata);
    console.log('Schemas with new fields:', Object.keys(collection.allNewFields));
    console.log('Field types found:', Object.keys(collection.fieldsByType));
    console.log('Pages configured:', Object.keys(collection.fieldsByPage || {}));
    
    // Show details for each schema
    Object.entries(collection.allNewFields).forEach(([schema, info]) => {
        console.log(`\n${schema} (${info.schemaType}):`, 
                   info.fields.map(f => `${f.name} (${f.type})`));
    });
}

// DATA_CONFIGS - All configurations in one place
const DATA_CONFIGS = {
    ausfuehrung: {
        nummer: "ausfuehrender",
        name: ["anrede", "name1", "name2", "name3"],
        addresse: {
            fields: ["plz", "ort", "strasse", "land"],
            separator: "<br>"
        },
        rang: "rang",
        fax: "fax",
        telefon: "telefon",
        email: "email",
        auftragshinweis: "auftragshinweis",
        hinweis: "hinweis"
    },
    
    empfaenger: {
        name: ["anrede", "name1", "name2"],
        firmenzusatz: "name3",
        address: {
            fields: ["plz", "ort", "strasse", "region", "land"],
            separator: "<br>"
        },
        phone: "telefon"
    },
    
    auftraggeber: {
        name: ["anrede", "name1", "name2"],
        firmenzusatz: "name3",
        address: {
            fields: ["plz", "ort", "strasse", "region", "land"],
            separator: "<br>"
        },
        phone: "telefon",
        email: "email"
    },
    
    auftragsstatus: {
        bestelldatum: "bestelldatum",
        vertriebsweg: "vertriebsweg",
        auftragsstatus: "status",
        freitext: "freitext",
        molliwert: "molliwert",
        erfassdatum: "erfassdatum",
        rechnungsnummer: "rechnungsnummer",
        trackingnummer: "trackingnummer"
    },
    
    vermittler: {
        vermittler: "vermittler",
        aktiv: "vermittler_aktiv",
        typ: "vermittler_lfp_agp",
        name: ["anrede", "name1", "name2", "name3"],
        addresse: {
            fields: ["plz", "ort", "strasse", "region", "land"],
            separator: "<br>"
        },
        fax: "fax",
        telefon: "telefon"
    },
    
    warenkorb: {
        auftragsnummer: "auftragsnummer",
        bestellnummer: "bestellnummer",
        lieferdatum: "lieferdatum",
        zahlbetrag: "zahlbetrag",
        v_zuk_bas: "v_zuk_bas", 
        v_zuk_exp: "v_zuk_exp",
        v_zuk_son: "v_zuk_son",
        a_zuk_bas: "a_zuk_bas",
        a_zuk_exp: "a_zuk_exp",
        a_zuk_son: "a_zuk_son",
        kartentext: "kartentext"
    },

    // Modal-specific data configurations
    ot: {
        datum: ["datum", "uhrzeit"],
        ereignis: "ereignis",
        text: "text",
        ergebnis: "ergebnis",
        name: "name",
        addresse: {
            fields: ["strasse_hausnummer","plz", "ort", "ortsteil"],
            separator: "<br>"
        },
        erfasser: "erfasser",
        storniert: "storniert",
        storniert_text: "storniert_text",
        storno_datum: "storno_datum",
        storno_erfasser: "storno_erfasser"
    },
    
    gutscheine: {
        kartennummer: "kartennummer",
        wert: "wert",
        einlosedatum: "einlsedatum",
    },
    
    kopfpauschalen: {
        kondition: "kondition",
        konditionstext: "konditionstext",
        betrag: "betrag",
        einheit: "einheit"
    },
    
    warenkorbPositionen: {
        position: 'position',
        material: 'material',
        menge: 'menge',
        preis_brutto: 'preis_brutto',
        steuer: 'steuer',
        kurztext: 'kurztext',
        kartenart: 'kartenart',
        variante: 'variante'
    }
};