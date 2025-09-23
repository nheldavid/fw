// Optimized overview.js
document.addEventListener("DOMContentLoaded", async function() {
  try {
    const client = await app.initialized();
    appState.client = client;

    const [context, ticketData] = await Promise.all([
      client.instance.context(),
      client.data.get('ticket').catch(() => ({ ticket: null }))
    ]);

    const contextData = context.data;
    appState.currentTicket = ticketData.ticket;

    // Process new fields and render UI
    const newFields = contextData.schemaResult?.newFields || {};
    window.appState.detectedNewFields = newFields;
    
    insertDynamicElements(newFields);
    renderAll(contextData, newFields);
    updateDynamicFields(contextData, newFields);

    console.log('New fields loaded:', Object.keys(newFields));
  } catch (error) {
    console.error('App initialization failed:', error);
  }
});

// Consolidated rendering
function renderAll(contextData, dynamicFields = {}) {
  // Basic sections
  renderSection('auftragsstatus', ['bestelldatum', 'vertriebsweg', 'status', 'freitext', 'trackingnummer'], contextData.auftragsstatus);
  renderSection('ausfuehrung', FIELD_MAPPINGS.ausfuehrung, contextData.ausfuehrung);
  renderSection('empfaenger', FIELD_MAPPINGS.empfaenger, contextData.empfaenger);
  renderSection('warenkorb', FIELD_MAPPINGS.warenkorb, contextData.warenkorb);

  // Modal data with dynamic fields
  if (contextData.modalData) {
    populateItems('ot-items-container', contextData.modalData.ot, createOTItem, 'Auftragsstatus_KLASSIK_OT', dynamicFields);
    populateItems('guts-items-container', contextData.modalData.gutscheine, createGutscheinItem, 'Auftragsstatus_KLASSIK_GTSCHN', dynamicFields);
    populateItems('kopfpauschalen-items-container', contextData.modalData.kopfpauschalen, createPauschaleItem, 'Auftragsstatus_KLASSIK_KOPF_PS', dynamicFields);
    populateItems('positionen-items-container', contextData.modalData.warenkorbPositionen, createPositionenItem, 'Warenkorb_Positionen', dynamicFields);
  }
}

// Field mappings
const FIELD_MAPPINGS = {
  ausfuehrung: {
    'ausfuehrender': 'ausfuehrender', 'ausfuehrung-anrede': 'anrede', 'ausfuehrung-name1': 'name1',
    'ausfuehrung-name2': 'name2', 'ausfuehrung-name3': 'name3', 'ausfuehrung-strasse': 'strasse',
    'ausfuehrung-land': 'land', 'ausfuehrung-plz': 'plz', 'ausfuehrung-ort': 'ort',
    'ausfuehrung-rang': 'rang', 'ausfuehrung-fax': 'fax', 'ausfuehrung-telefon': 'telefon',
    'ausfuehrung-email': 'email', 'auftragshinweis': 'auftragshinweis', 'hinweis': 'hinweis'
  },
  empfaenger: {
    'empf-anrede': 'anrede', 'empf-name1': 'name1', 'empf-name2': 'name2', 'empf-name3': 'name3',
    'empf-strasse': 'strasse', 'empf-land': 'land', 'empf-ort': 'ort', 'empf-region': 'region', 'empf-telefon': 'telefon'
  },
  warenkorb: {
    'lieferdatum': 'lieferdatum', 'zahlbetrag': 'zahlbetrag', 'kartenart': 'kartenart', 'kartentext': 'kartentext'
  }
};

const INSERTION_POINTS = {
  'Empfänger': '.empf-insertion-point', 'Ausführung': '.ausf-insertion-point',
  'Auftraggeber': '.auftraggeber-insertion-point', 'Auftragsstatus': '.auftragsstatus-insertion-point',
  'Warenkorb': '.warenkorb-insertion-point', 'Vermittler': '.vermittler-insertion-point'
};

const SCHEMA_MAP = {
  'Empfänger': 'empfaenger', 'Ausführung': 'ausfuehrung', 'Auftraggeber': 'auftraggeber',
  'Auftragsstatus': 'auftragsstatus', 'Warenkorb': 'warenkorb', 'Vermittler': 'vermittler'
};

// Generic section renderer
function renderSection(sectionType, fields, data) {
  if (Array.isArray(fields)) {
    fields.forEach(field => updateElement(field, data?.[field]));
  } else {
    Object.entries(fields).forEach(([elementId, dataKey]) => updateElement(elementId, data?.[dataKey]));
  }
}

