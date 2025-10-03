const axios = require("axios");

exports = {
  syncTicketWithAttachments: async function (args) {
    try {
      console.log("Serverless function: syncTicketWithAttachments started");

      const { ticketId, ticketData } = JSON.parse(args.body);

      if (!ticketData) {
        return { success: false, message: "No ticket data provided" };
      }

      // Step 1: Fetch full ticket
      const ticketResp = await $request.invokeTemplate("getTicket", {
        context: { ticket_id: ticketId },
      });
      const fullTicket = JSON.parse(ticketResp.response);

      // Step 2: Build ticket payload
      const ticketDetails = buildTicketDetails(ticketData);
      const validationError = validateTicketDetails(ticketDetails);
      if (validationError) {
        return { success: false, message: validationError };
      }

      // Step 3: Download attachments directly into memory
      let files = [];
      if (Array.isArray(fullTicket.attachments) && fullTicket.attachments.length > 0) {
        console.log(`Downloading ${fullTicket.attachments.length} attachments...`);
        for (const att of fullTicket.attachments) {
          const buffer = await downloadFileToBuffer(att.attachment_url);
          files.push({
            filename: sanitizeFilename(att.name),
            content: buffer.toString("base64"),
            "content-type": getMimeType(att.name),
          });
        }
      }

      console.log(`Prepared ${files.length} files for upload`);

      // Step 4: Create new ticket
      const response = await $request.invokeTemplate("createTicket", {
        body: ticketDetails,
        attachments: files,
      });

      const newTicketId = JSON.parse(response.response).id;
      console.log(`New ticket created with ID: ${newTicketId}`);

      // Step 5: Update source ticket
      await updateSourceTicketStatus(ticketId, newTicketId);

      return {
        success: true,
        message: "Ticket synced successfully",
        newTicketId,
      };
    } catch (err) {
      console.error("Serverless function error:", err);
      return {
        success: false,
        message: extractErrorMessage(err),
        error: err.message,
      };
    }
  },
};

// ===== Helpers =====

async function downloadFileToBuffer(url) {
  const response = await axios.get(url, { responseType: "arraybuffer" });
  return Buffer.from(response.data);
}

function sanitizeFilename(name) {
  return name.replace(/[\/\\?%*:|"<>]/g, "_");
}

function getMimeType(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  switch (ext) {
    case "doc":
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "txt":
      return "text/plain";
    case "csv":
      return "text/csv";
    case "xls":
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    default:
      return "application/octet-stream";
  }
}

/**
 * Build ticket payload from current ticket
 * Returns plain JSON object WITHOUT attachments
 */
function buildTicketDetails(ticketdata) {
    const today = new Date();
    const formattedDate = today.toISOString().split("T")[0];

    const details = {
        subject: ticketdata?.subject || 'No Subject',
        description: ticketdata?.description || '',
        email: ticketdata?.sender_email,
        status: ticketdata?.status || 2,
        priority: ticketdata?.priority || 1,
        custom_fields: {
            cf_create_date: formattedDate
        }
    };
    
    // Add optional fields only if they exist
    if (ticketdata?.type) {
        details.type = ticketdata.type;
    }
    
    if (ticketdata?.tags && Array.isArray(ticketdata.tags) && ticketdata.tags.length > 0) {
        details.tags = ticketdata.tags;
    }
    
    if (ticketdata?.category) {
        details.category = ticketdata.category;
    }
    
    if (ticketdata?.source) {
        details.source = ticketdata.source;
    }
    
    if (ticketdata?.company_id) {
        details.company_id = ticketdata.company_id;
    }
    
    // Merge existing custom fields if any
    if (ticketdata?.custom_fields) {
        const customFields = { ...ticketdata.custom_fields };
        
        // If cf_note is null or undefined, set it to empty string to avoid data type mismatch
        if (customFields.cf_note === null || customFields.cf_note === undefined) {
            customFields.cf_note = '';
        }
        
        details.custom_fields = {
            ...customFields,
            cf_create_date: formattedDate
        };
    }
    
    return details;
}

/**
 * Validate ticket details
 */
function validateTicketDetails(ticketDetails) {
    const requiredFields = {
        email: ticketDetails.email,
        subject: ticketDetails.subject,
        description: ticketDetails.description,
        status: ticketDetails.status,
        priority: ticketDetails.priority
    };
    
    const emptyFields = Object.entries(requiredFields)
        .filter(([, v]) => !v && v !== 0)
        .map(([k]) => k);

    if (emptyFields.length > 0) {
        console.warn("Validation failed. Missing fields:", emptyFields);
        return `Missing required fields: ${emptyFields.join(", ")}`;
    }
    
    return null;
}

/**
 * Update the source ticket status after sync
 */
async function updateSourceTicketStatus(sourceTicketId, targetTicketId, statusId = 5) {
    try {
        const response = await $request.invokeTemplate("updateTicket", {
            context: { ticket_id: sourceTicketId },
            body: JSON.stringify({
                status: statusId,
                type: "Transferred",
                custom_fields: {
                    cf_note: `Ticket ID: ${targetTicketId}`
                }
            })
        });
        
        console.log(`Source ticket ${sourceTicketId} updated - Status: ${statusId}, Type: Transferred, Target Ticket: ${targetTicketId}`);
        return response;
        
    } catch (error) {
        console.error('Error updating source ticket status:', error);
        // Log but don't throw - ticket was already created successfully
    }
}

/**
 * Extract error message from error object or API response
 */
function extractErrorMessage(error) {
    // Try to parse API error response
    if (error.response) {
        try {
            const errorData = JSON.parse(error.response);
            return errorData.description || errorData.message || "An error occurred while creating the ticket.";
        } catch (e) {
            // Not JSON, return as-is or default
            return error.response || error.message || "An error occurred while creating the ticket.";
        }
    }
    
    // Check for common error types
    if (error.message) {
        if (error.message.includes('network')) {
            return "Network error. Please check your connection.";
        }
        if (error.message.includes('permission') || error.message.includes('401') || error.message.includes('403')) {
            return "Permission denied. Please check your API credentials.";
        }
        if (error.message.includes('timeout')) {
            return "Request timed out. Please try again.";
        }
        return error.message;
    }
    
    return "An error occurred while creating the ticket. Please check logs.";
}