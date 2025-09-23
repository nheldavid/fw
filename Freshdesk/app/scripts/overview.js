document.addEventListener("DOMContentLoaded", async function() {
  try {
    // Initialize the app and get client
    const client = await app.initialized();
    appState.client = client;

    // Get context and ticket data in parallel
    const [context, ticketData] = await Promise.all([
      client.instance.context(),
      client.data.get('ticket').catch(err => {
        console.warn('Could not fetch ticket data:', err);
        return { ticket: null };
      })
    ]);

    const contextData = context.data;
    appState.currentTicket = ticketData.ticket;

    await loadAndProcessNewFieldsData(contextData.schemaResult.newFields);

    // Render UI based on context
    //renderUI(contextData);

    renderUIWithDynamicFields(contextData, contextData.schemaResult.newFields);


    // NEW: Render dynamic fields after main UI
    renderDynamicFieldsFromJSON(contextData);

    console.log('new fields in overview:', contextData.schemaResult.newFields);
    
    // Extract custom object data with context information
    //await extractCustomObjectData(contextData);

  } catch (error) {
    console.error('App initialization failed:', error);
    //showErrorMessage('Failed to initialize application. Please refresh the page.');
  }
});

/**
 * Load and process your specific JSON data structure
 */
async function loadAndProcessNewFieldsData(newFieldsData) {
  try {

    // Store in appState for later use
    window.appState.detectedNewFields = newFieldsData;
    
    // Process and insert dynamic elements immediately
    insertDynamicElementsFromJSON(newFieldsData);
    
    console.log('Loaded new fields data:', Object.keys(newFieldsData));
    
  } catch (error) {
    console.error('Error loading new fields data:', error);
  }
}

/**
 * Insert dynamic elements based on your JSON structure
 * @param {Object} newFieldsData - Your JSON data structure
 */
function insertDynamicElementsFromJSON(newFieldsData) {
  const insertionPoints = {
    'Empfänger': '.empf-insertion-point',
    'Ausführung': '.ausf-insertion-point',
    'Auftraggeber': '.auftraggeber-insertion-point',
    'Auftragsstatus': '.auftragsstatus-insertion-point',
    'Warenkorb': '.warenkorb-insertion-point',
    'Vermittler': '.vermittler-insertion-point'
  };

  Object.entries(newFieldsData).forEach(([schemaName, schemaData]) => {
    const containerSelector = insertionPoints[schemaName];
    const container = document.querySelector(containerSelector);
    
    if (container && schemaData.newFields && schemaData.newFields.length > 0) {
      const dynamicHTML = generateHTMLFromJSONFields(schemaName, schemaData.newFields);
      container.innerHTML = dynamicHTML;
      console.log(`Added ${schemaData.newFields.length} new fields for ${schemaName}`);
    } else if (!container) {
      console.warn(`Container not found for ${schemaName}: ${containerSelector}`);
    }
  });
}

/**
 * Generate HTML from your JSON field structure
 * @param {string} schemaName - Name of the schema
 * @param {Array} newFields - Array of new fields from your JSON
 * @returns {string} HTML string
 */
function generateHTMLFromJSONFields(schemaName, newFields) {
  // let html = `<!-- Dynamic fields for ${schemaName} -->\n`;
  
  // // Add a visual separator
  // html += '<div class="dynamic-fields-separator">\n';
  // html += '  <hr style="border: 1px dashed #ccc; margin: 10px 0;">\n';
  // html += `  <div class="dynamic-section-title">Neue Felder - ${schemaName}</div>\n`;
  // html += '</div>\n';
  
  let html = '';
  // Group fields for better layout (2 fields per row, matching your existing pattern)
  for (let i = 0; i < newFields.length; i += 2) {
    const field1 = newFields[i];
    const field2 = newFields[i + 1];
    
    // Labels row
    html += '<div class="row">\n';
    html += `  <span class="label field-m">${field1.label || field1.name}:</span>\n`;
    if (field2) {
      html += `  <span class="label field-m">${field2.label || field2.name}:</span>\n`;
    }
    html += '</div>\n';
    
    // Values row
    html += '<div class="row">\n';
    
    // First field value
    const fieldId1 = `dynamic-${schemaName.toLowerCase().replace(/[äüöß]/g, c => ({ä:'ae',ü:'ue',ö:'oe',ß:'ss'}[c]))}-${field1.name}`;
    html += `  <span class="field field-m dynamic-field-value" id="${fieldId1}" data-field-name="${field1.name}" data-schema="${schemaName}">Wird geladen...</span>\n`;
    
    // Second field value (if exists)
    if (field2) {
      const fieldId2 = `dynamic-${schemaName.toLowerCase().replace(/[äüöß]/g, c => ({ä:'ae',ü:'ue',ö:'oe',ß:'ss'}[c]))}-${field2.name}`;
      html += `  <span class="field field-m dynamic-field-value" id="${fieldId2}" data-field-name="${field2.name}" data-schema="${schemaName}">Wird geladen...</span>\n`;
    }
    
    html += '</div>\n';
  }
  
  return html;
}

