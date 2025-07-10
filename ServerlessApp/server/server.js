exports = {
  // args is a JSON block containing the payload information.
  // args['iparam'] will contain the installation parameter values.
  onTicketCreateHandler: function(args) {
    console.log('Hello ' + args['data']['requester']['name']);

    const ordersData = this.getCustomObjectData(args);

    console.log('Orders Data: ', ordersData.schema());
    
  },


  getCustomObjectData: function(args) {
    // This function is called to retrieve custom object data.
    // You can implement your logic here to fetch and return the data.
    console.log('Fetching custom object data for ticket ID: ' + args['data']['id']);

    const $entity = $db.entity({ version: "v1" });
    // Example: Fetching custom object data from the database
    // Replace this with your actual logic to retrieve data.
    const customObjectData = $entity.get("orders");
    // Check if customObjectData is null or undefined
    if (!customObjectData) {
      console.log('No custom object data found for ticket ID: ' + args['data']['id']);
      return { message: 'No data found' };
    }
    return customObjectData;
  }
};
