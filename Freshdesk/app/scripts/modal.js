const CUSTOM_OBJECTS = {
    ot: 'Auftragsstatus_KLASSIK_OT',
    gutscheine: 'Auftragsstatus_KLASSIK_GTSCHN',
    kopfpauschalen: 'Auftragsstatus_KLASSIK_KOPF_PS',
    warenkorb: 'Warenkorb_Positionen'
}

const DATA_CONFIGS = {
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
        //storno_uhrzeit: "storno_uhrzeit",
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
    warenkorb: 
    {
      //auftragsnummer: 'auftragsnummer',
      position: 'position',
      material: 'material',
      menge: 'menge',
      preis_brutto: 'preis_brutto',
      steuer: 'steuer',
      kurztext: 'kurztext',
      kartenart: 'kartenart',
      variante: 'variante'
    }
}

// Missing CONTEXT_CONFIG definition
const CONTEXT_CONFIG = {
    "Auftragsstatus": {
        sectionId: "auftragsstatus-div",
        fields: [
            'bestelldatum',
            'vertriebsweg', 
            'auftragsstatus',
            'freitext',
            'molliwert',
            'erfassdatum',
            'rechnungsnummer',
            'trackingnummer'
        ],
        customDataHandler: true
    },
    "Warenkorb": {
        sectionId: "warenkorb-div",
        fields: [
            'auftragsnummer',
            'bestellnummer',
            'lieferdatum',
            'zahlbetrag',
            'v_zuk_bas',
            'v_zuk_exp',
            'v_zuk_son',
            'a_zuk_bas',
            'a_zuk_exp',
            'a_zuk_son',
            'kartentext'
        ],
        customDataHandler: true
    },
    "Ausführung": {
        sectionId: "ausfuehrung-div",
        fields: [
            'nummer',
            'name',
            'addresse',
            'rang',
            'fax',
            'telefon',
            'email',
            'auftragshinweis',
            'hinweis'
        ],
        customDataHandler: false
    },
    "Empfänger": {
        sectionId: "empfaenger-div",
        fields: [
            'name',
            'firmenzusatz',
            'addresse',
            'telefon'
        ],
        customDataHandler: false
    },
    "Auftraggeber": {
        sectionId: "auftraggeber-div",
        fields: [
            'name',
            'firmenzusatz',
            'addresse',
            'telefon',
            'email'
        ],
        customDataHandler: false
    },
    "Vermittler": {
        sectionId: "vermittler-div",
        fields: [
            'vermittler',
            'active',
            'typ',
            'name',
            'addresse',
            'fax',
            'telefon'
        ],
        customDataHandler: false
    }
}

//const modalAppState = window.appState; // use the shared reference

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

    // Render UI based on context
    renderUI(contextData);
    
    // Extract custom object data with context information
    await extractCustomObjectData(contextData.title, contextData);

  } catch (error) {
    console.error('App initialization failed:', error);
    showErrorMessage('Failed to initialize application. Please refresh the page.');
  }
});

/**
 * Renders the UI based on context data
 * @param {Object} contextData - The context data from the client
 */
function renderUI(contextData) {
  const { title } = contextData;
  
  // Hide all sections initially
  hideAllSections();
  
  // Handle special case for Auftragsstatus vs Warenkorb (legacy behavior)
  if (title === "Auftragsstatus") {
    showSection('auftragsstatus-div');
    renderAuftragsstatus(contextData);
    return;
  } 
  if (title === "Warenkorb") {
    // Fallback - show warenkorb
    showSection('warenkorb-div');
    renderWarenkorb(contextData);
    return;
    //console.warn(`Unknown context title: ${title}. Falling back to Warenkorb.`);
  }
  else if (renderByConfig(title, contextData)) {
    // Try to render using configuration for other context types
    return;
  }
} 

/**
 * Renders Auftragsstatus section
 * @param {Object} contextData - The context data
 */
function renderAuftragsstatus(contextData) {
  const fields = [
    'bestelldatum',
    'vertriebsweg', 
    'auftragsstatus',
    'freitext',
    'molliwert',
    'erfassdatum',
    'rechnungsnummer',
    'trackingnummer'
  ];

  fields.forEach(field => {
    updateElement(field, contextData[field]);
  });
}

