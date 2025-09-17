/**
 * Schema Field Comparison and Dynamic UI Update System
 * Compares API result fields against schema definition and updates overview UI
 */

/**
 * Main function to check for new fields and update the overview
 * @param {Object} apiResult - The simplified_result.json data
 * @param {Object} schemaData - The schema.json data
 * @param {boolean} updateUI - Whether to automatically update the UI (default: true)
 * @returns {Object} Analysis result with new fields and UI updates
 */
async function checkAndUpdateSchemaFields(apiResult, schemaData, updateUI = true) {
    try {
        console.log('Starting schema field comparison...');
        
        // Perform the comparison
        const analysis = compareSchemaFields(apiResult, schemaData);
        
        // Log the results
        logAnalysisResults(analysis);
        
        // Update UI if requested and new fields are found
        if (updateUI && analysis.hasNewFields) {
            await updateOverviewWithNewFields(analysis.newFields);
        }
        
        // Update DATA_CONFIGS if new fields are found
        if (analysis.hasNewFields) {
            updateDataConfigs(analysis.newFields);
        }
        
        return analysis;
        
    } catch (error) {
        console.error('Error during schema field comparison:', error);
        return {
            success: false,
            error: error.message,
            hasNewFields: false,
            newFields: {},
            removedFields: {},
            schemaComparison: {}
        };
    }
}

/**
 * Compare fields between API result and schema definition
 * @param {Object} apiResult - The API result data structure
 * @param {Object} schemaData - The schema definition
 * @returns {Object} Detailed comparison analysis
 */
function compareSchemaFields(apiResult, schemaData) {
    const analysis = {
        success: true,
        hasNewFields: false,
        hasRemovedFields: false,
        newFields: {},
        removedFields: {},
        schemaComparison: {},
        totalNewFields: 0,
        totalRemovedFields: 0
    };
    
    // Ensure we have valid data structures
    if (!apiResult || !Array.isArray(apiResult)) {
        throw new Error('Invalid API result structure - expected array');
    }
    
    if (!schemaData || !schemaData.schemas || !Array.isArray(schemaData.schemas)) {
        throw new Error('Invalid schema data structure - expected schemas array');
    }
    
    // Create schema lookup map
    const schemaMap = createSchemaLookupMap(schemaData.schemas);
    
    // Compare each schema/table
    apiResult.forEach(apiSchema => {
        const schemaName = apiSchema.name;
        const apiFields = apiSchema.fields || [];
        const schemaDefinition = schemaMap[schemaName];
        
        if (!schemaDefinition) {
            console.warn(`Schema "${schemaName}" not found in schema definition`);
            analysis.schemaComparison[schemaName] = {
                status: 'not_in_schema',
                newFields: apiFields.map(f => f.name),
                removedFields: [],
                fieldCount: apiFields.length
            };
            return;
        }
        
        const schemaFields = schemaDefinition.fields || [];
        const comparison = compareFieldLists(apiFields, schemaFields, schemaName);
        
        analysis.schemaComparison[schemaName] = comparison;
        
        // Track new fields
        if (comparison.newFields.length > 0) {
            analysis.hasNewFields = true;
            analysis.newFields[schemaName] = comparison.newFields;
            analysis.totalNewFields += comparison.newFields.length;
        }
        
        // Track removed fields
        if (comparison.removedFields.length > 0) {
            analysis.hasRemovedFields = true;
            analysis.removedFields[schemaName] = comparison.removedFields;
            analysis.totalRemovedFields += comparison.removedFields.length;
        }
    });
    
    return analysis;
}

/**
 * Create a lookup map from schema array for efficient comparison
 * @param {Array} schemas - Array of schema definitions
 * @returns {Object} Map of schema name to schema object
 */
function createSchemaLookupMap(schemas) {
    const map = {};
    schemas.forEach(schema => {
        if (schema.name) {
            map[schema.name] = schema;
        }
    });
    return map;
}

/**
 * Compare field lists between API and schema
 * @param {Array} apiFields - Fields from API result
 * @param {Array} schemaFields - Fields from schema definition
 * @param {string} schemaName - Name of the schema being compared
 * @returns {Object} Comparison result
 */
