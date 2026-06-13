// app/api/send-ticket/route.js
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    const { email, firstName, lastName, categoryTitle, totalAmount, paymentId, attendeesCount } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Missing recipient email" }, { status: 400 });
    }

    // Send the transactional ticket email
    const data = await resend.emails.send({
      from: 'Shankhnad Mahotsav <onboarding@resend.dev>', // Change to your custom domain later if verified on Resend
      to: [email],
      subject: `✅ Confirmed: Your Ticket for Shankhnad Mahotsav`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <!-- Header Banner -->
          <div style="background-color: #171717; padding: 32px; text-align: center;">
            <span style="color: #ea580c; font-size: 12px; font-weight: bold; tracking: 0.1em; text-transform: uppercase;">Registration Confirmed</span>
            <h1 style="color: #ffffff; margin: 8px 0 0 0; font-size: 28px; font-weight: 800;">Shankhnad Mahotsav</h1>
          </div>
          
          <!-- Ticket Core Body -->
          <div style="padding: 32px; background-color: #ffffff;">
            <p style="font-size: 16px; color: #404040; margin-top: 0;">Namaste <strong>${firstName} ${lastName}</strong>,</p>
            <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">Your contribution has been successfully received. Below is your official digital entry pass parameter registry. Please keep this email handy at the venue gateway entrance.</p>
            
            <!-- Pass Details Grid Box -->
            <div style="background-color: #f9fafb; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 24px; margin: 24px 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Access Tier:</td>
                  <td style="padding: 6px 0; font-weight: bold; color: #111827; text-align: right;">${categoryTitle}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Total Attendees:</td>
                  <td style="padding: 6px 0; font-weight: bold; color: #111827; text-align: right;">${attendeesCount} Person(s)</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Payment Reference:</td>
                  <td style="padding: 6px 0; font-family: monospace; color: #ea580c; text-align: right; font-size: 12px;">${paymentId}</td>
                </tr>
                <tr style="border-top: 1px solid #e5e7eb;">
                  <td style="padding: 12px 0 0 0; font-weight: bold; color: #111827;">Total Paid:</td>
                  <td style="padding: 12px 0 0 0; font-weight: 800; color: #16a34a; text-align: right; font-size: 18px;">₹${totalAmount}</td>
                </tr>
              </table>
            </div>

            <!-- Venue Meta Block -->
            <div style="font-size: 13px; color: #6b7280; line-height: 1.5; margin-bottom: 8px;">
              📍 <strong>Venue & Dates:</strong> To be broadcasted shortly via your registered WhatsApp contact line.
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f3f4f6; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af;">
            This is an automated operational billing transaction document verified via Razorpay Secured Pipelines.
          </div>
        </div>
      `
    });

    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    console.error("🚨 Resend Email Failure:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}