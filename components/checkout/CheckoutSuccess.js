// components/checkout/CheckoutSuccess.js
// The post-submit success screen for CheckoutForm — presentational, driven
// entirely by the `data` bag the form hands it. Covers all four outcomes:
// paid, advance-paid (partial), enquiry, and offline-under-review.
"use client";

import { CheckCircle, Mail, Download } from "lucide-react";
import { useLanguage } from "../LanguageProvider";
import { downloadReceipt } from "@/lib/checkoutReceipt";

export default function CheckoutSuccess({ data }) {
  const { t } = useLanguage();
  return (
    <div className="text-center py-8 px-4">
      <div className={`w-20 h-20 ${data.offlineReview ? "bg-amber-100" : "bg-green-100"} rounded-full flex items-center justify-center mx-auto mb-5`}>
        <CheckCircle className={`w-10 h-10 ${data.offlineReview ? "text-amber-600" : "text-green-600"}`} />
      </div>
      <h2 className="text-2xl font-black text-neutral-900 mb-1">
        {data.offlineReview
          ? "Payment Submitted!"
          : data.isEnquiry
            ? "Enquiry Received!"
            : data.partial
              ? "Advance Received!"
              : "Payment Successful!"}
      </h2>
      <p className="text-neutral-500 text-sm mb-6">
        {data.offlineReview
          ? "Your payment is under verification. We'll confirm your registration shortly."
          : data.isEnquiry
            ? "Our team will contact you shortly."
            : data.partial
              ? "Pay the balance to confirm your registration."
              : "Your registration is confirmed."}
      </p>

      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 text-left space-y-3 max-w-sm mx-auto mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">Name</span>
          <span className="font-semibold text-neutral-900">{data.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">Email</span>
          <span className="font-semibold text-neutral-900 break-all">{data.email}</span>
        </div>
        {!data.isEnquiry && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Category</span>
              <span className="font-semibold text-neutral-900">{data.category}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Attendees</span>
              <span className="font-semibold text-neutral-900">{data.attendees} Person(s)</span>
            </div>
            <div className="flex justify-between text-sm border-t border-neutral-200 pt-3 mt-1">
              <span className="text-neutral-500">Payment Status</span>
              <span className={`font-bold ${data.offlineReview || data.partial ? "text-amber-600" : "text-green-600"}`}>
                {data.offlineReview ? "⌛ Under Verification" : data.partial ? "◐ Advance Paid" : "✓ Paid"}
              </span>
            </div>
            {data.partial ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Advance Paid</span>
                  <span className="font-bold text-neutral-900">₹{data.paidNow.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Balance Due</span>
                  <span className="font-bold text-orange-600">₹{data.balance.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Total</span>
                  <span className="font-bold text-neutral-900">₹{data.amount.toLocaleString("en-IN")}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Amount</span>
                <span className="font-bold text-neutral-900">₹{data.amount.toLocaleString("en-IN")}</span>
              </div>
            )}
            {data.paymentId && (
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Payment Ref</span>
                <span className="font-mono text-xs text-neutral-600 break-all">{data.paymentId}</span>
              </div>
            )}
            {data.offlineReview && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Method</span>
                  <span className="font-semibold text-neutral-900">{t(`form_method_${data.method}`)}</span>
                </div>
                {data.reference && (
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Reference</span>
                    <span className="font-mono text-xs text-neutral-600 break-all">{data.reference}</span>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 mb-6 px-4">
        <Mail className="w-4 h-4 flex-shrink-0" />
        <span>
          {data.offlineReview
            ? `We'll verify your payment and email ${data.email} once your registration is confirmed.`
            : data.partial
              ? `Balance payment link sent to ${data.email} & your WhatsApp. Your QR entry pass is sent before the event, after full payment.`
              : data.isEnquiry
                ? `Confirmation sent to ${data.email}`
                : `Confirmation email sent to ${data.email}. Your QR entry pass will be sent a few days before the event.`}
        </span>
      </div>

      <div className="flex flex-col items-center gap-4">
        {/* Receipt is only meaningful for a confirmed payment — not enquiry / pending verification. */}
        {!data.isEnquiry && !data.offlineReview && (
          <button
            type="button"
            onClick={() => downloadReceipt(data)}
            className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Receipt
          </button>
        )}

        <button
          onClick={() => window.location.reload()}
          className="text-sm text-orange-600 hover:text-orange-700 font-semibold underline"
        >
          Register another person
        </button>
      </div>
    </div>
  );
}
