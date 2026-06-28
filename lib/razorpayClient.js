// lib/razorpayClient.js
//
// Single shared Razorpay client. Lazily constructed so a missing key during
// `next build` doesn't throw at import time. Used by the order route, the
// webhook, the admin "Sync payment" route, and the reconciliation cron — one
// client, one place to configure credentials.
import Razorpay from 'razorpay';

let _client = null;

export function getRazorpayClient() {
    if (!_client) {
        _client = new Razorpay({
            key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    }
    return _client;
}
