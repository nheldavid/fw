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

/**
 * Fetches all schemas and stores them globally
 * @returns {Promise<Object>} Object with schema names as keys and IDs as values
 */
async function getAllSchemaIDs() {
    try {
        const schema = await window.appState.client.request.invokeTemplate("getSchema");
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
        
        console.log(auftragsnummer);
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