function compareFieldLists(apiFields, schemaFields, schemaName) {
    // Create field name sets for comparison
    const apiFieldNames = new Set(apiFields.map(f => f.name));
    const schemaFieldNames = new Set(schemaFields.map(f => f.name));
    
    // Find new fields (in API but not in schema)
    const newFields = apiFields.filter(field => 
        !schemaFieldNames.has(field.name)
    ).map(field => ({
        name: field.name,
        label: field.label,
        schemaName: schemaName
    }));
    
    // Find removed fields (in schema but not in API)
    const removedFields = schemaFields.filter(field => 
        !apiFieldNames.has(field.name)
    ).map(field => ({
        name: field.name,
        label: field.label,
        schemaName: schemaName
    }));
    
    return {
        status: 'compared',
        newFields: newFields,
        removedFields: removedFields,
        totalApiFields: apiFields.length,
        totalSchemaFields: schemaFields.length,
        matchingFields: apiFields.filter(f => schemaFieldNames.has(f.name)).length
    };
}

/**
 * Log detailed analysis results
 * @param {Object} analysis - The analysis results
 */
function logAnalysisResults(analysis) {
    console.log('=== SCHEMA FIELD ANALYSIS RESULTS ===');
    
    if (analysis.hasNewFields) {
        console.log(`🆕 Found ${analysis.totalNewFields} new fields across ${Object.keys(analysis.newFields).length} schemas:`);
        Object.entries(analysis.newFields).forEach(([schemaName, fields]) => {
            console.log(`  📋 ${schemaName}:`, fields.map(f => f.name));
        });
    } else {
        console.log('✅ No new fields detected');
    }
    
    if (analysis.hasRemovedFields) {
        console.log(`🗑️ Found ${analysis.totalRemovedFields} removed fields across ${Object.keys(analysis.removedFields).length} schemas:`);
        Object.entries(analysis.removedFields).forEach(([schemaName, fields]) => {
            console.log(`  📋 ${schemaName}:`, fields.map(f => f.name));
        });
    } else {
        console.log('✅ No removed fields detected');
    }
    
    // Detailed schema comparison
    console.log('\n=== DETAILED SCHEMA COMPARISON ===');
    Object.entries(analysis.schemaComparison).forEach(([schemaName, comparison]) => {
        console.log(`📋 ${schemaName}:`);
        console.log(`  API Fields: ${comparison.totalApiFields || 'N/A'}`);
        console.log(`  Schema Fields: ${comparison.totalSchemaFields || 'N/A'}`);
        console.log(`  Matching: ${comparison.matchingFields || 'N/A'}`);
        console.log(`  New: ${comparison.newFields?.length || 0}`);
        console.log(`  Removed: ${comparison.removedFields?.length || 0}`);
    });
}

/**
 * Update the overview UI with new fields
 * @param {Object} newFields - Object containing new fields by schema
 */
async function updateOverviewWithNewFields(newFields) {
    console.log('Updating overview UI with new fields...');
    
    try {
        // Group new fields by their target sections in the overview
        const uiUpdates = categorizeFieldsForUI(newFields);
        
        // Apply UI updates for each section
        for (const [sectionName, fields] of Object.entries(uiUpdates)) {
            await updateOverviewSection(sectionName, fields);
        }
        
        console.log('✅ Overview UI updated successfully');
        
    } catch (error) {
        console.error('Error updating overview UI:', error);
        throw error;
    }
}

/**
 * Categorize new fields by their UI sections
 * @param {Object} newFields - New fields organized by schema
 * @returns {Object} Fields organized by UI section
 */
function categorizeFieldsForUI(newFields) {
    const uiSections = {
        auftragsstatus: [],
        ausfuehrung: [],
        empfaenger: [],
        auftraggeber: [],
        vermittler: [],
        warenkorb: [],
        modalData: {
            ot: [],
            gutscheine: [],
            kopfpauschalen: [],
            warenkorbPositionen: []
        }
    };
    
    // Map schema names to UI sections
    const schemaToSection = {
        'Auftragsstatus': 'auftragsstatus',
        'AusfÃ¼hrung': 'ausfuehrung',
        'EmpfÃ¤nger': 'empfaenger',
        'Auftraggeber': 'auftraggeber',
        'Vermittler': 'vermittler',
        'Warenkorb': 'warenkorb',
        'Auftragsstatus_KLASSIK_OT': 'modalData.ot',
        'Auftragsstatus_KLASSIK_GTSCHN': 'modalData.gutscheine',
        'Auftragsstatus_KLASSIK_KOPF_PS': 'modalData.kopfpauschalen',
        'Warenkorb_Positionen': 'modalData.warenkorbPositionen'
    };
    
    // Categorize fields
    Object.entries(newFields).forEach(([schemaName, fields]) => {
        const sectionPath = schemaToSection[schemaName];
        if (sectionPath) {
            if (sectionPath.startsWith('modalData.')) {
                const modalSection = sectionPath.split('.')[1];
                uiSections.modalData[modalSection].push(...fields);
            } else {
                uiSections[sectionPath].push(...fields);
            }
        } else {
            console.warn(`No UI section mapping found for schema: ${schemaName}`);
        }
    });
    
    return uiSections;
}

