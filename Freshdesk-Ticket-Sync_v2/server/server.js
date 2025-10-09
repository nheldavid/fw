const unirest = require("unirest");
const axios = require("axios");
const { Buffer } = require("buffer");

// 🔹 Convert remote URL → Buffer
async function urlToBuffer(url) {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 30000, // 30s per file
    });
    return Buffer.from(response.data);
  } catch (err) {
    console.error(`❌ Failed to fetch URL: ${url} (${err.message})`);
    return null; // return null on failure to skip later
  }
}

exports = {
  createTicketWithAttachments: async function (args) {
    try {
      console.log("🟢 Starting createTicketWithAttachments...");

      // 🔹 Hardcoded Freshdesk credentials
      const target_api_key = "Z38lqZ7Ezco89SS8SoFS";
      const target_domain = "settingmilestones"; // subdomain only

      if (!target_api_key || !target_domain) {
        return { success: false, message: "Missing Freshdesk credentials." };
      }

      // 🔹 Parse request
      const { ticketData, attachmentUrls } = JSON.parse(args.body || "{}");
      if (!ticketData) return { success: false, message: "Missing ticketData." };

      // 🔹 Validate required fields
      const email = ticketData?.email || ticketData?.requester_email || ticketData?.sender_email;
      if (!email) return { success: false, message: "Missing email." };
      const subject = ticketData.subject || "No Subject";
      const description = ticketData.description || "";

      const status = parseInt(ticketData.status, 10) || 2;
      const priority = parseInt(ticketData.priority, 10) || 1;

      // 🔹 Build fields object
      const fields = { email, subject, description, status, priority };

      // 🔹 Add tags[] properly
      if (Array.isArray(ticketData.tags)) {
        ticketData.tags.forEach((tag) => fields["tags[]"] = tag);
      }

      // 🔹 Add custom_fields
      if (ticketData.custom_fields) {
        Object.keys(ticketData.custom_fields).forEach((key) => {
          let value = ticketData.custom_fields[key];
          if (value === null || value === undefined) value = "";
          fields[`custom_fields[${key}]`] = value;
        });
      }

      // 🔹 Prepare request
      const auth = Buffer.from(`${target_api_key}:x`).toString("base64");
      const url = `https://${target_domain}.freshdesk.com/api/v2/tickets`;

      const request = unirest.post(url).headers({ Authorization: `Basic ${auth}` });

      // 🔹 Attach fields object
      request.field(fields);

      // 🔹 Attach files in parallel with proper filenames
      if (Array.isArray(attachmentUrls) && attachmentUrls.length > 0) {
        console.log(`📎 Downloading and attaching ${attachmentUrls.length} file(s) in parallel...`);

        const buffers = await Promise.all(attachmentUrls.map(urlToBuffer));

        buffers.forEach((buffer, i) => {
          if (buffer) {
            // Extract filename from URL
            const filename = attachmentUrls[i].split("/").pop().split("?")[0];
            request.attach("attachments[]", buffer, filename);
            console.log(`✅ Attached: ${filename}`);
          } else {
            console.warn(`⚠️ Skipped attachment: ${attachmentUrls[i]}`);
          }
        });
      }

      // 🔹 Send request
      return await new Promise((resolve) => {
        request.end((response) => {
          console.log("🔹 Freshdesk response status:", response.status);
          if (response.status === 201 || response.status === 200) {
            resolve({
              success: true,
              status: response.status,
              response: JSON.stringify(response.body),
            });
          } else {
            resolve({
              success: false,
              status: response.status,
              message: response.body?.description || "Failed to create ticket",
              response: JSON.stringify(response.body),
            });
          }
        });
      });
    } catch (error) {
      console.error("🔥 Error creating ticket:", error);
      return {
        success: false,
        message: error.message || "Unexpected error",
        error: error.toString(),
      };
    }
  },
};
