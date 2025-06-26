async function init() {
  const client = await app.initialized();
  client.events.on('app.activated', () => renderText(client));
  return client;
}

async function renderText(client) {
  const textElement = document.getElementById('apptext');
  const contactData = await client.data.get('contact');
  const {
    contact: { name }
  } = contactData;

  textElement.innerHTML = `Ticket is created by ${name}`;
}

// Initialize
init().catch(console.error);

