# Object Storage Sample App

This app shows how to use the **Object Storage** feature to upload and manage knowledge base files within the app.

## Use Case

The app enables support agents or admins to:

* Upload files related to KB articles.
* View all uploaded files.
* Retrieve a single file.
* Delete unwanted files.

All operations are performed using the built-in **Object Storage** feature from the Freshworks Developer Platform.

## Features Demonstrated

1. **File Upload**

   * Upload files (e.g., JSON, CSV, images) to Object Storage.

2. **List All Files**

   * Fetch a list of all uploaded files.

3. **Get a File**

   * Retrieve metadata and content URL for a specific file.

4. **Delete a File**

   * Delete a file by its object key.

## Setup Instructions

1. **Clone the repository:**

   ```bash
   git clone https://github.com/freshworks-developers/object-storage-samples.git
   cd object-storage-samples
   ```

2. **Install the Freshworks CLI:**

   ```bash
   npm install -g fdk
   ```

3. **Run the app locally:**

   ```bash
   fdk run
   ```

4. **Test the app in Freshdesk (or any supported product):**

   * Upload, view, and manage files through the UI.

## API References

This app uses the following Object Storage methods:

* `client.files.upload()`
* `client.files.list()`
* `client.files.get()`
* `client.files.delete()`

## Notes

* Ensure file size and type limits are within Freshworks platform constraints referring to [the limits and constraints page](https://developers.freshworks.com/docs/app-sdk/v3.0/common/rate-limits-and-constraints/).

## Contributing

Feel free to raise issues or PRs to improve the sample app!

## License

GPL-3.0 license
