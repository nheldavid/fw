/**
 * Simplified modal.js - UI Rendering Only
 * All data extraction is now handled centrally in app.js
 * This file only handles modal UI rendering using pre-extracted data from appState
 */

// Context configuration for UI rendering
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
        hasModalData: true
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
        hasModalData: true
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
        hasModalData: false
    },
    "Empfänger": {
        sectionId: "empfaenger-div",
        fields: [
            'name',
            'firmenzusatz',
            'addresse',
            'telefon'
        ],
        hasModalData: false
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
        hasModalData: false
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
        hasModalData: false
    }
}

// Modal-specific custom objects mapping
const MODAL_CUSTOM_OBJECTS = {
    ot: 'Auftragsstatus_KLASSIK_OT',
    gutscheine: 'Auftragsstatus_KLASSIK_GTSCHN',
    kopfpauschalen: 'Auftragsstatus_KLASSIK_KOPF_PS',
    warenkorbPositionen: 'Warenkorb_Positionen'
};

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

        console.log('Context Data:', contextData);

        // Initialize schema cache for modal data extraction
        await initializeSchemaCache();
        
        // Render UI based on context using pre-extracted data from appState
        await renderUI(contextData);
        
    } catch (error) {
        console.error('App initialization failed:', error);
        showErrorMessage('Failed to initialize application. Please refresh the page.');
    }
});

/**
 * Renders the UI based on context data using centrally extracted appState data
 * @param {Object} contextData - The context data from the client
 */
async function renderUI(contextData) {
    const { title } = contextData;
    
    // Hide all sections initially
    hideAllSections();
    
    // Get configuration for this context
    const config = CONTEXT_CONFIG[title];
    if (!config) {
        console.warn(`Unknown context title: ${title}`);
        return;
    }

    // Show the appropriate section
    showSection(config.sectionId);
    
    // Render based on context type using centrally extracted data
    switch (title) {
        case "Auftragsstatus":
            renderAuftragsstatus(contextData);
            // Extract and render modal data if available
            if (config.hasModalData) {
                await extractAndRenderModalData();
            }
            break;
        case "Warenkorb":
            renderWarenkorb(contextData);
            // Extract and render modal data if available  
            if (config.hasModalData) {
                await extractAndRenderModalData();
            }
            break;
        case "Ausführung":
            renderAusfuehrung(contextData);
            break;
        case "Empfänger":
            renderEmpfaenger(contextData);
            break;
        case "Auftraggeber":
            renderAuftraggeber(contextData);
            break;
        case "Vermittler":
            renderVermittler(contextData);
            break;
        default:
            console.warn(`No render function implemented for context '${title}'`);
    }
}

/**
 * Extract modal-specific data within the modal context
 */
async function extractAndRenderModalData() {
    console.log('Extracting modal data within modal context...');
    
    try {
        // Extract modal-specific data in parallel
        const [ot, gutscheine, kopfpauschalen, warenkorbPositionen] = await Promise.all([
            fetchModalData('ot', 'OT'),
            fetchModalData('gutscheine', 'Gutscheine'),
            fetchModalData('kopfpauschalen', 'Kopfpauschalen'),
            fetchWarenkorbPositionsData()
        ]);

        // Store in appState for consistency
        if (!appState.customObjectData.modalData) {
            appState.customObjectData.modalData = {};
        }

        appState.customObjectData.modalData = {
            ot,
            gutscheine,
            kopfpauschalen,
            warenkorbPositionen
        };

        console.log('Modal data extracted:', appState.customObjectData.modalData);

        // Render the modal data
        renderModalData();

    } catch (error) {
        console.error('Error extracting modal data:', error);
        showErrorMessage('Failed to load additional data');
    }
}

/**
 * Generic modal data fetcher
 * @param {string} objectType - Type of modal custom object to fetch
 * @param {string} dataType - Human readable name for logging
 * @returns {Array} Processed data array or empty array
 */
async function fetchModalData(objectType, dataType) {
    try {
        const obj = await getData(MODAL_CUSTOM_OBJECTS[objectType]);
        const data = obj?.records?.map(record => record.data);
        
        if (!data || data.length === 0) {
            console.warn(`No ${dataType} data found`);
            return [];
        }
        
        return processMultipleRecords(data, DATA_CONFIGS[objectType]);
    } catch (error) {
        console.error(`Error fetching ${dataType} data:`, error);
        return [];
    }
}

/**
 * Fetch Warenkorb positions data (special case with auftragsnummer)
 * @returns {Array} Processed warenkorb positions data
 */