/**
 * Render dynamic fields with actual data from context
 * @param {Object} contextData - Context data from modal
 */
function renderDynamicFieldsFromJSON(contextData) {
  const newFieldsData = window.appState.detectedNewFields;
  
  if (!newFieldsData) {
    console.warn('No new fields data available for rendering');
    return;
  }
  
  Object.entries(newFieldsData).forEach(([schemaName, schemaData]) => {
    if (!schemaData.newFields || schemaData.newFields.length === 0) {
      return;
    }
    
    // Get raw data for this schema from context
    const schemaRawData = getSchemaDataFromContext(contextData, schemaName);
    
    if (schemaRawData) {
      updateDynamicFieldValuesFromJSON(schemaName, schemaData.newFields, schemaRawData);
    } else {
      console.warn(`No data found in context for schema: ${schemaName}`);
      // Set placeholder values for missing data
      setPlaceholderValuesForSchema(schemaName, schemaData.newFields);
    }
  });
}

/**
 * Get schema data from context for specific schema
 * @param {Object} contextData - Context data
 * @param {string} schemaName - Name of the schema
 * @returns {Object|null} Schema data or null
 */
function getSchemaDataFromContext(contextData, schemaName) {
  const schemaMap = {
    'Empfänger': contextData.empfaenger,
    'Ausführung': contextData.ausfuehrung,
    'Auftraggeber': contextData.auftraggeber,
    'Auftragsstatus': contextData.auftragsstatus,
    'Warenkorb': contextData.warenkorb,
    'Vermittler': contextData.vermittler
  };
  
  return schemaMap[schemaName] || null;
}

/**
 * Update dynamic field values using your JSON structure
 * @param {string} schemaName - Name of the schema
 * @param {Array} newFields - Array of new field objects from JSON
 * @param {Object} schemaRawData - Raw data for this schema
 */
function updateDynamicFieldValuesFromJSON(schemaName, newFields, schemaRawData) {
  newFields.forEach(field => {
    const fieldId = `dynamic-${schemaName.toLowerCase().replace(/[äüöß]/g, c => ({ä:'ae',ü:'ue',ö:'oe',ß:'ss'}[c]))}-${field.name}`;
    const element = document.getElementById(fieldId);
    
    if (element) {
      let fieldValue = schemaRawData[field.name];
      
      if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
        // Use your existing formatValue function
        const formattedValue = formatValue(fieldValue, field.name.toLowerCase(), fieldId);
        element.innerHTML = formattedValue;
        element.classList.add('has-value');
      } else {
        element.innerHTML = '<em>Nicht verfügbar</em>';
        element.classList.add('no-value');
      }
    }
  });
}

/**
 * Set placeholder values when schema data is not available
 * @param {string} schemaName - Name of the schema
 * @param {Array} newFields - Array of new field objects
 */
function setPlaceholderValuesForSchema(schemaName, newFields) {
  newFields.forEach(field => {
    const fieldId = `dynamic-${schemaName.toLowerCase().replace(/[äüöß]/g, c => ({ä:'ae',ü:'ue',ö:'oe',ß:'ss'}[c]))}-${field.name}`;
    const element = document.getElementById(fieldId);
    
    if (element) {
      element.innerHTML = '<em>Daten nicht geladen</em>';
      element.classList.add('no-data');
    }
  });
}

/**
 * Load JSON file specifically for your new fields data
 * @param {string} filePath - Path to your JSON file
 * @returns {Promise<Object>} Your new fields JSON data
 */