/**
 * Update a specific section of the overview with new fields
 * @param {string} sectionName - Name of the UI section
 * @param {Array} newFields - Array of new fields to add
 */
function updateOverviewSection(sectionName, newFields) {
    if (!newFields || newFields.length === 0) {
        return;
    }
    
    console.log(`Updating ${sectionName} section with ${newFields.length} new fields`);
    
    // Find the container for this section
    const container = findSectionContainer(sectionName);
    if (!container) {
        console.warn(`Container not found for section: ${sectionName}`);
        return;
    }
    
    // Create and append new field elements
    newFields.forEach(field => {
        const fieldElement = createFieldElement(field, sectionName);
        if (fieldElement) {
            container.appendChild(fieldElement);
        }
    });
    
    // Update any related styling or layout
    updateSectionStyling(container, sectionName);
}

/**
 * Find the DOM container for a specific section
 * @param {string} sectionName - Name of the section
 * @returns {Element|null} DOM container element
 */
function findSectionContainer(sectionName) {
    // Define container selectors for each section
    const containerSelectors = {
        'auftragsstatus': '.auftragsstatus-section, #auftragsstatus-container',
        'ausfuehrung': '.ausfuehrung-section, #ausfuehrung-container',
        'empfaenger': '.empfaenger-section, #empfaenger-container',
        'auftraggeber': '.auftraggeber-section, #auftraggeber-container',
        'vermittler': '.vermittler-section, #vermittler-container',
        'warenkorb': '.warenkorb-section, #warenkorb-container'
    };
    
    const selector = containerSelectors[sectionName];
    if (!selector) {
        return null;
    }
    
    // Try multiple selectors
    const selectors = selector.split(', ');
    for (const sel of selectors) {
        const element = document.querySelector(sel.trim());
        if (element) {
            return element;
        }
    }
    
    return null;
}

/**
 * Create a DOM element for a new field
 * @param {Object} field - Field definition
 * @param {string} sectionName - Section name for styling context
 * @returns {Element|null} Created DOM element
 */
function createFieldElement(field) {
    try {
        // Create a row container
        const row = document.createElement('div');
        row.className = 'row field-row new-field';
        row.setAttribute('data-field-name', field.name);
        row.setAttribute('data-schema', field.schemaName);
        
        // Create label
        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = `${field.label || field.name}:`;
        
        // Create field value container
        const value = document.createElement('span');
        value.className = 'field field-m';
        value.id = `new-field-${field.name}`;
        value.textContent = 'Nicht verfügbar'; // Default placeholder
        
        // Append elements
        row.appendChild(label);
        row.appendChild(value);
        
        // Add visual indicator for new fields
        row.style.border = '2px dashed #007bff';
        row.style.backgroundColor = '#f8f9fa';
        row.style.padding = '5px';
        row.style.margin = '2px 0';
        
        // Add tooltip
        row.title = `Neues Feld: ${field.name} (${field.schemaName})`;
        
        return row;
        
    } catch (error) {
        console.error(`Error creating field element for ${field.name}:`, error);
        return null;
    }
}

/**
 * Update styling for a section after adding new fields
 * @param {Element} container - The container element
 * @param {string} sectionName - Section name
 */
function updateSectionStyling(container) {
    // Add a class to indicate the section has new fields
    container.classList.add('has-new-fields');
    
    // Add a visual indicator
    if (!container.querySelector('.new-fields-indicator')) {
        const indicator = document.createElement('div');
        indicator.className = 'new-fields-indicator';
        indicator.innerHTML = '<small style="color: #007bff;">📋 Neue Felder hinzugefügt</small>';
        container.insertBefore(indicator, container.firstChild);
    }
}

