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

function toggleSection(element) {
    // Get the section content (next sibling element)
    const sectionContent = element.nextElementSibling;
    
    // Toggle the collapsed class on both the title and content
    element.classList.toggle('collapsed');
    sectionContent.classList.toggle('collapsed');
    
    // Set max-height for smooth animation
    if (sectionContent.classList.contains('collapsed')) {
        // Collapsing - set max-height to 0
        sectionContent.style.maxHeight = '0';
        sectionContent.style.opacity = '0';
    } else {
        // Expanding - set max-height to scroll height for smooth animation
        sectionContent.style.maxHeight = sectionContent.scrollHeight + 'px';
        sectionContent.style.opacity = '1';
        
        // Reset max-height after animation completes to allow for dynamic content changes
        setTimeout(() => {
            if (!sectionContent.classList.contains('collapsed')) {
                sectionContent.style.maxHeight = 'none';
            }
        }, 300); // Match the CSS transition duration
    }
}


// Populate OT items
function populateOTItems(otDataArray) {
    const container = document.getElementById('ot-items-container');
    const html = otDataArray.map((item, index) => createOTItem(item, index)).join('');
    container.innerHTML = html;
}

// Populate gutscheine items
function populateGutscheinItems(gutscheinDataArray) {
    const container = document.getElementById('gutscheine-items-container');
    const html = gutscheinDataArray.map((item, index) => createGutscheinItem(item, index)).join('');
    container.innerHTML = html;
}

// Populate gutscheine items
function populatePauschaleItems(pauschaleDataArray) {
    const container = document.getElementById('kopfpauschalen-items-container');
    const html = pauschaleDataArray.map((item, index) => createPauschaleItem(item, index)).join('');
    container.innerHTML = html;
}

// Populate gutscheine items
function populatePositionenItems(positonenDataArray) {
    const container = document.getElementById('positionen-items-container');
    const html = positonenDataArray.map((item, index) => createPositionenItem(item, index)).join('');
    container.innerHTML = html;
}

// Function to create OT item
function createOTItem(data, index) {
  // Convert string values to boolean if needed
    const isStorniert = data.storniert === true || data.storniert === 'true' || data.storniert === 'Ja' || data.storniert === '1';
 
    return `
        <div class="cart-item ot-item">
            <div class="cart-item-header">
                <span class="position-badge ot-badge">OT ${index + 1}</span>
                <!-- <span class="item-total">${data.datum} ${data.zeit}</span> -->
            </div>
            <div class="details-grid">
                <div class="detail-item">
                  <div class="detail-label">Datum</div>
                  <div class="detail-value">${data.datum}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Ereignis</div>
                  <div class="detail-value">${data.ereignis}</div>
                </div>
                <div class="detail-item full-width">
                  <div class="detail-label">Text</div>
                  <div class="detail-value">${data.text}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Ergebnis</div>
                  <div class="detail-value">
                    <span class="status-badge status-completed">${data.ergebnis}</span>
                  </div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Name</div>
                  <div class="detail-value">${data.name}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Adresse</div>
                  <div class="detail-value">${data.addresse}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Erfasser</div>
                  <div class="detail-value">${data.erfasser}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Storniert</div>
                    <div class="detail-value checkbox-field">
                        <input type="checkbox" class="checkbox" ${isStorniert ? 'checked' : ''} disabled>
                        <span>${isStorniert ? 'Ja' : 'Nein'}</span>
                    </div>
                </div>
                <div class="detail-item full-width">
                  <div class="detail-label">Storniert</div>
                  <div class="detail-value">${data.storniert_text}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Storniert</div>
                  <div class="detail-value">${data.storno_datum}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Storniert</div>
                  <div class="detail-value">${data.storno_erfasser}</div>
                </div>
            </div>
        </div>
    `;
}

// Similar functions for Gutscheine and Kopfpauschalen...
function createGutscheinItem(data, index) {
    return `
        <div class="cart-item gutschein-item">
            <div class="cart-item-header">
                <span class="position-badge gutschein-badge">Gutschein ${index + 1}</span>
                <!--<span class="item-total price">${data.wert}</span>-->
            </div>
            <div class="details-grid">
                <div class="detail-item">
                    <div class="detail-label">Kartennummer</div>
                    <div class="detail-value">${data.kartennummer}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Wert</div>
                    <div class="detail-value price">${data.wert}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Einlösedatum</div>
                    <div class="detail-value">${data.einlosedatum}</div>
                </div>
            </div>
        </div>
    `;
}

function createPauschaleItem(data, index) {
  return `
    <div class="cart-item pauschale-item">
      <div class="cart-item-header">
          <span class="position-badge pauschale-badge">Pauschale ${index + 1}</span>
          <!--<span class="item-total price">€5.00</span>-->
      </div>
      <div class="details-grid">
        <div class="detail-item">
            <div class="detail-label">Kondition</div>
            <div class="detail-value">${data.kondition}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Konditionstext</div>
            <div class="detail-value">${data.konditionstext}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Betrag</div>
            <div class="detail-value price">${data.betrag}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Einheit</div>
            <div class="detail-value">${data.einheit}</div>
        </div>
      </div>
    </div>
  `;
}

function createPositionenItem(data) {
  return `
  <div class="cart-item">
    <div class="cart-item-header">
        <span class="position-badge">Position ${data.position}</span>
        <!-- <span class="item-total price">€89.99</span> -->
    </div> 
    <div class="details-grid">
      <div class="detail-item">
        <div class="detail-label">Material</div>
        <div class="detail-value">${data.material}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Menge</div>
        <div class="detail-value">${data.menge}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Preis brutto</div>
        <div class="detail-value price">${data.preis_brutto}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Steuer</div>
        <div class="detail-value">${data.steuer}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Kartenart</div>
        <div class="detail-value">${data.kartenart}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Größe</div>
        <div class="detail-value">${data.variante}</div>
      </div>
      <div class="detail-item full-width">
        <div class="detail-label">Kurztext</div>
        <div class="detail-value">${data.kurztext}</div>
      </div>
    </div>
  </div>
  `;
}

function toggleHiddenServices(button) {
    const hiddenFields = button.closest('.cart-item-content').querySelector('.hidden-service-fields');
    const btnText = button.querySelector('.btn-text');
    const itemTotal = button.closest('.cart-item').querySelector('.item-total');
    const cartItemContent = button.closest('.cart-item-content');
    
    hiddenFields.classList.toggle('collapsed');
    
    if (hiddenFields.classList.contains('collapsed')) {
        hiddenFields.style.maxHeight = '0';
        hiddenFields.style.opacity = '0';
        btnText.textContent = '4 weitere Services anzeigen';
        itemTotal.textContent = '2 von 6 Services';
    } else {
        hiddenFields.style.maxHeight = hiddenFields.scrollHeight + 'px';
        hiddenFields.style.opacity = '1';
        btnText.textContent = 'Weniger anzeigen';
        itemTotal.textContent = '6 Services';
    }
    
    // Always recalculate and update parent container height
    setTimeout(() => {
        if (cartItemContent && !cartItemContent.classList.contains('collapsed')) {
            cartItemContent.style.maxHeight = cartItemContent.scrollHeight + 'px';
            
            // Reset to auto after animation to allow for dynamic content
            setTimeout(() => {
                if (!cartItemContent.classList.contains('collapsed')) {
                    cartItemContent.style.maxHeight = 'auto';
                }
            }, 300);
        }
    }, 50);
}