async function loadNewFieldsJSON(filePath) {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Loaded new fields JSON:', data);
    return data;
  } catch (error) {
    console.error("Error loading new fields JSON:", error);
    return null;
  }
}

function renderUI(context) {
  
  renderAuftragsstatus(context);
  renderAusfuehrung(context);
  renderEmpfaenger(context);
  renderWarenkorb(context);


  populatePositionenItems(context.modalData.warenkorbPositionen);
  populateGutscheinItems(context.modalData.gutscheine);
  populatePauschaleItems(context.modalData.kopfpauschalen);
  populateOTItems(context.modalData.ot);

  // Additional rendering functions can be called here

}

/**
 * Renders Auftragsstatus section
 * @param {Object} contextData - The context data
 */
function renderAuftragsstatus(contextData) {
  const fields = [
    'bestelldatum',
    'vertriebsweg', 
    'status',
    'freitext',
    // 'molliwert',
    // 'erfassdatum',
    // 'rechnungsnummer',
    'trackingnummer'
  ];

  fields.forEach(field => {
    updateElement(field, contextData.auftragsstatus[field]);
  });

  // Store context data in appState for overview
  if (!appState.customObjectData.auftragsstatus) {
    appState.customObjectData.auftragsstatus = {};
  }
  
  fields.forEach(field => {
    appState.customObjectData.auftragsstatus[field] = contextData[field] || '';
  });
}

/**
 * Renders Ausführung section
 * @param {Object} contextData - The context data
 */
function renderAusfuehrung(contextData) {
  const fieldMappings = {
    'ausfuehrender': 'ausfuehrender',
    'ausfuehrung-anrede': 'anrede',
    'ausfuehrung-name1': 'name1',
    'ausfuehrung-name2': 'name2',
    'ausfuehrung-name3': 'name3',
    'ausfuehrung-strasse': 'strasse',
    'ausfuehrung-land': 'land',
    'ausfuehrung-plz': 'plz',
    'ausfuehrung-ort': 'ort',
    'ausfuehrung-rang': 'rang',
    'ausfuehrung-fax': 'fax',
    'ausfuehrung-telefon': 'telefon',
    'ausfuehrung-email': 'email',
    'auftragshinweis': 'auftragshinweis',
    'hinweis': 'hinweis'
  };

  Object.entries(fieldMappings).forEach(([elementId, dataKey]) => {
    updateElement(elementId, contextData.ausfuehrung[dataKey]);
  });
}

/**
 * Renders Empfänger section
 * @param {Object} contextData - The context data
 */
function renderEmpfaenger(contextData) {
  const fieldMappings = {
    'empf-anrede': 'anrede',
    'empf-name1': 'name1',
    'empf-name2': 'name2',
    'empf-name3': 'name3',
    'empf-strasse': 'strasse',
    'empf-land': 'land',
    'empf-ort': 'ort',
    'empf-region': 'region',
    'empf-telefon': 'telefon',
  };

  Object.entries(fieldMappings).forEach(([elementId, dataKey]) => {
    updateElement(elementId, contextData.empfaenger[dataKey]);
  });
}

/**
 * Renders Auftraggeber section
 * @param {Object} contextData - The context data
 */
function renderAuftraggeber(contextData) {
  const fieldMappings = {
    'auftraggeber-name': 'name',
    'auftraggeber-firmenzusatz': 'firmenzusatz', 
    'auftraggeber-addresse': 'addresse',
    'auftraggeber-telefon': 'telefon',
    'auftraggeber-email': 'email'
  };

  Object.entries(fieldMappings).forEach(([elementId, dataKey]) => {
    updateElement(elementId, contextData[dataKey]);
  });
}

/**
 * Renders Vermittler section
 * @param {Object} contextData - The context data
 */
function renderVermittler(contextData) {
  const fieldMappings = {
    'vermittler-nummer': 'vermittler',
    'vermittler-aktiv': 'active',
    'vermittler-typ': 'typ',
    'vermittler-name': 'name',
    'vermittler-addresse': 'addresse',
    'vermittler-fax': 'fax',
    'vermittler-telefon' : 'telefon'
  };
  Object.entries(fieldMappings).forEach(([elementId, dataKey]) => {
    updateElement(elementId, contextData[dataKey]);
  });
}

