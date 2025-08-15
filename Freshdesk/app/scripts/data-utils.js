// data-utils.js - Reusable utility functions for data fetching and shared app state

// Ensure we only initialize once
if (!window.appState) {
    window.appState = {
        client: null,
        isInitialized: false,
        currentTicket: null,
        orderData: null,
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

// Shared reference
//const appState = window.appState;

/**  
 * @param {string} name - The name of the schema to fetch
 */
async function getSchemaID(name) {
    try {
        const schema = await window.appState.client.request.invokeTemplate("getSchema");
        const schemaid = JSON.parse(schema.response).schemas?.find(s => s.name === name)?.id;
        
        if (!schemaid) {
            console.warn(`Schema ID for "${name}" not found`);
            return null;
        }
        console.log(`Schema ID for "${name}":`, schemaid);
        return schemaid;    
    } catch (error) {
        console.error(`Error fetching schema ID for "${name}":`, error);
        return null;
    }
}

// Fetches data based on the schema name and current ticket context
// Returns parsed JSON data or null if not found
/**
 * 
 * @param {string} name - The name of the schema to fetch data for
 */
async function getData(name) {
    try {
        const schemaID = await getSchemaID(name);
        if (!schemaID) return null;

        const data = await window.appState.client.request.invokeTemplate("getData", {
            context: { 
                schema_id: schemaID,
                ticketnummer: window.appState.currentTicket?.id
            } 
        });
        
        return data?.response ? JSON.parse(data.response) : null;
    } catch (error) {
        console.error(`Error fetching ${name} data:`, error);
        return null;
    }
}

// Fetches data based on the schema name and current ticket context
// Returns parsed JSON data or null if not found
/**
 * 
 * @param {string} name - The name of the schema to fetch data for
 */
async function getCartPositionsData(name, auftragsnummer) {
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
        
        return data?.response ? JSON.parse(data.response) : null;
    } catch (error) {
        console.error(`Error fetching ${name} data:`, error);
        return null;
    }
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
  const currencyKeys = ['amount', 'preis', 'betrag', 'zahlbetrag']; // substring match
  const numberKeys = ['menge', 'anzahl', 'stück', 'quantity', 'wert', 'molliwert']; // substring match

  // Special: Tracking number → DHL link
  if ((elementId === 'trackingnummer' || keyName === 'trackingnummer') && value) {
    const safeVal = encodeURIComponent(String(value));
    return `<a href="https://www.dhl.com/de-de/home/tracking/tracking-parcel.html?submit=1&tracking-id=${safeVal}" target="_blank" rel="noopener noreferrer">${value}</a>`;
  }

  // Boolean → checkbox
  if (typeof value === 'boolean' || (keyName && booleanKeys.includes(keyName))) {
    const boolVal = (value === true || value === 'true' || value === 1 || value === '1');
    return `<fw-checkbox ${boolVal ? 'checked' : ''} disabled></fw-checkbox>`;
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
