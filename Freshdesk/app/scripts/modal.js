const CUSTOM_OBJECTS = {
    ot: 'Auftragsstatus_KLASSIK_OT',
    gutscheine: 'Auftragsstatus_KLASSIK_GTSCHN',
    kopfpauschalen: 'Auftragsstatus_KLASSIK_KOPF_PS'
}

const DATA_CONFIGS = {
    ot: {
        datum: ["datum", "uhrzeit"],
        ereignes: "ereignis",
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
        einlosedatum: "einlösedatum",
    },
    kopfpauschalen: {
        kondition: "kondition",
        konditionstext: "konditionstext",
        betrag: "betrag",
        einhet: "einheit"
    }}

document.addEventListener("DOMContentLoaded", function(){
      app.initialized()
        .then(function(_client){
        let client = _client;
        client.instance.context().then(function (context){
          const orderdetails = context.data;
          appState.client = client;
          appState.currentTicket = context.ticket;

          appState.client.data.get('ticket')
            .then(function(data) {
              appState.currentTicket = data.ticket;
            });

          console.log ("received data: ", orderdetails);

          document.getElementById('bestelldatum').innerHTML = orderdetails.bestelldatum;
          document.getElementById('vertriebsweg').innerHTML = orderdetails.vertriebsweg;
          document.getElementById('auftragsstatus').innerHTML = orderdetails.auftragsstatus;
          document.getElementById('freitext').innerHTML = orderdetails.freitext;
          document.getElementById('molliwert').innerHTML = orderdetails.molliwert;
          document.getElementById('erfassdatum').innerHTML = orderdetails.erfassdatum;    
          document.getElementById('rechnungsnummer').innerHTML = orderdetails.rechnungsnummer;
          document.getElementById('trackingnummer').innerHTML = orderdetails.trackingnummer;

          console.log("Ticket ID: ", orderdetails.ticketnummer);        
          
          extractCustomObjectData()

        });
      });
    });

  // Fetch and display data for each custom object
  // Simplified data functions - now just one-liners!
const getOTtable = () => fetchData('ot', 'klassik OT');
const getGutscheineTable = () => fetchData('gutscheine', 'Gutscheine');
const getKopfpauschalenTable = () => fetchData('kopfpauschalen', 'Kopfpauschalen');
/**
 * Generic data fetcher with error handling
 * @param {string} objectType - Type of custom object to fetch
 * @param {string} dataType - Human readable name for logging
 * @returns {Object} Processed data or empty object
 */
async function fetchData(objectType, dataType) {
    try {
        const obj = await getData(CUSTOM_OBJECTS[objectType]);
        //const data = obj?.records?.[0]?.data;
        const data = obj?.records?.map(record => record.data);

        console.log(`${dataType} data fetched successfully`, data);
        if (!data) {
            console.warn(`No ${dataType} data found`);
            return {};
        }
        
        // Use the new function to process multiple records
        return processMultipleRecords(data, DATA_CONFIGS[objectType]);
        //return processData(data, DATA_CONFIGS[objectType]);
    } catch (error) {
        console.error(`Error fetching ${dataType} data:`, error);
        return {};
    }
}




async function extractCustomObjectData() {
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
    document.getElementById('Klassik-OT-tableBody').innerHTML = generateTableHTML(ot);
    document.getElementById('gtschn_tableBody').innerHTML = generateTableHTML(gutscheine);
    document.getElementById('kopf_ps_tableBody').innerHTML = generateTableHTML(kopfpauschalen);
}
function generateTableHTML(data) {
    if (!data || Object.keys(data).length === 0) {
        return '<p>No data available</p>';
    }
    // let html = '<table class="data-table"><thead><tr>';
    // // Generate table headers
    // Object.keys(data[0]).forEach(key => {

    //     html += `<th class="fw-type-xs" style="border: 1px;">${key}</th>`;
    // });
    // html += '</tr></thead><tbody>';   
    // // Generate table rows

    let html = '';
    data.forEach(row => {
        html += '<tr>'; 
        Object.values(row).forEach(value => {

            html += `<td class="fw-type-sm">${value}</td>`;
        }
        );
        html += '</tr>';
    }
    );
    html += '</tbody></table>';
    return html;
}