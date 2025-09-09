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

function renderUI(context) {
  
renderAuftragsstatus(context);
  renderAusfuehrung(context);
  renderEmpfaenger(context);
  renderAuftraggeber(context);
  renderVermittler(context);
  renderWarenkorb(context);
  renderKonditionen(context);
  renderGutscheine(context);

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
  <div class="green-line gray-bg">
    <div class="row">
        <span class="label field-xs">Position:</span>
        <!-- <span class="field-s" id="total_position">10</span> -->
        <span class="label field-m">Material:</span>
        <span class="label field-m">Bezeichnung:</span>
        <span class="label field-s">Menge:</span>
    </div>

    <div class="row">
        <span class="field field-m" id="position">${data.}</span>
        <span class="field field-m" id="material">MATERIAL</span>
        <span class="field field-m" id="bezeichnung">MAKTX</span>
        <span class="field field-s" id="menge">MENGE</span>
    </div>
    
    <div class="row">
        <span class="label field-m" style="margin-left: 93px;">Preis brutto:</span>
        <span class="label field-m">Steuer:</span>
        <span class="label field-m">Größe:</span>
    </div>

    <div class="row">
        <span class="field field-m" id="preis_brutto" style="margin-left: 93px;">BR_PREIS</span>
        <span class="field field-s" id="steuer">UMSST</span>
        <span class="field field-m" id="variante">VARIANTE</span>
    </div>
    
    <div class="row">
        <span class="label"  style="margin-left: 93px;">Artikelbeschreibung:</span>
    </div>
    <div class="row">
        <span class="field field-full red-border" id="blumengrusstext" style="margin-left: 93px;">BLUMENGRUSSTEXT</span>
    </div>
</div>
  `;
}
