// lib/comms.js

/**
 * Sends an automated transactional WhatsApp message
 * @param {string} phone - User's phone number with country code
 * @param {string} templateName - The pre-approved WhatsApp template ID
 * @param {object} variables - Key-value variables to replace in the template (e.g. {{1}}: Name)
 */
export async function sendWhatsAppNotification(phone, templateName, variables = {}) {
  const token = process.env.WHATSAPP_API_TOKEN;
  const providerUrl = process.env.WHATSAPP_PROVIDER_URL;

  // Placeholder Logic for Today
  if (!token || !providerUrl) {
    console.log(`[WHATSAPP SIMULATOR] To: ${phone} | Template: ${templateName}`);
    console.log(`[WHATSAPP DATA]`, variables);
    return { success: true, simulated: true };
  }

  // Future Integration Layer (Uncomment and configure when ready)
  /*
  try {
    const response = await fetch(`${providerUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: phone,
        type: 'template',
        template: {
          name: templateName,
          components: [{ type: 'body', parameters: Object.values(variables) }]
        }
      })
    });
    return await response.json();
  } catch (error) {
    console.error("WhatsApp Gateway Error:", error);
    return { success: false, error };
  }
  */
}

/**
 * Sends a confirmation email receipt via Resend
 */
export async function sendEmailReceipt(email, name, registrationDetails) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`[EMAIL SIMULATOR] Sending receipt to ${email} for ${name}`);
    return { success: true, simulated: true };
  }

  // Standard production execution using Resend API fetching
  // (We will write the full implementation when we hit Step 4 of the roadmap)
}