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

    
    // Extract custom object data with context information
    await extractCustomObjectData(contextData.title, contextData);

  } catch (error) {
    console.error('App initialization failed:', error);
    showErrorMessage('Failed to initialize application. Please refresh the page.');
  }
});