/**
 * Renders Warenkorb section
 * @param {Object} contextData - The context data
 */
function renderWarenkorb(contextData) {
  const fieldMappings = {
    // 'warenkorb-auftragsnummer': 'auftragsnummer',
    // 'warenkorb-bestellnummer': 'bestellnummer',
    'lieferdatum': 'lieferdatum',
    'zahlbetrag': 'zahlbetrag',
    // 'v_zuk_bas': 'v_zuk_bas',
    // 'v_zuk_exp': 'v_zuk_exp',
    // 'v_zuk_son': 'v_zuk_son',
    // 'a_zuk_bas': 'a_zuk_bas',
    // 'a_zuk_exp': 'a_zuk_exp',
    // 'a_zuk_son': 'a_zuk_son',
    'kartenart': 'kartenart',
    'kartentext': 'kartentext'
  };

  Object.entries(fieldMappings).forEach(([elementId, dataKey]) => {
    updateElement(elementId, contextData.warenkorb[dataKey]);
  });
}

function updateElement(elementId, value) {
  const el = document.getElementById(elementId);
  if (!el) {
    console.warn(`Element with ID '${elementId}' not found`);
    return;
  }
  el.innerHTML = formatValue(value, elementId);
}

/**
 * Context-aware custom data extraction wrapper
//  * @param {string} contextTitle - The context title
 * @param {Object} contextData - The context data
 */
async function extractCustomObjectData(contextData) {
  try {

    handleAuftragsstatusData(contextData);
    await handleWarenkorbData(contextData);

  } catch (error) {
    console.error(`Error extracting custom data for context '${contextTitle}':`, error);
  }
}

/**
 * Handle custom data extraction for Auftragsstatus context
 * @param {Object} contextData - The context data
 */
async function handleAuftragsstatusData(contextData) {
  console.log('Processing Auftragsstatus custom data:', contextData);
  
  // Execute the original custom data extraction for Auftragsstatus
  console.log('Extracting custom object data...');

  const [ot, gutscheine, kopfpauschalen] = await Promise.all([
    getOTtable(),
    getGutscheineTable(),
    getKopfpauschalenTable()
  ]);

  console.log('OT Data:', ot);
  console.log('Gutscheine Data:', gutscheine);
  console.log('Kopfpauschalen Data:', kopfpauschalen);

  // Display data in the UI
  //updateElement('Klassik-OT-tableBody', generateTableHTML(ot));
  //updateElement('gtschn_tableBody', generateTableHTML(gutscheine));
  //updateElement('kopf_ps_tableBody', generateTableHTML(kopfpauschalen));

  populateOTItems (ot);
  populateGutscheinItems (gutscheine);
  populatePauschaleItems (kopfpauschalen);  
}

/**
 * Handle custom data extraction for Warenkorb context
 * @param {Object} contextData - The context data
 */
async function handleWarenkorbData(contextData) {
  console.log('Processing Warenkorb custom data:', contextData);
  
  // Execute custom data extraction for Warenkorb if needed
  // For now, you can add Warenkorb-specific custom object extraction here
  try {
    const warenkorbData = await getWarenkorbPosTable();
    console.log('Warenkorb Data:', warenkorbData);
    
    // Display warenkorb-specific data in the UI if you have table elements for it
    //updateElement('warenkorb-pos-tableBody', generateTableHTML(warenkorbData));

    populatePositionenItems (warenkorbData);
  } catch (error) {
    console.error('Error processing Warenkorb custom data:', error);
  }
}

// Enhanced create functions with dynamic field support

/**
 * Enhanced function to create OT item with dynamic fields
 * @param {Object} data - OT data object
 * @param {Array} dynamicFields - Array of new fields detected for OT schema
 * @returns {string} HTML string for OT item
 */