async function fetchWarenkorbPositionsData() {
    try {
        // We need to get the auftragsnummer from somewhere
        // For now, let's try to get it from the current ticket or context
        let auftragsnummer = null;
        
        // Try to get it from the warenkorb data if available
        if (appState.customObjectData?.warenkorb?.auftragsnummer) {
            auftragsnummer = appState.customObjectData.warenkorb.auftragsnummer;
        } else {
            // Try to fetch warenkorb data first to get auftragsnummer
            const warenkorbObj = await getData(CUSTOM_OBJECTS.warenkorb);
            const warenkorbData = warenkorbObj?.records?.[0]?.data;
            auftragsnummer = warenkorbData?.auftragsnummer;
        }
        
        if (!auftragsnummer) {
            console.warn('No auftragsnummer found for warenkorb positions');
            return [];
        }
        
        const obj = await getWarenkorbPositionsData(MODAL_CUSTOM_OBJECTS.warenkorbPositionen, auftragsnummer);
        const data = obj?.records?.map(record => record.data);
        
        if (!data || data.length === 0) {
            console.warn('No warenkorb positions data found');
            return [];
        }
        
        return processMultipleRecords(data, DATA_CONFIGS.warenkorbPositionen);
    } catch (error) {
        console.error('Error fetching warenkorb positions data:', error);
        return [];
    }
}
// Add the CUSTOM_OBJECTS mapping for consistency
const CUSTOM_OBJECTS = {
    ausfuehrung: 'Ausführung',
    empfaenger: 'Empfänger',
    auftraggeber: 'Auftraggeber',
    auftragsstatus: 'Auftragsstatus',
    vermittler: 'Vermittler',
    warenkorb: 'Warenkorb'
};

/**
 * Renders Auftragsstatus section using contextData and centrally extracted modal data
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
        updateElement(elementId, contextData[dataKey]);
    });
}

/**
 * Renders modal-specific data using centrally extracted appState.customObjectData.modalData
 */
function renderModalData() {
    // Check if modal data is available from central extraction
    if (!appState.customObjectData?.modalData) {
        console.warn('Modal data not available from central extraction');
        return;
    }

    const modalData = appState.customObjectData.modalData;
    
    // Render OT items
    if (modalData.ot && Array.isArray(modalData.ot)) {
        populateOTItems(modalData.ot);
    }
    
    // Render Gutscheine items  
    if (modalData.gutscheine && Array.isArray(modalData.gutscheine)) {
        populateGutscheinItems(modalData.gutscheine);
    }
    
    // Render Kopfpauschalen items
    if (modalData.kopfpauschalen && Array.isArray(modalData.kopfpauschalen)) {
        populatePauschaleItems(modalData.kopfpauschalen);
    }
    
    // Render Warenkorb positions
    if (modalData.warenkorbPositionen && Array.isArray(modalData.warenkorbPositionen)) {
        populatePositionenItems(modalData.warenkorbPositionen);
    }
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

// ========================
// UI RENDERING FUNCTIONS - Use centrally extracted data
// ========================

// Populate OT items using centrally extracted data
function populateOTItems(otDataArray) {
    const container = document.getElementById('ot-items-container');
    if (!container) {
        console.warn('OT items container not found');
        return;
    }
    const html = otDataArray.map((item, index) => createOTItem(item, index)).join('');
    container.innerHTML = html;
}

// Populate gutscheine items using centrally extracted data  
function populateGutscheinItems(gutscheinDataArray) {
    const container = document.getElementById('gutscheine-items-container');
    if (!container) {
        console.warn('Gutscheine items container not found');
        return;
    }
    const html = gutscheinDataArray.map((item, index) => createGutscheinItem(item, index)).join('');
    container.innerHTML = html;
}

// Populate pauschale items using centrally extracted data
function populatePauschaleItems(pauschaleDataArray) {
    const container = document.getElementById('kopfpauschalen-items-container');
    if (!container) {
        console.warn('Kopfpauschalen items container not found');
        return;
    }
    const html = pauschaleDataArray.map((item, index) => createPauschaleItem(item, index)).join('');
    container.innerHTML = html;
}

// Populate positionen items using centrally extracted data
function populatePositionenItems(positionenDataArray) {
    const container = document.getElementById('positionen-items-container');
    if (!container) {
        console.warn('Positionen items container not found');
        return;
    }
    const html = positionenDataArray.map((item, index) => createPositionenItem(item, index)).join('');
    container.innerHTML = html;
}

// Function to create OT item HTML
function createOTItem(data, index) {
    // Convert string values to boolean if needed
    const isStorniert = data.storniert === true || data.storniert === 'true' || data.storniert === 'Ja' || data.storniert === '1';
 
    return `
        <div class="cart-item ot-item">
            <div class="cart-item-header">
                <span class="position-badge ot-badge">OT ${index + 1}</span>
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
                  <div class="detail-label">Storniert Text</div>
                  <div class="detail-value">${data.storniert_text}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Storno Datum</div>
                  <div class="detail-value">${data.storno_datum}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Storno Erfasser</div>
                  <div class="detail-value">${data.storno_erfasser}</div>
                </div>
            </div>
        </div>
    `;
}

// Function to create Gutschein item HTML
function createGutscheinItem(data, index) {
    return `
        <div class="cart-item gutschein-item">
            <div class="cart-item-header">
                <span class="position-badge gutschein-badge">Gutschein ${index + 1}</span>
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

// Function to create Pauschale item HTML
function createPauschaleItem(data, index) {
    return `
        <div class="cart-item pauschale-item">
            <div class="cart-item-header">
                <span class="position-badge pauschale-badge">Pauschale ${index + 1}</span>
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

// Function to create Positionen item HTML
function createPositionenItem(data) {
    return `
        <div class="cart-item">
            <div class="cart-item-header">
                <span class="position-badge">Position ${data.position}</span>
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

// ========================
// UI INTERACTION FUNCTIONS
// ========================

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