// Generic item populator
function populateItems(containerClass, dataArray, createFunction, schemaName, dynamicFields) {
  const container = document.querySelector(`.${containerClass}`);
  if (!container || !dataArray) return;
  
  const fields = getDynamicFields(dynamicFields, schemaName);
  container.innerHTML = dataArray.map(item => createFunction(item, fields)).join('');
}

// Dynamic elements
function insertDynamicElements(newFields) {
  Object.entries(newFields).forEach(([schema, data]) => {
    const container = document.querySelector(INSERTION_POINTS[schema]);
    if (container && data.newFields?.length) {
      container.innerHTML = generateFieldsHTML(schema, data.newFields);
    }
  });
}

function generateFieldsHTML(schema, fields) {
  let html = '';
  for (let i = 0; i < fields.length; i += 2) {
    const f1 = fields[i], f2 = fields[i + 1];
    html += `<div class="row">
      <span class="label field-m">${f1.label || f1.name}:</span>
      ${f2 ? `<span class="label field-m">${f2.label || f2.name}:</span>` : ''}
    </div><div class="row">
      <span class="field field-m dynamic-field-value" id="dynamic-${schema.toLowerCase()}-${f1.name}" data-field-name="${f1.name}" data-schema="${schema}">Wird geladen...</span>
      ${f2 ? `<span class="field field-m dynamic-field-value" id="dynamic-${schema.toLowerCase()}-${f2.name}" data-field-name="${f2.name}" data-schema="${schema}">Wird geladen...</span>` : ''}
    </div>`;
  }
  return html;
}

function updateDynamicFields(contextData, newFields) {
  Object.entries(newFields).forEach(([schema, data]) => {
    const schemaData = contextData[SCHEMA_MAP[schema]];
    if (schemaData && data.newFields) {
      data.newFields.forEach(field => {
        const el = document.getElementById(`dynamic-${schema.toLowerCase()}-${field.name}`);
        if (el) {
          const value = schemaData[field.name];
          el.innerHTML = (value !== undefined && value !== null && value !== '') 
            ? formatValue(value, field.name.toLowerCase()) 
            : '<em>Nicht verfügbar</em>';
        }
      });
    }
  });
}

// =======================
// Helpers for readability
// =======================

function renderRow(labels = [], fields = []) {
  const labelHtml = labels.map(l => `<span class="label ${l.class || ''}" ${l.style || ''}>${l.text}</span>`).join('');
  const fieldHtml = fields.map(f => `<span class="field ${f.class || ''}" ${f.style || ''}>${f.value || ''}</span>`).join('');
  return `<div class="row">${labelHtml}${fieldHtml}</div>`;
}

function renderLabel(text, css = "label", style = "") {
  return `<span class="${css}" ${style}>${text}</span>`;
}

function renderField(value, css = "field", style = "") {
  return `<span class="${css}" ${style}>${value || ''}</span>`;
}

// =======================
// Item creators
// =======================

function createOTItem(data, dynamicFields = []) {
  const isStorniert = ['true', 'Ja', '1', true].includes(data.storniert);

  return `
    <div class="blue-bg">
      ${renderRow(
        [{ text: "Ereignis:", class: "field-m" }, { text: "Bezeichnung:", class: "field-m" },
         { text: "Erfasst:", class: "field-l" }, { text: "Erfasser:", class: "field-m" }]
      )}

      ${renderRow([], [
        { value: data.ereignis, class: "field-m" },
        { value: data.text, class: "field-m" },
        { value: data.storno_datum, class: "field-m" },
        { value: data.erfasser, class: "field-m" }
      ])}

      ${renderRow([
        { text: "Karte hinterlassen?" },
        { text: "Klärung?", style: 'style="margin-left: 5px;"' },
        { text: "Herkunft:", style: 'style="margin-left: 140px;"' }
      ])}

      ${renderRow([], [
        { class: "field-xs red-border" },
        { class: "field-m red-border", style: 'style="margin-left: 42px;"' },
        { class: "field-m red-border", style: 'style="margin-left: 87px;"' }
      ])}

      ${renderRow([{ text: "Anrufergebnis:", class: "field-m" }, { text: "Ergänzende Angabe:" }])}

      ${renderRow([], [
        { value: data.ergebnis, class: "field-s" },
        { class: "field-l red-border" }
      ])}

      ${renderRow([], [
        { value: data.name, class: "field-m" },
        { value: data.plz, class: "field-m" },
        { value: data.ort, class: "field-m" },
        { value: data.ortsteil, class: "field-m" }
      ])}

      ${renderRow([{ text: "Bemerkung:" }])}
      ${renderRow([], [{ class: "field-full red-border" }])}

      ${renderRow([{ text: "Abweichung der Ware:" }])}
      ${renderRow([], [{ class: "field-full red-border" }])}

      ${renderRow([{ text: "Widerruf?" }])}
      ${renderRow([], [{ value: isStorniert ? "Ja" : "Nein", class: "field-m" }])}

      ${generateItemDynamicFields('ot', dynamicFields, data)}
    </div>
  `;
}

