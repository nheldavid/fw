// data-utils.js - Reusable utility functions for data fetching

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

        const orders = await appState.client.request.invokeTemplate("getData", {
            context: { 
                schema_id: schemaID,
                ticketnummer: appState.currentTicket.id
            } 
        });
        
        return orders?.response ? JSON.parse(orders.response) : null;
    } catch (error) {
        console.error(`Error fetching ${name} data:`, error);
        return null;
    }
}

// Helper function to safely concatenate strings
const safeConcat = (...values) => {
    const separator = values[values.length - 1];
    
    // Check if last argument is a separator option
    if (typeof separator === 'object' && separator.separator) {
        const actualValues = values.slice(0, -1);
        return actualValues.filter(val => val && val.trim()).join(separator.separator);
    }
    
    // Default behavior - join with space
    return values.filter(val => val && val.trim()).join(' ');
};

// Generic function to update DOM elements
function updateElements(data, elementMap) {
    Object.entries(elementMap).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.innerHTML = value || 'Nicht verfügbar';
        } else {
            console.warn(`Element with ID ${id} not found`);
        }
    });
}

function getValue(val) {
  return val ?? ''; // Use nullish coalescing to avoid overwriting falsy but valid values like 0 or false
}