/**
 * Renders Ausführung section
 * @param {Object} contextData - The context data
 */
function renderAusfuehrung(contextData) {
  const fieldMappings = {
    'ausfuehrung-nummer': 'nummer',
    'ausfuehrung-name': 'name',
    'ausfuehrung-addresse': 'addresse',
    'ausfuehrung-rang': 'rang',
    'ausfuehrung-fax': 'fax',
    'ausfuehrung-telefon': 'telefon',
    'ausfuehrung-email': 'email',
    'auftragshinweis': 'auftragshinweis',
    'hinweis': 'hinweis'
  };

  Object.entries(fieldMappings).forEach(([elementId, dataKey]) => {
    updateElement(elementId, contextData[dataKey]);
  });
}

/**
 * Renders Empfänger section
 * @param {Object} contextData - The context data
 */
function renderEmpfaenger(contextData) {
  const fieldMappings = {
    'empfaenger-name': 'name',
    'empfaenger-firmenzusatz': 'firmenzusatz', 
    'empfaenger-addresse': 'addresse',
    'empfaenger-telefon': 'telefon',
  };

  Object.entries(fieldMappings).forEach(([elementId, dataKey]) => {
    updateElement(elementId, contextData[dataKey]);
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
    'warenkorb-auftragsnummer': 'auftragsnummer',
    'warenkorb-bestellnummer': 'bestellnummer',
    'warenkorb-lieferdatum': 'lieferdatum',
    'warenkorb-zahlbetrag': 'zahlbetrag',
    'v_zuk_bas': 'v_zuk_bas',
    'v_zuk_exp': 'v_zuk_exp',
    'v_zuk_son': 'v_zuk_son',
    'a_zuk_bas': 'a_zuk_bas',
    'a_zuk_exp': 'a_zuk_exp',
    'a_zuk_son': 'a_zuk_son',
    'warenkorb-kartentext': 'kartentext'
  };

  Object.entries(fieldMappings).forEach(([elementId, dataKey]) => {
    updateElement(elementId,  contextData[dataKey]);
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
 * Hides all main sections
 */
function hideAllSections() {
  const sections = [
    'auftragsstatus-div',
    'warenkorb-div', 
    'ausfuehrung-div',
    'empfaenger-div',
    'auftraggeber-div',
    'vermittler-div'
  ];
  
  sections.forEach(sectionId => {
    toggleElement(sectionId, false);
  });
}

/**
 * Shows a specific section
 * @param {string} sectionId - The ID of the section to show
 */
function showSection(sectionId) {
  toggleElement(sectionId, true);
}

/**
 * Toggles element visibility
 * @param {string} elementId - The ID of the element
 * @param {boolean} show - Whether to show the element
 */
function toggleElement(elementId, show) {
  const element = document.getElementById(elementId);
  if (element) {
    element.style.display = show ? 'block' : 'none';
  } else {
    console.warn(`Element with ID '${elementId}' not found`);
  }
}

/**
 * Shows an error message to the user
 * @param {string} message - The error message to display
 */
function showErrorMessage(message) {
  // Create or update error message element
  let errorElement = document.getElementById('error-message');
  if (!errorElement) {
    errorElement = document.createElement('div');
    errorElement.id = 'error-message';
    errorElement.style.cssText = `
      background-color: #fee;
      color: #c33;
      padding: 12px;
      margin: 10px 0;
      border-radius: 4px;
      border: 1px solid #fcc;
    `;
    document.body.insertBefore(errorElement, document.body.firstChild);
  }
  errorElement.textContent = message;
}

/**
 * Generic render function using configuration
 * @param {string} contextTitle - The context title
 * @param {Object} contextData - The context data
 */
function renderByConfig(contextTitle, contextData) {
  const config = CONTEXT_CONFIG[contextTitle];
  if (!config) return false;
  
  showSection(config.sectionId);
  
  // Use the appropriate field mapping based on context
  if (contextTitle === "Ausführung") {
    renderAusfuehrung(contextData);
  } else if (contextTitle === "Empfänger") {
    renderEmpfaenger(contextData);
  } else if (contextTitle === "Auftraggeber") {
    renderAuftraggeber(contextData);
  } else if (contextTitle === "Vermittler") {
    renderVermittler(contextData);
  } else {
    // Generic field mapping for other contexts
    config.fields.forEach(field => {
      const elementId = `${config.sectionId.replace('-div', '')}-${field}`;
      updateElement(elementId, contextData[field]);
    });
  }
  
  return true;
}

/**
 * Context-aware custom data extraction wrapper
 * @param {string} contextTitle - The context title
 * @param {Object} contextData - The context data
 */
async function extractCustomObjectData(contextTitle, contextData) {
  try {
    const config = CONTEXT_CONFIG[contextTitle];
    
    if (config && config.customDataHandler) {
      // Call the specific handler for this context type
      // const handlerName = config.customDataHandler;
      
      // Use switch statement to handle different contexts
      switch (contextTitle) {
        case "Auftragsstatus":
          await handleAuftragsstatusData(contextData);
          break;
        case "Warenkorb":
          await handleWarenkorbData(contextData);
          break;
        default:
          console.warn(`No custom data handler implemented for context '${contextTitle}'`);
      }
    } else {
      console.log(`No custom data extraction needed for context '${contextTitle}'`);
    }
  } catch (error) {
    console.error(`Error extracting custom data for context '${contextTitle}':`, error);
  }
}

/**
 * Context-specific custom data handlers
 * These functions should be implemented based on your specific requirements
 */

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
  updateElement('Klassik-OT-tableBody', generateTableHTML(ot));
  updateElement('gtschn_tableBody', generateTableHTML(gutscheine));
  updateElement('kopf_ps_tableBody', generateTableHTML(kopfpauschalen));
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
    updateElement('warenkorb-pos-tableBody', generateTableHTML(warenkorbData));
  } catch (error) {
    console.error('Error processing Warenkorb custom data:', error);
  }
}
/**
 * Legacy data extraction functions - maintained for compatibility
 */

// Fetch and display data for each custom object
// Simplified data functions - now just one-liners!
const getOTtable = () => fetchData('ot', 'klassik OT');
const getGutscheineTable = () => fetchData('gutscheine', 'Gutscheine');
const getKopfpauschalenTable = () => fetchData('kopfpauschalen', 'Kopfpauschalen');
const getWarenkorbPosTable = () => fetchData('warenkorb', 'Warenkorb');

/**
 * Generic data fetcher with error handling
 * @param {string} objectType - Type of custom object to fetch
 * @param {string} dataType - Human readable name for logging
 * @returns {Object} Processed data or empty object
 */
async function fetchData(objectType, dataType) {
    try {
        let obj;

        if (objectType === 'warenkorb') {
            const auftragsnummer = document.getElementById("warenkorb-auftragsnummer").textContent.trim();
            if (!auftragsnummer) {
                console.warn(`No auftragsnummer found for ${dataType}`);
                return {};
            }
            obj = await getCartPositionsData(CUSTOM_OBJECTS[objectType], auftragsnummer);
        } else {
            obj = await getData(CUSTOM_OBJECTS[objectType]);
        }

        const data = obj?.records?.map(record => record.data);

        console.log(`${dataType} data fetched successfully`, data);

        if (!data || data.length === 0) {
            console.warn(`No ${dataType} data found`);
            return {};
        }

        return processMultipleRecords(data, DATA_CONFIGS[objectType]);
    } catch (error) {
        console.error(`Error fetching ${dataType} data:`, error);
        return {};
    }
}

function generateTableHTML(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return '<p class="fw-type-sm">Nicht verfügbar</p>';
  }

  return data.map(row => {
    const cells = Object.entries(row)
      .map(([key, value]) => `<td class="fw-type-sm">${formatValue(value, key)}</td>`)
      .join('');
    return `<tr>${cells}</tr>`;
  }).join('');
}
