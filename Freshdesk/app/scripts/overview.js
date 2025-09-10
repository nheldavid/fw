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
    //await extractCustomObjectData(contextData);

  } catch (error) {
    console.error('App initialization failed:', error);
    showErrorMessage('Failed to initialize application. Please refresh the page.');
  }
});

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
    updateElement(elementId,  contextData.warenkorb[dataKey]);
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

    // // const config = CONTEXT_CONFIG[contextTitle];
    
    // // if (config && config.customDataHandler) {
    //   // Call the specific handler for this context type
    //   // const handlerName = config.customDataHandler;
      
    //   // Use switch statement to handle different contexts
    //   switch (contextTitle) {
    //     case "Auftragsstatus":
    //       await 
    //       break;
    //     case "Warenkorb":
          
    //       break;
    //     default:
    //       console.warn(`No custom data handler implemented for context '${contextTitle}'`);
    //   }
    // // } else {
    // //   console.log(`No custom data extraction needed for context '${contextTitle}'`);
    // // }
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


// Populate OT items
function populateOTItems(otDataArray) {
    const container = document.querySelector('.ot-items-container');
    const html = otDataArray.map((item) => createOTItem(item)).join('');
    container.innerHTML = html;
}

// Populate gutscheine items
function populateGutscheinItems(gutscheinDataArray) {
    const container = document.querySelector('.guts-items-container');
    const html = gutscheinDataArray.map((item) => createGutscheinItem(item)).join('');
    container.innerHTML = html;
}

// Populate gutscheine items
function populatePauschaleItems(pauschaleDataArray) {
    const container = document.querySelector('.kopfpauschalen-items-container');
    const html = pauschaleDataArray.map((item) => createPauschaleItem(item)).join('');
    container.innerHTML = html;
}

// Populate gutscheine items
function populatePositionenItems(positonenDataArray) {
    const container = document.querySelector('.positionen-items-container');
    const html = positonenDataArray.map((item) => createPositionenItem(item)).join('');
    container.innerHTML = html;
}

// Function to create OT item
function createOTItem(data) {
  // Convert string values to boolean if needed
    const isStorniert = data.storniert === true || data.storniert === 'true' || data.storniert === 'Ja' || data.storniert === '1';
 
    return `
        <div class="blue-bg" >
          <div class="row">
              <span class="label field-m">Ereignis:</span>
              <span class="label field-m">Bezeichnung::</span>
              <span class="label field-m">Erfasst:</span>
              <span class="label field-m">Erfasser:</span>
          </div>

          <div class="row">
              <span class="field field-m" id="ot-ereignis">${data.ereignis}</span>
              <span class="field field-m" id="ot-text">${data.text}</span>
              <span class="field field-m" id="ot-datum">${data.storno_datum}</span>
              <span class="field field-m" id="ot-uhrzeit">${data.storno_uhrzeit}</span>
              <span class="field field-m" id="ot-erfasser">${data.erfasser}</span>
          </div>
          
          <div class="row">
              <span class="label">Karte hinterlassen?</span>
              <span class="label" style="margin-left: 5px;">Klärung?</span>
              <!-- <span class="label">Checkbox:</span> -->
              <span class="label" style="margin-left: 140px;">Herkunft:</span>
          </div>

          <div class="row">
              <span class="field field-xs red-border" id="karte_hinterlassen"></span>
              <span class="field field-m red-border" id="klarung" style="margin-left: 42px;"></span>
              <span class="field field-m red-border" id="herkunft" style="margin-left: 87px;"></span>
          </div>
          
          <div class="row">
              <span class="label field-m">Anrufergebnis:</span>
              
              <span class="label">Ergänzende Angabe:</span>
              
          </div>
          
          <div class="row">
              <span class="field field-s" id="ot-ergebnis">${data.ergebnis}</span>
              <span class="field field-l red-border" id="erganzende-angabe"></span>
          </div>

          
          <div class="row">
              <span class="field field-m" id="">${data.name}</span>
              <span class="field field-m">${data.plz}</span>
              <span class="field field-m">${data.ort}</span>
              <span class="field field-m">${data.ortsteil}</span>
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
          </div>
      </div>
    `;
}

// Similar functions for Gutscheine and Kopfpauschalen...
function createGutscheinItem(data) {
    return `
      <div class="pink-bg">
      <div class="row">
          <span class="label field-m">Gutscheinnummer:</span>
          <span class="label" style="margin-left: 10px;">Wert:</span>
      </div>

      <div class="row">
          <span class="field field-m" id="guts-kartennumer">${data.kartennummer}</span>
          <span class="field field-m" id="guts-wert">${data.wert}</span>
      </div>
      
      <div class="row">
          <span class="label">Datum und Zeit der Einlösung:</span>
      </div>
      
      <div class="row">
          <span class="field field-m" id="guts-einl-datum">${data.einlsedatum}</span>
          <span class="field field-m" id="guts-einl-zeit">${data.einlsezeit}</span>
      </div>
  </div>
    `;
}

function createPauschaleItem(data) {
  return `
    <div class="row">
      <span class="field field-m" id="kondition">${data.konditionstext}</span>
      <span class="field field-m" id="konditionstext">${data.betrag}</span>
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
        <span class="field field-m" id="position">${data.position}</span>
        <span class="field field-m" id="material">${data.material}</span>
        <span class="field field-m" id="bezeichnung">${data.material_id}</span>
        <span class="field field-s" id="menge">${data.menge}</span>
    </div>
    
    <div class="row">
        <span class="label field-m" style="margin-left: 93px;">Preis brutto:</span>
        <span class="label field-m">Steuer:</span>
        <span class="label field-m">Größe:</span>
    </div>

    <div class="row">
        <span class="field field-m" id="preis_brutto" style="margin-left: 93px;">${data.preis_brutto}</span>
        <span class="field field-s" id="steuer">${data.steuer}</span>
        <span class="field field-m" id="variante">${data.variante}</span>
    </div>
    
    <div class="row">
        <span class="label"  style="margin-left: 93px;">Artikelbeschreibung:</span>
    </div>
    <div class="row">
        <span class="field field-full red-border" id="blumengrusstext" style="margin-left: 93px;"></span>
    </div>
  </div>
  `;
}
