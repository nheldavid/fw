async function uploadFile() {
  const fileInput = document.getElementById('fileInput');
  const files = await fileInput.getFiles();
  const file = files[0];
  const desc = document.getElementById("descInput").value;
  const tag = document.getElementById("tagInput").value;
  if (!file) return notify("alert", "Please choose a file!");

  const formData = new FormData();
  formData.append('file', file.file);
  formData.append('description', desc);
  formData.append("tag", tag);
  formData.append('filename', file.name);
  try {
    const response = await client.files.upload(formData);
    console.info('File uploaded successfully');
    console.info(response);
    await loadFiles();
  } catch (error) {
    console.error('Error: Unable to upload file');
    console.error(error);
  }
}

async function downloadFile(fileId) {
  try {
    const res = await client.files.get(fileId);
    window.open(res.download_url, "_blank");
  } catch (error) {
    console.error(error);
    notify("danger", "Unable to open file");
  }
}

async function deleteFile(fileId) {
  try {
    const result = await client.interface.trigger("showConfirm", {
      message: "Are you sure you want to delete this file?",
      saveLabel: "Yes",
      cancelLabel: "No"
    });
    if(result === "No") {
      console.info("User cancelled the file delete operation");
      return;
    }
    console.info("User confirmed the file delete operation");
    try {
      await client.files.delete(fileId);
      notify("success", "File deleted");
      loadFiles();
    } catch (e) {
      console.error(e);
      notify("danger", "Delete failed");
    }
  } catch (error) {
    console.error("Error: Failed showing confirmation dialog");
    console.error(error);
  }
}

async function loadFiles() {
  const btnUploadFile = document.getElementById("btnUploadFile");
  btnUploadFile.addEventListener("fwClick", uploadFile);
  try {
    const response = await client.files.list({});
    const files = response.files || [];
    const tbody = document.getElementById("fileList");
    const noFilesDiv = document.getElementById("noFiles");
    const filesTableDiv = document.getElementById("filesTable");

    tbody.innerHTML = "";

    if (files.length === 0) {
      noFilesDiv.style.display = "block";
      filesTableDiv.style.display = "none";
      return;
    }
    noFilesDiv.style.display = "none";
    filesTableDiv.style.display = "block";

    files.forEach(file => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${file.file_name}</td>
        <td>${file.description || ""}</td>
        <td>${(file.file_size_bytes / 1024).toFixed(1)} KB</td>
        <td>${new Date(file.created_at).toLocaleString()}</td>
        <td>${file.tag || ""}</td>
        <td class="actions">
          <fw-button data-action="download" data-file-id="${file.id}">Download</fw-button>
          <fw-button data-action="delete" data-file-id="${file.id}" color="danger">Delete</fw-button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    
    fileList.addEventListener('fwClick', function (event) {
            const target = event.target;
            if (target.tagName.toLowerCase() === 'fw-button') {
              const action = target.dataset.action;
              const fileId = target.dataset.fileId;

              if (action && fileId) {
                if (action === 'download') {
                  downloadFile(fileId);
                } else if (action === 'delete') {
                  deleteFile(fileId);
                }
              }
            }
    });
  } catch (error) {
    console.error(error);
    notify("danger", "Failed to load files");
  }
}

function notify(type, message) {
  client.interface.trigger("showNotify", {
    type: type,
    message: message,
  });
}

function onAppActivate() {
  loadFiles();
  const btnUploadFile = document.getElementById("btnUploadFile");
  btnUploadFile.addEventListener("fwClick", uploadFile);
}

document.addEventListener('DOMContentLoaded', () => {
  app.initialized().then(function (_client) {
    window.client = _client;
    client.events.on("app.activated", onAppActivate);
  }).catch(function (error) {
    console.error('Error: Failed to initialise the app');
    console.error(error);
  });
});
