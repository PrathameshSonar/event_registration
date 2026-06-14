// app/api/send-whatsapp/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { phone, firstName, lastName, categoryTitle, paymentId } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: "Missing phone number" }, { status: 400 });
    }

    // Clean the phone number (remove +, spaces, dashes)
    // WhatsApp API requires the country code. Assuming India (91) if not provided.
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`; 
    }

    // ------------------------------------------------------------------
    // NOTE: Replace these with your actual Meta / Twilio credentials
    // ------------------------------------------------------------------
    const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL; // e.g., https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID/messages
    const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!WHATSAPP_API_URL || !WHATSAPP_TOKEN) {
      console.warn("WhatsApp credentials not configured yet. Skipping message.");
      return NextResponse.json({ success: true, warning: "Credentials missing, skipped." });
    }

    // Meta WhatsApp Cloud API Payload Structure (Template Message)
    const payload = {
      messaging_product: "whatsapp",
      to: cleanPhone,
      type: "template",
      template: {
        name: "ticket_confirmation", // The name of your approved template in Meta Dashboard
        language: {
          code: "en"
        },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: `${firstName} ${lastName}` },
              { type: "text", text: categoryTitle },
              { type: "text", text: paymentId }
            ]
          }
        ]
      }
    };

    const response = await fetch(WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to send WhatsApp message");
    }

    return NextResponse.json({ success: true, messageId: data.messages?.[0]?.id });

  } catch (err) {
    console.error("🚨 WhatsApp API Failure:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}