function createGutscheinItem(data, dynamicFields = []) {
  return `
    <div class="pink-bg">
      ${renderRow([{ text: "Gutscheinnummer:", class: "field-m" }, { text: "Wert:", style: 'style="margin-left: 10px;"' }])}

      ${renderRow([], [
        { value: data.kartennummer, class: "field-m" },
        { value: formatValue(data.wert, "wert"), class: "field-m" }
      ])}

      ${renderRow([{ text: "Datum und Zeit der Einlösung:" }])}

      ${renderRow([], [
        { value: formatValue(data.einlsedatum, "datum"), class: "field-m" },
        { value: data.einlsezeit, class: "field-m" }
      ])}

      ${generateItemDynamicFields('gutscheine', dynamicFields, data)}
    </div>
  `;
}

function createPauschaleItem(data, dynamicFields = []) {
  return `
    <div class="pauschale-item">
      ${renderRow([], [
        { value: data.konditionstext, class: "field-m" },
        { value: formatValue(data.betrag, "betrag"), class: "field-m" }
      ])}

      ${generateItemDynamicFields('kopfpauschalen', dynamicFields, data)}
    </div>
  `;
}

function createPositionenItem(data, dynamicFields = []) {
  return `
    <div class="green-line gray-bg">
      ${renderRow([
        { text: "Position:", class: "field-m" },
        { text: "Material:", class: "field-m" },
        { text: "Bezeichnung:", class: "field-m" },
        { text: "Menge:", class: "field-s" }
      ])}

      ${renderRow([], [
        { value: data.position, class: "field-m" },
        { value: data.material, class: "field-m" },
        { value: data.material_id || data.bezeichnung, class: "field-m" },
        { value: formatValue(data.menge, "menge"), class: "field-s" }
      ])}

      ${renderRow([
        { text: "Preis brutto:", class: "field-m", style: 'style="margin-left: 93px;"' },
        { text: "Steuer:", class: "field-m" },
        { text: "Größe:", class: "field-m" }
      ])}

      ${renderRow([], [
        { value: formatValue(data.preis_brutto, "preis_brutto"), class: "field-m", style: 'style="margin-left: 93px;"' },
        { value: formatValue(data.steuer, "steuer"), class: "field-s" },
        { value: data.variante, class: "field-m" }
      ])}

      ${renderRow([{ text: "Artikelbeschreibung:", style: 'style="margin-left: 93px;"' }])}
      ${renderRow([], [
        { value: data.blumengrusstext, class: "field-full red-border", style: 'style="margin-left: 93px;"' }
      ])}

      ${generateItemDynamicFields('warenkorbPositionen', dynamicFields, data)}
    </div>
  `;
}

// =======================
// Utilities
// =======================

function generateItemDynamicFields(schemaType, fields, data) {
  if (!fields?.length) return '';

  let html = '<div class="dynamic-fields-section">';

  for (let i = 0; i < fields.length; i += 2) {
    const f1 = fields[i];
    const f2 = fields[i + 1];

    // Row with labels
    html += renderRow([
      { text: `${f1.label || f1.name}:`, class: "field-m dynamic-field-label" },
      ...(f2 ? [{ text: `${f2.label || f2.name}:`, class: "field-m dynamic-field-label" }] : [])
    ]);

    // Row with values
    html += renderRow([], [
      {
        value: formatValue(data[f1.name], f1.name.toLowerCase()),
        class: "field-m dynamic-field-value",
        "data-field-name": f1.name,
        "data-schema-type": schemaType
      },
      ...(f2
        ? [{
            value: formatValue(data[f2.name], f2.name.toLowerCase()),
            class: "field-m dynamic-field-value",
            "data-field-name": f2.name,
            "data-schema-type": schemaType
          }]
        : [])
    ]);
  }

  return html + '</div>';
}


function getDynamicFields(dynamicFieldsData, schemaName) {
  return dynamicFieldsData?.[schemaName]?.newFields || dynamicFieldsData?.[schemaName]?.fields || [];
}

function updateElement(elementId, value) {
  const el = document.getElementById(elementId);
  if (el) el.innerHTML = formatValue(value, elementId);
  else console.warn(`Element '${elementId}' not found`);
}