function createOTItem(data, dynamicFields = []) {
  // Convert string values to boolean if needed
  const isStorniert = data.storniert === true || data.storniert === 'true' || data.storniert === 'Ja' || data.storniert === '1';

  let html = `
    <div class="blue-bg">
      <div class="row">
        <span class="label field-m">Ereignis:</span>
        <span class="label field-m">Bezeichnung:</span>
        <span class="label field-l">Erfasst:</span>
        <span class="label field-m">Erfasser:</span>
      </div>

      <div class="row">
        <span class="field field-m">${data.ereignis || ''}</span>
        <span class="field field-m">${data.text || ''}</span>
        <span class="field field-m">${data.storno_datum || ''}</span>
        <span class="field field-m">${data.storno_uhrzeit || ''}</span>
        <span class="field field-m">${data.erfasser || ''}</span>
      </div>
      
      <div class="row">
        <span class="label">Karte hinterlassen?</span>
        <span class="label" style="margin-left: 5px;">Klärung?</span>
        <span class="label" style="margin-left: 140px;">Herkunft:</span>
      </div>

      <div class="row">
        <span class="field field-xs red-border"></span>
        <span class="field field-m red-border" style="margin-left: 42px;"></span>
        <span class="field field-m red-border" style="margin-left: 87px;"></span>
      </div>
      
      <div class="row">
        <span class="label field-m">Anrufergebnis:</span>
        <span class="label">Ergänzende Angabe:</span>
      </div>
      
      <div class="row">
        <span class="field field-s">${data.ergebnis || ''}</span>
        <span class="field field-l red-border"></span>
      </div>
      
      <div class="row">
        <span class="field field-m">${data.name || ''}</span>
        <span class="field field-m">${data.plz || ''}</span>
        <span class="field field-m">${data.ort || ''}</span>
        <span class="field field-m">${data.ortsteil || ''}</span>
      </div>

      <div class="row">
        <span class="label">Bemerkung:</span>
      </div>

      <div class="row">
        <span class="field field-full red-border"></span>
      </div>

      <div class="row">
        <span class="label">Abweichung der Ware:</span>
      </div>

      <div class="row">
        <span class="field field-full red-border"></span>
      </div>
      
      <div class="row">
        <span class="label">Widerruf?</span>
      </div>

      <div class="row">
        <span class="field field-m">${isStorniert ? 'Ja' : 'Nein'}</span>
      </div>`;

  // Add dynamic fields if any exist
  if (dynamicFields && dynamicFields.length > 0) {
    html += generateDynamicFieldsHTML('ot', dynamicFields, data);
  }

  html += `</div>`;
  return html;
}

/**
 * Enhanced function to create Gutschein item with dynamic fields
 * @param {Object} data - Gutschein data object
 * @param {Array} dynamicFields - Array of new fields detected for Gutscheine schema
 * @returns {string} HTML string for Gutschein item
 */
function createGutscheinItem(data, dynamicFields = []) {
  let html = `
    <div class="pink-bg">
      <div class="row">
        <span class="label field-m">Gutscheinnummer:</span>
        <span class="label" style="margin-left: 10px;">Wert:</span>
      </div>

      <div class="row">
        <span class="field field-m">${data.kartennummer || ''}</span>
        <span class="field field-m">${formatValue(data.wert, 'wert')}</span>
      </div>
      
      <div class="row">
        <span class="label">Datum und Zeit der Einlösung:</span>
      </div>
      
      <div class="row">
        <span class="field field-m">${formatValue(data.einlsedatum, 'datum')}</span>
        <span class="field field-m">${data.einlsezeit || ''}</span>
      </div>`;

  // Add dynamic fields if any exist
  if (dynamicFields && dynamicFields.length > 0) {
    html += generateDynamicFieldsHTML('gutscheine', dynamicFields, data);
  }

  html += `</div>`;
  return html;
}

/**
 * Enhanced function to create Pauschale item with dynamic fields
 * @param {Object} data - Pauschale data object
 * @param {Array} dynamicFields - Array of new fields detected for Kopfpauschalen schema
 * @returns {string} HTML string for Pauschale item
 */
function createPauschaleItem(data, dynamicFields = []) {
  let html = `
    <div class="pauschale-item">
      <div class="row">
        <span class="field field-m">${data.konditionstext || ''}</span>
        <span class="field field-m">${formatValue(data.betrag, 'betrag')}</span>
      </div>`;

  // Add dynamic fields if any exist
  if (dynamicFields && dynamicFields.length > 0) {
    html += generateDynamicFieldsHTML('kopfpauschalen', dynamicFields, data);
  }

  html += `</div>`;
  return html;
}

/**
 * Enhanced function to create Positionen item with dynamic fields
 * @param {Object} data - Position data object
 * @param {Array} dynamicFields - Array of new fields detected for Warenkorb_Positionen schema
 * @returns {string} HTML string for Position item
 */