/**
 * Update DATA_CONFIGS with new field mappings
 * @param {Object} newFields - New fields organized by schema
 */
function updateDataConfigs(newFields) {
    console.log('Updating DATA_CONFIGS with new fields...');
    
    Object.entries(newFields).forEach(([schemaName, fields]) => {
        const configKey = getConfigKeyForSchema(schemaName);
        if (configKey && DATA_CONFIGS[configKey]) {
            fields.forEach(field => {
                // Add simple field mapping (field name -> field name)
                DATA_CONFIGS[configKey][field.name] = field.name;
                console.log(`Added field mapping: ${configKey}.${field.name} -> ${field.name}`);
            });
        }
    });
    
    console.log('✅ DATA_CONFIGS updated');
}

/**
 * Get the DATA_CONFIGS key for a schema name
 * @param {string} schemaName - Schema name
 * @returns {string|null} Config key
 */
function getConfigKeyForSchema(schemaName) {
    const mapping = {
        'Auftragsstatus': 'auftragsstatus',
        'AusfÃ¼hrung': 'ausfuehrung',
        'EmpfÃ¤nger': 'empfaenger',
        'Auftraggeber': 'auftraggeber',
        'Vermittler': 'vermittler',
        'Warenkorb': 'warenkorb',
        'Auftragsstatus_KLASSIK_OT': 'ot',
        'Auftragsstatus_KLASSIK_GTSCHN': 'gutscheine',
        'Auftragsstatus_KLASSIK_KOPF_PS': 'kopfpauschalen',
        'Warenkorb_Positionen': 'warenkorbPositionen'
    };
    
    return mapping[schemaName] || null;
}

/**
 * Utility function to automatically run the check with loaded data
 * Call this function to run the comparison with your existing data
 */
async function runSchemaFieldCheck() {
    try {
        // You would load your actual data here
        // For demo purposes, using the document data structure
        const apiResult = [
            // This would be loaded from your simplified_result.json
            // For now, using a sample structure
        ];
        
        const schemaData = {
            // This would be loaded from your schema.json
            schemas: []
        };
        
        // Run the check
        const analysis = await checkAndUpdateSchemaFields(apiResult, schemaData);
        
        // Return results for further processing
        return analysis;
        
    } catch (error) {
        console.error('Error running schema field check:', error);
        return null;
    }
}

// Export the main functions for use in your application
if (typeof window !== 'undefined') {
    window.schemaFieldChecker = {
        checkAndUpdateSchemaFields,
        compareSchemaFields,
        updateOverviewWithNewFields,
        runSchemaFieldCheck
    };
}

// Example usage in your app - comparing API results against reference schema:
/*
// Simple usage - compares both uploaded files
document.addEventListener('DOMContentLoaded', async function() {
    const analysis = await runSchemaFieldCheck();
    
    if (analysis && analysis.hasNewFields) {
        console.log(`Found ${analysis.totalNewFields} new fields in API result!`);
        // UI has been automatically updated with new fields
        showNotification('Neue Felder in API erkannt und hinzugefügt!', 'info');
    }
});

// Comprehensive check with detailed logging
document.addEventListener('DOMContentLoaded', async function() {
    const analysis = await runComprehensiveSchemaCheck(true, true);
    
    if (analysis && analysis.success) {
        if (analysis.hasNewFields) {
            console.log(`New fields detected that weren't in reference schema`);
        }
        if (analysis.hasRemovedFields) {
            console.log(`Some reference fields are missing from current API`);
        }
    }
});

// Integration with your existing data extraction:
async function extractAllCustomObjectData() {
    // ... your existing extraction code ...
    
    // After extraction, check for schema changes against reference
    try {
        const analysis = await runSchemaFieldCheck();
        
        if (analysis.hasNewFields) {
            console.log(`Found ${analysis.totalNewFields} new API fields - UI updated`);
            
            // Optionally notify development team
            if (analysis.totalNewFields > 5) {
                console.warn('Significant schema changes detected - review needed');
            }
        }
    } catch (error) {
        console.warn('Schema field check failed:', error);
    }
}

// Check specific schemas only
const specificCheck = await runSelectiveSchemaCheck(['Auftragsstatus', 'Warenkorb']);
*/