// data-utils.js - Reusable utility functions for data fetching
// Global app state
const appState = {
    client: null,
    isInitialized: false,
    currentTicket: null,
    orderData: null
};
/**  
 * @param {string} name - The name of the schema to fetch
 */
async function getSchemaID(name) {
    try {
        const schema = await appState.client.request.invokeTemplate("getSchema");
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

        const data = await appState.client.request.invokeTemplate("getData", {
            context: { 
                schema_id: schemaID,
                ticketnummer: appState.currentTicket?.id
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

// // Helper function to safely concatenate strings
// const safeConcat = (...values) => {
//     const separator = values[values.length - 1];
    
//     // Check if last argument is a separator option
//     if (typeof separator === 'object' && separator.separator) {
//         const actualValues = values.slice(0, -1);
//         return actualValues.filter(val => val && val.trim()).join(separator.separator);
//     }
    
//     // Default behavior - join with space
//     return values.filter(val => val && val.trim()).join(' ');
// };