function createPositionenItem(data, dynamicFields = []) {
  let html = `
  <div class="green-line gray-bg">
    <div class="row">
      <span class="label field-m">Position:</span>
      <span class="label field-m">Material:</span>
      <span class="label field-m">Bezeichnung:</span>
      <span class="label field-s">Menge:</span>
    </div>

    <div class="row">
      <span class="field field-m">${data.position || ''}</span>
      <span class="field field-m">${data.material || ''}</span>
      <span class="field field-m">${data.material_id || data.bezeichnung || ''}</span>
      <span class="field field-s">${formatValue(data.menge, 'menge')}</span>
    </div>
    
    <div class="row">
      <span class="label field-m" style="margin-left: 93px;">Preis brutto:</span>
      <span class="label field-m">Steuer:</span>
      <span class="label field-m">Größe:</span>
    </div>

    <div class="row">
      <span class="field field-m" style="margin-left: 93px;">${formatValue(data.preis_brutto, 'preis_brutto')}</span>
      <span class="field field-s">${formatValue(data.steuer, 'steuer')}</span>
      <span class="field field-m">${data.variante || ''}</span>
    </div>
    
    <div class="row">
      <span class="label" style="margin-left: 93px;">Artikelbeschreibung:</span>
    </div>
    <div class="row">
      <span class="field field-full red-border" style="margin-left: 93px;">${data.blumengrusstext || ''}</span>
    </div>`;

  // Add dynamic fields if any exist
  if (dynamicFields && dynamicFields.length > 0) {
    html += generateDynamicFieldsHTML('warenkorbPositionen', dynamicFields, data);
  }

  html += `</div>`;
  return html;
}

/**
 * Generate HTML for dynamic fields within item containers
 * @param {string} schemaType - Type of schema (ot, gutscheine, etc.)
 * @param {Array} dynamicFields - Array of dynamic field objects
 * @param {Object} data - Data object containing field values
 * @returns {string} HTML string for dynamic fields
 */
function generateDynamicFieldsHTML(schemaType, dynamicFields, data) {
  if (!dynamicFields || dynamicFields.length === 0) {
    return '';
  }

  // let html = `
  //   <div class="dynamic-fields-section">
  //     <div class="row">
  //       <span class="label dynamic-fields-title">Neue Felder:</span>
  //     </div>`;

  let html = '<div class="dynamic-fields-section">';
  
  // Group fields in pairs for consistent layout
  for (let i = 0; i < dynamicFields.length; i += 2) {
    const field1 = dynamicFields[i];
    const field2 = dynamicFields[i + 1];

    // Labels row
    html += '<div class="row">';
    html += `<span class="label field-m dynamic-field-label">${field1.label || field1.name}:</span>`;
    if (field2) {
      html += `<span class="label field-m dynamic-field-label">${field2.label || field2.name}:</span>`;
    }
    html += '</div>';

    // Values row
    html += '<div class="row">';
    
    // First field value
    const value1 = data[field1.name];
    const formattedValue1 = formatValue(value1, field1.name.toLowerCase());
    html += `<span class="field field-m dynamic-field-value" data-field-name="${field1.name}" data-schema-type="${schemaType}">${formattedValue1}</span>`;
    
    // Second field value (if exists)
    if (field2) {
      const value2 = data[field2.name];
      const formattedValue2 = formatValue(value2, field2.name.toLowerCase());
      html += `<span class="field field-m dynamic-field-value" data-field-name="${field2.name}" data-schema-type="${schemaType}">${formattedValue2}</span>`;
    }
    
    html += '</div>';
  }

  html += '</div>';
  return html;
}

/**
 * Enhanced populate functions that pass dynamic fields to create functions
 */

// Enhanced populate OT items with dynamic fields support
function populateOTItems(otDataArray, dynamicFields = []) {
  const container = document.querySelector('.ot-items-container');
  if (!container) {
    console.warn('OT items container not found');
    return;
  }

  const html = otDataArray.map((item) => createOTItem(item, dynamicFields)).join('');
  container.innerHTML = html;
  
  if (dynamicFields.length > 0) {
    console.log(`OT items populated with ${dynamicFields.length} dynamic fields`);
  }
}

