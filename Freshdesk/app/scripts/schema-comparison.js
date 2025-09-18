// Global object to store custom field names and new fields
let CustomObjectNames = {};

// Helper function to get objectSchema for a specific schema type
function getObjectSchema(schemaKey) {
    if (!window.appState?.objectSchema) {
        console.warn('appState.objectSchema not initialized');
        return null;
    }
    return window.appState.objectSchema[schemaKey];
}

// Helper function to set objectSchema for a specific schema type
function setObjectSchema(schemaKey, schemaData) {
    if (!window.appState?.objectSchema) {
        console.warn('appState.objectSchema not initialized');
        return;
    }
    
    window.appState.objectSchema[schemaKey] = {
        ...schemaData,
        lastUpdated: new Date().toISOString()
    };
    
    console.log(`Updated objectSchema.${schemaKey}:`, window.appState.objectSchema[schemaKey]);
}
let referenceSchemaData = null;

// Function to load reference schema from schema.json file
async function loadReferenceSchema() {
    try {
        // In your app environment, you might need to use a different method
        // This could be from your server, assets, or bundled with the app
        const response = await fetch('schema.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const schemaData = await response.json();
        
        // Handle both formats: direct schemas array or nested in schemas property
        referenceSchemaData = schemaData.schemas ? schemaData : { schemas: schemaData };
        console.log('Reference schema loaded successfully');
        return referenceSchemaData;
    } catch (error) {
        console.error('Error loading reference schema:', error);
        // Fallback: Use the schema.json data you provided
        referenceSchemaData = {
            "schemas": [
                {
                    "name": "Auftraggeber",
                    "fields": [
                        { "name": "ticket", "label": "Ticket" },
                        { "name": "ticketnummer", "label": "Ticketnummer" },
                        { "name": "anrede", "label": "Anrede" },
                        { "name": "name1", "label": "Name1" },
                        { "name": "name2", "label": "Name2" },
                        { "name": "name3", "label": "Name3" },
                        { "name": "plz", "label": "PLZ" },
                        { "name": "ort", "label": "Ort" },
                        { "name": "strasse", "label": "Strasse" },
                        { "name": "land", "label": "Land" },
                        { "name": "telefon", "label": "Telefon" },
                        { "name": "email", "label": "Email" }
                    ]
                },
                {
                    "name": "Ausführung", 
                    "fields": [
                        { "name": "ticket", "label": "Ticket" },
                        { "name": "ticketnummer", "label": "Ticketnummer" },
                        { "name": "ausfuehrender", "label": "Ausfuehrender" },
                        { "name": "anrede", "label": "Anrede" },
                        { "name": "name1", "label": "Name1" },
                        { "name": "name2", "label": "Name2" },
                        { "name": "name3", "label": "Name3" },
                        { "name": "plz", "label": "PLZ" },
                        { "name": "ort", "label": "Ort" },
                        { "name": "strasse", "label": "Strasse" },
                        { "name": "land", "label": "Land" },
                        { "name": "rang", "label": "Rang" },
                        { "name": "fax", "label": "Fax" },
                        { "name": "telefon", "label": "Telefon" },
                        { "name": "email", "label": "Email" },
                        { "name": "auftragshinweis", "label": "Auftragshinweis" },
                        { "name": "hinweis", "label": "Hinweis" }
                    ]
                },
                {
                    "name": "Auftragsstatus",
                    "fields": [
                        { "name": "ticket", "label": "Ticket" },
                        { "name": "ticketnummer", "label": "Ticketnummer" },
                        { "name": "bestelldatum", "label": "Bestelldatum" },
                        { "name": "vertriebsweg", "label": "Vertriebsweg" },
                        { "name": "status", "label": "Status" },
                        { "name": "freitext", "label": "Freitext" },
                        { "name": "molliwert", "label": "Molliwert" },
                        { "name": "rechnungsnummer", "label": "Rechnungsnummer" },
                        { "name": "trackingnummer", "label": "Trackingnummer" }
                    ]
                },
                {
                    "name": "Auftragsstatus_KLASSIK_OT",
                    "fields": [
                        { "name": "ticket", "label": "Ticket" },
                        { "name": "ticketnummer", "label": "Ticketnummer" },
                        { "name": "datum", "label": "Datum" },
                        { "name": "text", "label": "Text" },
                        { "name": "ergebnis", "label": "Ergebnis" },
                        { "name": "name", "label": "Name" },
                        { "name": "strasse_hausnummer", "label": "Strasse_Hausnummer" },
                        { "name": "ort", "label": "Ort" },
                        { "name": "ortsteil", "label": "Ortsteil" },
                        { "name": "erfasser", "label": "Erfasser" },
                        { "name": "storniert", "label": "storniert" },
                        { "name": "storniert_text", "label": "STORNIERT_TEXT" },
                        { "name": "storno_datum", "label": "STORNO_DATUM" },
                        { "name": "storno_erfasser", "label": "STORNO_ERFASSER" },
                        { "name": "storno_uhrzeit", "label": "STORNO_UHRZEIT" }
                    ]
                },
                {
                    "name": "Auftragsstatus_KLASSIK_GTSCHN",
                    "fields": [
                        { "name": "ticket", "label": "Ticket" },
                        { "name": "ticketnummer", "label": "Ticketnummer" },
                        { "name": "kartennummer", "label": "Kartennummer" },
                        { "name": "wert", "label": "Wert" },
                        { "name": "einlsedatum", "label": "EinlÃ¶sedatum" },
                        { "name": "einlsezeit", "label": "EinlÃ¶sezeit" }
                    ]
                },
                {
                    "name": "Auftragsstatus_KLASSIK_KOPF_PS",
                    "fields": [
                        { "name": "ticket", "label": "Ticket" },
                        { "name": "ticketnummer", "label": "Ticketnummer" },
                        { "name": "kondition", "label": "Kondition" },
                        { "name": "konditionstext", "label": "Konditionstext" },
                        { "name": "betrag", "label": "Betrag" },
                        { "name": "einheit", "label": "Einheit" }
                    ]
                }
            ]
        };
        console.log('Using fallback reference schema');
        return referenceSchemaData;
    }
}

// Integration with your existing data-utils.js functions
async function GetSchema() {
    try {
        // Use your existing getSchema function from data-utils.js
        const schemaResponse = await getSchema();
        if (!schemaResponse || !schemaResponse.response) {
            console.error('No schema response received');
            return [];
        }
        
        const parsedSchema = JSON.parse(schemaResponse.response);
        return parsedSchema.schemas || parsedSchema || [];
        
    } catch (error) {
        console.error('Error in GetSchema:', error);
        return [];
    }
}

// Helper function to normalize schema names (handle encoding differences)
function normalizeSchemaName(name) {
    return name
        .replace(/Ã¼/g, 'ü')
        .replace(/Ã¤/g, 'ä')
        .replace(/Ã¶/g, 'ö')
        .replace(/AusfÃ¼hrung/g, 'Ausführung')
        .replace(/EmpfÃ¤nger/g, 'Empfänger');
}

// Function to create field lookup maps
function createFieldMap(schemaArray) {
    const fieldMap = {};
    
    schemaArray.forEach(schema => {
        const normalizedName = normalizeSchemaName(schema.name);
        fieldMap[normalizedName] = {};
        
        schema.fields.forEach(field => {
            fieldMap[normalizedName][field.name] = {
                label: field.label,
                name: field.name
            };
        });
    });
    
    return fieldMap;
}

// Main function to compare schemas and identify new fields
async function compareSchemas() {
    // Load reference schema if not already loaded
    if (!referenceSchemaData) {
        referenceSchemaData = await loadReferenceSchema();
        if (!referenceSchemaData) {
            console.error('Failed to load reference schema');
            return {};
        }
    }
    
    // Get current dynamic schema
    const currentSchemaArray = GetSchema();
    
    // Create field maps for comparison
    const referenceFieldMap = createFieldMap(referenceSchemaData.schemas);
    const currentFieldMap = createFieldMap(currentSchemaArray);
    
    const newFields = {};
    let totalNewFields = 0;
    
    // Compare schemas and find new fields
    Object.keys(currentFieldMap).forEach(schemaName => {
        const currentFields = currentFieldMap[schemaName];
        const referenceFields = referenceFieldMap[schemaName] || {};
        
        // Get the corresponding objectSchema key
        const objectSchemaKey = getDataConfigKey(schemaName);
        
        // Initialize schema structure for this object type
        const schemaStructure = {
            name: schemaName,
            fields: [],
            newFields: [],
            totalFields: Object.keys(currentFields).length,
            newFieldsCount: 0
        };
        
        // Check each field in current schema
        Object.keys(currentFields).forEach(fieldName => {
            const fieldInfo = {
                name: fieldName,
                label: currentFields[fieldName].label,
                isNew: false
            };
            
            if (!referenceFields[fieldName]) {
                // This is a new field
                fieldInfo.isNew = true;
                fieldInfo.addedDate = new Date().toISOString();
                fieldInfo.source = 'schema_comparison';
                
                if (!newFields[schemaName]) {
                    newFields[schemaName] = [];
                }
                newFields[schemaName].push(fieldInfo);
                schemaStructure.newFields.push(fieldInfo);
                schemaStructure.newFieldsCount++;
                
                // Store in CustomObjectNames with unique key (backward compatibility)
                const customKey = `${schemaName}_${fieldName}`;
                CustomObjectNames[customKey] = fieldInfo;
                
                totalNewFields++;
                
                console.log(`New field detected: ${schemaName}.${fieldName} (${currentFields[fieldName].label})`);
            }
            
            schemaStructure.fields.push(fieldInfo);
        });
        
        // Store schema structure in objectSchema if we have a valid key
        if (objectSchemaKey) {
            setObjectSchema(objectSchemaKey, schemaStructure);
        }
    });
    
    console.log(`Total new fields detected: ${totalNewFields}`);
    console.log('New fields by schema:', newFields);
    console.log('CustomObjectNames updated:', CustomObjectNames);
    console.log('ObjectSchema updated:', window.appState?.objectSchema);
    
    return newFields;
}

// Enhanced createPauschaleItem with dynamic field insertion using objectSchema
function createPauschaleItem(data, schemaName = 'Auftragsstatus_KLASSIK_KOPF_PS') {
    // Get the corresponding objectSchema key
    const objectSchemaKey = getDataConfigKey(schemaName);
    
    // Get schema information from objectSchema
    const schemaInfo = getObjectSchema(objectSchemaKey);
    
    if (!schemaInfo || !schemaInfo.fields) {
        console.warn(`Schema info not found for ${schemaName}/${objectSchemaKey}`);
        // Fallback to original method
        const currentSchema = GetSchema().find(schema => 
            normalizeSchemaName(schema.name) === schemaName
        );
        
        if (!currentSchema) {
            console.warn(`Schema ${schemaName} not found`);
            return `<div class="row">No schema found for ${schemaName}</div>`;
        }
        
        // Use original field configuration
        const fieldConfig = currentSchema.fields.map(field => ({
            name: field.name,
            label: field.label,
            class: determineFieldClass(field.name, false),
            isNew: false
        }));
        
        return generateFieldsHTML(data, fieldConfig, schemaName);
    }
    
    // Use objectSchema field information
    const fieldConfig = schemaInfo.fields.map(field => ({
        name: field.name,
        label: field.label,
        class: determineFieldClass(field.name, field.isNew),
        isNew: field.isNew || false
    }));
    
    return generateFieldsHTML(data, fieldConfig, schemaName);
}

// Helper function to generate fields HTML
function generateFieldsHTML(data, fieldConfig, schemaName) {
    // Generate HTML using iteration
    const fieldsHtml = fieldConfig.map(field => {
        const value = data[field.name];
        
        // Skip if field doesn't exist in data
        if (value === undefined || value === null || value === '') {
            return '';
        }
        
        // Apply special formatting based on field type
        const formattedValue = formatFieldValue(field.name, value);
        
        // Add special styling for new fields
        let cssClasses = `field ${field.class}`;
        if (field.isNew) {
            cssClasses += ' new-field';
        }
        
        return `<span class="${cssClasses}" 
                      title="${field.label}${field.isNew ? ' (New Field)' : ''}" 
                      data-field="${field.name}">
                    ${formattedValue}
                </span>`;
    }).filter(field => field !== '').join('');
    
    return `<div class="row" data-schema="${schemaName}">${fieldsHtml}</div>`;
}

// Helper function to determine CSS class based on field name
function determineFieldClass(fieldName) {     //, isNew = false) {
    let baseClass = 'field-m'; // default
    
    // Determine size based on field name patterns
    if (fieldName.includes('betrag') || fieldName.includes('preis') || fieldName.includes('wert')) {
        baseClass = 'field-m currency';
    } else if (fieldName.includes('datum') || fieldName.includes('zeit')) {
        baseClass = 'field-s date';
    } else if (fieldName.includes('text') || fieldName.includes('hinweis') || fieldName.includes('freitext')) {
        baseClass = 'field-l text';
    } else if (fieldName.includes('nummer') || fieldName.includes('plz')) {
        baseClass = 'field-s number';
    }
    
    return baseClass;
}

// Helper function to format field values
function formatFieldValue(fieldName, value) {
    if (!value) return '';
    
    // Format currency fields
    if (fieldName.includes('betrag') || fieldName.includes('preis') || fieldName.includes('wert')) {
        const numValue = parseFloat(value);
        return isNaN(numValue) ? value : `€${numValue.toFixed(2)}`;
    }
    
    // Format date fields
    if (fieldName.includes('datum')) {
        try {
            const date = new Date(value);
            return date.toLocaleDateString('de-DE');
        } catch (e) {
            return value;
        }
    }
    
    return value;
}

// Enhanced populatePauschaleItems with schema comparison
async function populatePauschaleItems(pauschaleDataArray, schemaName = 'Auftragsstatus_KLASSIK_KOPF_PS') {
    // Skip if data is empty or invalid
    if (!pauschaleDataArray || pauschaleDataArray.length === 0) {
        console.warn('No data provided to populatePauschaleItems');
        return;
    }
    
    // Compare schemas and update CustomObjectNames before populating
    await compareSchemas();
    
    const container = document.querySelector('.kopfpauschalen-items-container');
    if (!container) {
        console.error('Container .kopfpauschalen-items-container not found');
        return;
    }
    
    // Generate HTML for all items using iteration with schema-aware field insertion
    const html = pauschaleDataArray.map((item, index) => {
        const rowHtml = createPauschaleItem(item, schemaName);
        return rowHtml.replace(
            '<div class="row"', 
            `<div class="row" data-index="${index}"`
        );
    }).join('');
    
    container.innerHTML = html;
    
    // Add CSS for new fields if not already added
    addNewFieldStyles();
    
    console.log(`Populated ${pauschaleDataArray.length} items for schema: ${schemaName}`);
}

// Function to add CSS styles for new fields
function addNewFieldStyles() {
    if (document.getElementById('new-field-styles')) {
        return; // Already added
    }
    
    const style = document.createElement('style');
    style.id = 'new-field-styles';
    style.textContent = `
        .field.new-field {
            background-color: #e8f5e8;
            border-left: 3px solid #4caf50;
            position: relative;
        }
        
        .field.new-field::after {
            content: 'NEW';
            position: absolute;
            top: -8px;
            right: -8px;
            background: #4caf50;
            color: white;
            font-size: 10px;
            padding: 2px 4px;
            border-radius: 2px;
            font-weight: bold;
        }
        
        .field.new-field:hover {
            background-color: #d4edda;
        }
    `;
    
    document.head.appendChild(style);
}

// Initialize schema comparison on page load or when app initializes
async function initializeSchemaComparison() {
    console.log('Initializing schema comparison...');
    try {
        await compareSchemas();
        console.log('Schema comparison initialized successfully');
    } catch (error) {
        console.error('Failed to initialize schema comparison:', error);
    }
}

// Export functions for external use in your app
window.SchemaComparison = {
    // Core comparison functions
    compareSchemas,
    loadReferenceSchema,
    createPauschaleItem,
    populatePauschaleItems,
    runSchemaFieldCheck,
    initializeSchemaComparison,
    updateDataConfigs,
    
    // ObjectSchema utility functions
    getObjectSchema,
    setObjectSchema,
    getNewFieldsFromObjectSchema,
    isFieldNew,
    getAllFieldsFromObjectSchema,
    getObjectSchemaStats,
    getObjectTypesWithNewFields,
    getNewFieldsSummary,
    
    // Legacy support
    CustomObjectNames,
    GetSchema
};

// Integration function to run schema field check within your app
async function runSchemaFieldCheck() {
    try {
        console.log('Running schema field check integration...');
        
        // Compare schemas and detect new fields
        const newFields = await compareSchemas();
        
        // Create analysis object
        const analysis = {
            hasNewFields: Object.keys(newFields).length > 0,
            totalNewFields: Object.values(newFields).reduce((total, fields) => total + fields.length, 0),
            newFieldsBySchema: newFields,
            customObjectNames: { ...CustomObjectNames }
        };
        
        // If new fields detected, update your DATA_CONFIGS
        if (analysis.hasNewFields) {
            updateDataConfigs(newFields);
        }
        
        return analysis;
        
    } catch (error) {
        console.error('Error in schema field check:', error);
        return {
            hasNewFields: false,
            totalNewFields: 0,
            error: error.message
        };
    }
}

// Auto-initialize when appState.client is available (integrates with your app flow)
if (typeof window !== 'undefined') {
    const checkForClient = () => {
        if (window.appState && window.appState.client && window.appState.isInitialized) {
            console.log('AppState client detected, initializing schema comparison...');
            initializeSchemaComparison();
        } else {
            // Check again in 1 second if client not ready
            setTimeout(checkForClient, 1000);
        }
    };
    
    // Start checking for client availability
    checkForClient();
}