// Enhanced populate gutscheine items with dynamic fields support
function populateGutscheinItems(gutscheinDataArray, dynamicFields = []) {
  const container = document.querySelector('.guts-items-container');
  if (!container) {
    console.warn('Gutschein items container not found');
    return;
  }

  const html = gutscheinDataArray.map((item) => createGutscheinItem(item, dynamicFields)).join('');
  container.innerHTML = html;
  
  if (dynamicFields.length > 0) {
    console.log(`Gutschein items populated with ${dynamicFields.length} dynamic fields`);
  }
}

// Enhanced populate pauschale items with dynamic fields support
function populatePauschaleItems(pauschaleDataArray, dynamicFields = []) {
  const container = document.querySelector('.kopfpauschalen-items-container');
  if (!container) {
    console.warn('Pauschale items container not found');
    return;
  }

  const html = pauschaleDataArray.map((item) => createPauschaleItem(item, dynamicFields)).join('');
  container.innerHTML = html;
  
  if (dynamicFields.length > 0) {
    console.log(`Pauschale items populated with ${dynamicFields.length} dynamic fields`);
  }
}

// Enhanced populate positionen items with dynamic fields support
function populatePositionenItems(positionenDataArray, dynamicFields = []) {
  const container = document.querySelector('.positionen-items-container');
  if (!container) {
    console.warn('Positionen items container not found');
    return;
  }

  const html = positionenDataArray.map((item) => createPositionenItem(item, dynamicFields)).join('');
  container.innerHTML = html;
  
  if (dynamicFields.length > 0) {
    console.log(`Positionen items populated with ${dynamicFields.length} dynamic fields`);
  }
}

/**
 * Master function to populate all items with their respective dynamic fields
 * @param {Object} contextData - Context data containing all arrays
 * @param {Object} dynamicFieldsData - Your JSON structure with detected new fields
 */
function populateAllItemsWithDynamicFields(contextData, dynamicFieldsData = {}) {
  // Get dynamic fields for each schema type
  const otDynamicFields = getDynamicFieldsForSchema(dynamicFieldsData, 'Auftragsstatus_KLASSIK_OT') || [];
  const gutscheinDynamicFields = getDynamicFieldsForSchema(dynamicFieldsData, 'Auftragsstatus_KLASSIK_GTSCHN') || [];
  const pauschalnDynamicFields = getDynamicFieldsForSchema(dynamicFieldsData, 'Auftragsstatus_KLASSIK_KOPF_PS') || [];
  const positionenDynamicFields = getDynamicFieldsForSchema(dynamicFieldsData, 'Warenkorb_Positionen') || [];

  // Populate each type with dynamic fields
  if (contextData.modalData) {
    populateOTItems(contextData.modalData.ot || [], otDynamicFields);
    populateGutscheinItems(contextData.modalData.gutscheine || [], gutscheinDynamicFields);
    populatePauschaleItems(contextData.modalData.kopfpauschalen || [], pauschalnDynamicFields);
    populatePositionenItems(contextData.modalData.warenkorbPositionen || [], positionenDynamicFields);
  }
}

/**
 * Helper function to get dynamic fields for a specific schema from your JSON structure
 * @param {Object} dynamicFieldsData - Your JSON structure
 * @param {string} schemaName - Name of the schema to get fields for
 * @returns {Array} Array of new fields for the schema
 */
function getDynamicFieldsForSchema(dynamicFieldsData, schemaName) {
  if (!dynamicFieldsData || !dynamicFieldsData[schemaName]) {
    return [];
  }

  const schemaData = dynamicFieldsData[schemaName];
  
  if (schemaData.type === 'new_fields' && schemaData.newFields) {
    return schemaData.newFields;
  } else if (schemaData.type === 'new_schema' && schemaData.fields) {
    return schemaData.fields;
  }
  
  return [];
}

/**
 * Update your renderUI function to use the enhanced populate functions
 */
function renderUIWithDynamicFields(contextData, dynamicFieldsData = {}) {
  // Render basic sections first
  renderAuftragsstatus(contextData);
  renderAusfuehrung(contextData);
  renderEmpfaenger(contextData);
  renderWarenkorb(contextData);

  // Populate items with dynamic fields support
  populateAllItemsWithDynamicFields(contextData, dynamicFieldsData);
}