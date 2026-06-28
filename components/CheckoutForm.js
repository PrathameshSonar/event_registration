// components/CheckoutForm.js
"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  AlertCircle,
  MapPin,
  Calendar,
  MessageSquare,
  Mail,
  Phone,
  Users,
  Heart,
  CheckCircle,
  Download,
} from "lucide-react";
import {
  TextField,
  MenuItem,
  InputAdornment,
  Button,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { useLanguage } from "./LanguageProvider";
import { BUILTIN_FIELDS, CORE_KEYS } from "@/lib/formFields";

const TODAY_STR = new Date().toISOString().split("T")[0];
const BUILTIN_DEFAULT_REQUIRED = Object.fromEntries(
  BUILTIN_FIELDS.map((f) => [f.field_key, f.default_required]),
);

function validatePhone(raw) {
  const clean = String(raw)
    .replace(/\s+/g, "")
    .replace(/^(\+91|0091|91|0)/, "");
  return /^[6-9]\d{9}$/.test(clean);
}

function hasHtml(str) {
  return /<[^>]+>/.test(str) || /javascript:/i.test(str);
}

// startAdornment helper for the slotProps.input API (MUI v6+).
const adorn = (icon, extra = {}) => ({
  startAdornment: <InputAdornment position="start">{icon}</InputAdornment>,
  ...extra,
});

// Renders the success details into a downloadable receipt image (PNG) using
// the Canvas API, so no extra dependency is needed.
function buildReceiptCanvas(data) {
  const rupee = (n) => "Rs. " + Number(n || 0).toLocaleString("en-IN");

  const dateStr = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const rows = [
    ["Date", dateStr],
    ["Name", data.name],
    ["Email", data.email],
    ["Mobile", data.phone],
  ];
  if (data.gotra) rows.push(["Gotra", data.gotra]);
  if (!data.isEnquiry) {
    rows.push(["Category", data.category]);
    rows.push(["Attendees", `${data.attendees} Person(s)`]);
    rows.push(["Status", data.partial ? "Advance Paid" : "Paid"]);
    if (data.partial) {
      rows.push(["Advance Paid", rupee(data.paidNow)]);
      rows.push(["Balance Due", rupee(data.balance)]);
      rows.push(["Total", rupee(data.amount)]);
    } else {
      rows.push(["Amount", rupee(data.amount)]);
    }
    if (data.orderId) rows.push(["Order ID", data.orderId]);
    if (data.paymentId) rows.push(["Payment Ref", data.paymentId]);
  }

  // Layout constants (logical px; scaled up for crisp output).
  const scale = 2;
  const W = 440;
  const padX = 36;
  const rowH = 38;
  const headerH = 150;
  const footerH = 96;
  const H = headerH + rows.length * rowH + footerH;

  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Top accent bar
  ctx.fillStyle = "#ea580c";
  ctx.fillRect(0, 0, W, 8);

  // Brand + title
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#0a0a0a";
  ctx.font = "800 26px Arial, sans-serif";
  ctx.fillText("BaglaBhairav", padX, 56);

  ctx.fillStyle = "#737373";
  ctx.font = "600 13px Arial, sans-serif";
  ctx.fillText(
    data.isEnquiry ? "ENQUIRY RECEIPT" : "REGISTRATION RECEIPT",
    padX,
    80,
  );

  // Status pill
  const pillText = data.isEnquiry
    ? "Enquiry Received"
    : data.partial
      ? "Advance Received"
      : "Payment Successful";
  ctx.font = "700 12px Arial, sans-serif";
  const pillW = ctx.measureText(pillText).width + 24;
  const pillColor = data.partial ? "#b45309" : "#16a34a";
  const pillBg = data.partial ? "#fffbeb" : "#f0fdf4";
  ctx.fillStyle = pillBg;
  ctx.beginPath();
  ctx.roundRect(padX, 98, pillW, 28, 14);
  ctx.fill();
  ctx.fillStyle = pillColor;
  ctx.fillText(pillText, padX + 12, 117);

  // Divider
  ctx.strokeStyle = "#e5e5e5";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padX, headerH - 6);
  ctx.lineTo(W - padX, headerH - 6);
  ctx.stroke();

  // Rows
  rows.forEach(([label, value], i) => {
    const y = headerH + i * rowH + 18;
    ctx.fillStyle = "#737373";
    ctx.font = "500 14px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(label, padX, y);

    ctx.fillStyle = "#0a0a0a";
    ctx.font = "700 14px Arial, sans-serif";
    ctx.textAlign = "right";
    // Truncate long values (e.g. payment ref) to fit.
    let text = String(value ?? "");
    const maxW = W - padX * 2 - ctx.measureText(label).width - 16;
    while (ctx.measureText(text).width > maxW && text.length > 4) {
      text = text.slice(0, -2);
    }
    if (text !== String(value ?? "")) text += "…";
    ctx.fillText(text, W - padX, y);
    ctx.textAlign = "left";
  });

  // Footer
  const fy = headerH + rows.length * rowH;
  ctx.strokeStyle = "#e5e5e5";
  ctx.beginPath();
  ctx.moveTo(padX, fy + 8);
  ctx.lineTo(W - padX, fy + 8);
  ctx.stroke();

  ctx.fillStyle = "#a3a3a3";
  ctx.font = "500 11px Arial, sans-serif";
  ctx.fillText("Keep this receipt for your records.", padX, fy + 34);
  ctx.fillText(
    "A confirmation has also been sent to your email.",
    padX,
    fy + 52,
  );

  return canvas;
}

function downloadReceipt(data) {
  const canvas = buildReceiptCanvas(data);
  const safeName = String(data.name || "receipt")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const link = document.createElement("a");
  link.download = `baglabhairav-receipt-${safeName || "receipt"}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export default function CheckoutForm({ category }) {
  const { t, lang } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [formError, setFormError] = useState(""); // global (payment/network/terms)
  const [termsError, setTermsError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({}); // per-field, shown below field
  const [successData, setSuccessData] = useState(null);
  const [formData, setFormData] = useState({
    salutation: "",
    firstName: "",
    lastName: "",
    gotra: "",
    gender: "",
    dob: "",
    email: "",
    phone: "",
    pincode: "",
    taluka: "",
    state: "",
    problem: "",
    attendeesCount: 1,
    donation: "",
  });

  // Admin-configured field visibility/requirements (null = still loading → defaults).
  const [serverFields, setServerFields] = useState(null);
  const [customValues, setCustomValues] = useState({});
  const [payAdvance, setPayAdvance] = useState(false);

  useEffect(() => {
    fetch(`/api/form-fields?categoryId=${category.id}`)
      .then((r) => r.json())
      .then((d) => setServerFields(Array.isArray(d.fields) ? d.fields : []))
      .catch(() => setServerFields([]));
  }, [category.id]);

  const builtinByKey = {};
  (serverFields || []).forEach((f) => {
    if (!f.is_custom) builtinByKey[f.field_key] = f;
  });
  const customFields = (serverFields || []).filter((f) => f.is_custom);

  const isVisible = (key) => {
    if (CORE_KEYS.has(key)) return true;
    if (serverFields === null) return true;
    return !!builtinByKey[key];
  };
  const isRequired = (key) => {
    if (CORE_KEYS.has(key)) return true;
    if (serverFields === null) return !!BUILTIN_DEFAULT_REQUIRED[key];
    return !!builtinByKey[key]?.is_required;
  };
  const customLabel = (f) =>
    lang === "hi" && f.label_hi ? f.label_hi : f.label;

  const isEnquiry = category.is_enquiry_only === true;
  const donationValue = isEnquiry
    ? 0
    : Math.max(0, parseFloat(formData.donation) || 0);
  const totalAmount = isEnquiry ? 0 : category.price + donationValue;

  // Part payment (advance = % of PRICE only, never the donation).
  const canPartPay = !isEnquiry && category.allow_part_payment === true && category.price > 0;
  const advancePct = Math.min(100, Math.max(1, Number(category.advance_percent) || 25));
  const advanceAmount = canPartPay ? Math.round(category.price * (advancePct / 100)) : 0;
  const balanceAmount = canPartPay ? totalAmount - advanceAmount : 0;
  const usePartial = canPartPay && payAdvance;
  const payNow = usePartial ? advanceAmount : totalAmount;

  const clearError = (name) =>
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });

  const handleChange = (e) => {
    setFormError("");
    clearError(e.target.name);
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePincodeChange = async (e) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length > 6) return;
    clearError("pincode");
    setFormData((prev) => ({ ...prev, pincode: value }));
    if (value.length === 6) {
      try {
        const response = await fetch(
          `https://api.postalpincode.in/pincode/${value}`,
        );
        const data = await response.json();
        if (data[0].Status === "Success") {
          const postOffice = data[0].PostOffice[0];
          setFormData((prev) => ({
            ...prev,
            taluka: postOffice.Block || postOffice.Name || "",
            state: postOffice.State || "",
          }));
        } else {
          setFieldErrors((prev) => ({
            ...prev,
            pincode:
              t("alert_pincode_invalid") || "Invalid pincode. Please check it.",
          }));
          setFormData((prev) => ({ ...prev, taluka: "", state: "" }));
        }
      } catch {}
    }
  };

  // Returns a { [field]: message } object; empty means valid.
  const validate = () => {
    const errs = {};
    if (!validatePhone(formData.phone)) {
      errs.phone =
        "Enter a valid 10-digit Indian mobile number (starts with 6-9).";
    }
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      errs.email = "Enter a valid email address.";
    }
    if (isVisible("dob") && formData.dob && formData.dob > TODAY_STR) {
      errs.dob = "Date of birth cannot be a future date.";
    }
    if (isVisible("problem") && hasHtml(formData.problem)) {
      errs.problem = "Plain text only — HTML and scripts are not allowed.";
    }

    const labels = {
      salutation: t("form_title"),
      gotra: t("form_gotra"),
      gender: t("form_gender"),
      dob: t("form_dob"),
      pincode: t("form_pincode"),
      problem: t("form_problem"),
    };
    for (const key of [
      "salutation",
      "gotra",
      "gender",
      "dob",
      "pincode",
      "problem",
    ]) {
      if (
        isVisible(key) &&
        isRequired(key) &&
        !errs[key] &&
        !String(formData[key] || "").trim()
      ) {
        errs[key] = `${labels[key]} is required.`;
      }
    }

    for (const f of customFields) {
      const v = customValues[f.field_key];
      if (typeof v === "string" && hasHtml(v)) {
        errs[f.field_key] = `${customLabel(f)} must be plain text.`;
      } else if (f.is_required && !String(v || "").trim()) {
        errs[f.field_key] = `${customLabel(f)} is required.`;
      }
    }
    return errs;
  };

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handlePayment = async (e) => {
    e.preventDefault();
    setFormError("");
    setTermsError("");

    if (!agreedToTerms) {
      setTermsError(
        t("alert_terms") || "Please agree to the terms and conditions.",
      );
      return;
    }

    const errs = validate();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setLoading(true);

    const attendeePayload = {
      salutation: formData.salutation,
      firstName: formData.firstName,
      lastName: formData.lastName,
      gotra: formData.gotra,
      gender: formData.gender,
      dob: formData.dob,
      email: formData.email,
      phone: formData.phone,
      pincode: formData.pincode,
      taluka: formData.taluka,
      state: formData.state,
      problem: formData.problem,
    };

    const fullName =
      `${formData.salutation} ${formData.firstName} ${formData.lastName}`.trim();

    // ── ENQUIRY ──────────────────────────────────────────────────────
    if (isEnquiry) {
      try {
        const res = await fetch("/api/enquiry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryId: category.id,
            attendeesCount: formData.attendeesCount,
            agreedToTerms,
            attendee: attendeePayload,
            customFields: customValues,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setFormError(
            data.error || "Enquiry submission failed. Please try again.",
          );
          setLoading(false);
          return;
        }
        setSuccessData({
          isEnquiry: true,
          name: fullName,
          email: formData.email,
          phone: formData.phone,
          gotra: formData.gotra,
        });
      } catch {
        setFormError("Network error. Please try again.");
      }
      setLoading(false);
      return;
    }

    // ── PAID CHECKOUT ─────────────────────────────────────────────────
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setFormError(
        t("alert_razorpay_fail") ||
          "Could not load payment gateway. Please check your internet.",
      );
      setLoading(false);
      return;
    }

    const orderResponse = await fetch("/api/razorpay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: category.id,
        donation: formData.donation,
        attendeesCount: formData.attendeesCount,
        agreedToTerms,
        attendee: attendeePayload,
        customFields: customValues,
        paymentPlan: usePartial ? "partial" : "full",
      }),
    });
    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
      setFormError(orderData.error || "Server error. Please try again.");
      setLoading(false);
      return;
    }
    if (!orderData.orderId) {
      setFormError("Payment gateway error: no Order ID returned.");
      setLoading(false);
      return;
    }

    const options = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency || "INR",
      name: "BaglaBhairav",
      description: "Registration & Contribution",
      order_id: orderData.orderId,
      handler: async function (response) {
        setSuccessData({
          paymentId: response.razorpay_payment_id,
          orderId: response.razorpay_order_id,
          name: fullName,
          email: formData.email,
          phone: formData.phone,
          gotra: formData.gotra,
          amount: totalAmount,
          category: category.title,
          attendees: formData.attendeesCount,
          partial: usePartial,
          paidNow: payNow,
          balance: usePartial ? balanceAmount : 0,
        });
        setLoading(false);
      },
      prefill: {
        name: fullName,
        email: formData.email,
        contact: formData.phone,
      },
      theme: { color: "#ea580c" },
    };
    const paymentObject = new window.Razorpay(options);
    paymentObject.on("payment.failed", function () {
      setFormError(
        t("alert_payment_failed") ||
          "Payment failed. Please try again or use a different payment method.",
      );
      setLoading(false);
    });
    paymentObject.open();
    setLoading(false);
  };

  // ── SUCCESS STATE ─────────────────────────────────────────────────────
  if (successData) {
    return (
      <div className="text-center py-8 px-4">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-black text-neutral-900 mb-1">
          {successData.isEnquiry
            ? "Enquiry Received!"
            : successData.partial
              ? "Advance Received!"
              : "Payment Successful!"}
        </h2>
        <p className="text-neutral-500 text-sm mb-6">
          {successData.isEnquiry
            ? "Our team will contact you shortly."
            : successData.partial
              ? "Pay the balance to confirm your registration."
              : "Your registration is confirmed."}
        </p>

        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 text-left space-y-3 max-w-sm mx-auto mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Name</span>
            <span className="font-semibold text-neutral-900">
              {successData.name}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Email</span>
            <span className="font-semibold text-neutral-900 break-all">
              {successData.email}
            </span>
          </div>
          {!successData.isEnquiry && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Category</span>
                <span className="font-semibold text-neutral-900">
                  {successData.category}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Attendees</span>
                <span className="font-semibold text-neutral-900">
                  {successData.attendees} Person(s)
                </span>
              </div>
              <div className="flex justify-between text-sm border-t border-neutral-200 pt-3 mt-1">
                <span className="text-neutral-500">Payment Status</span>
                <span className={`font-bold ${successData.partial ? "text-amber-600" : "text-green-600"}`}>
                  {successData.partial ? "◐ Advance Paid" : "✓ Paid"}
                </span>
              </div>
              {successData.partial ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Advance Paid</span>
                    <span className="font-bold text-neutral-900">₹{successData.paidNow.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Balance Due</span>
                    <span className="font-bold text-orange-600">₹{successData.balance.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Total</span>
                    <span className="font-bold text-neutral-900">₹{successData.amount.toLocaleString("en-IN")}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Amount</span>
                  <span className="font-bold text-neutral-900">
                    ₹{successData.amount.toLocaleString("en-IN")}
                  </span>
                </div>
              )}
              {successData.paymentId && (
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Payment Ref</span>
                  <span className="font-mono text-xs text-neutral-600 break-all">
                    {successData.paymentId}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 mb-6 px-4">
          <Mail className="w-4 h-4 flex-shrink-0" />
          <span>
            {successData.partial
              ? `Balance payment link sent to ${successData.email} & your WhatsApp. Your QR entry pass is sent before the event, after full payment.`
              : successData.isEnquiry
                ? `Confirmation sent to ${successData.email}`
                : `Confirmation email sent to ${successData.email}. Your QR entry pass will be sent a few days before the event.`}
          </span>
        </div>

        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => downloadReceipt(successData)}
            className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Receipt
          </button>

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

  // ── FORM ──────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handlePayment} noValidate className="space-y-8">
      {totalAmount >= 100000 && !isEnquiry && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>
            <strong>Note:</strong> {t("form_upi_warning")}
          </p>
        </div>
      )}

      {/* Global errors only (payment / network). Field errors render below each field. */}
      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{formError}</p>
        </div>
      )}

      {/* --- PERSONAL DETAILS --- */}
      <div>
        <h4 className="text-sm font-bold text-neutral-900 mb-4 uppercase tracking-wider">
          {t("form_personal_details")}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-1 md:col-span-2 flex gap-4">
            {isVisible("salutation") && (
              <TextField
                select
                label={t("form_title")}
                name="salutation"
                required={isRequired("salutation")}
                value={formData.salutation}
                onChange={handleChange}
                variant="outlined"
                size="medium"
                sx={{ width: "120px" }}
                error={!!fieldErrors.salutation}
              >
                <MenuItem value="Shri">{t("sal_shri")}</MenuItem>
                <MenuItem value="Smt">{t("sal_smt")}</MenuItem>
                <MenuItem value="Kumari">{t("sal_kumari")}</MenuItem>
                <MenuItem value="Kumar">{t("sal_kumar")}</MenuItem>
              </TextField>
            )}
            <TextField
              fullWidth
              label={t("form_first_name")}
              name="firstName"
              required
              value={formData.firstName}
              onChange={handleChange}
              variant="outlined"
              error={!!fieldErrors.firstName}
              helperText={fieldErrors.firstName}
            />
          </div>
          <TextField
            fullWidth
            label={t("form_last_name")}
            name="lastName"
            required
            value={formData.lastName}
            onChange={handleChange}
            variant="outlined"
            error={!!fieldErrors.lastName}
            helperText={fieldErrors.lastName}
          />
          {isVisible("gotra") && (
            <TextField
              fullWidth
              label={t("form_gotra")}
              name="gotra"
              required={isRequired("gotra")}
              value={formData.gotra}
              onChange={handleChange}
              variant="outlined"
              error={!!fieldErrors.gotra}
              helperText={fieldErrors.gotra}
            />
          )}
          {isVisible("gender") && (
            <TextField
              select
              fullWidth
              label={t("form_gender")}
              name="gender"
              required={isRequired("gender")}
              value={formData.gender}
              onChange={handleChange}
              variant="outlined"
              error={!!fieldErrors.gender}
              helperText={fieldErrors.gender}
            >
              <MenuItem value="Male">{t("form_gender_male")}</MenuItem>
              <MenuItem value="Female">{t("form_gender_female")}</MenuItem>
              <MenuItem value="Other">{t("form_gender_other")}</MenuItem>
            </TextField>
          )}
          {isVisible("dob") && (
            <TextField
              fullWidth
              label={t("form_dob")}
              name="dob"
              type="date"
              required={isRequired("dob")}
              value={formData.dob}
              onChange={handleChange}
              variant="outlined"
              error={!!fieldErrors.dob}
              helperText={fieldErrors.dob}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { max: TODAY_STR },
                input: adorn(<Calendar className="w-5 h-5 text-neutral-400" />),
              }}
            />
          )}
        </div>
      </div>

      {/* --- CONTACT & LOCATION --- */}
      <div>
        <h4 className="text-sm font-bold text-neutral-900 mb-4 uppercase tracking-wider">
          {t("form_contact_location")}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            fullWidth
            label={t("form_whatsapp")}
            name="phone"
            type="tel"
            required
            value={formData.phone}
            onChange={handleChange}
            variant="outlined"
            error={!!fieldErrors.phone}
            helperText={fieldErrors.phone || "10-digit Indian mobile number"}
            slotProps={{
              input: adorn(<Phone className="w-5 h-5 text-neutral-400" />),
            }}
          />
          <TextField
            fullWidth
            label={t("form_email")}
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleChange}
            variant="outlined"
            error={!!fieldErrors.email}
            helperText={fieldErrors.email}
            slotProps={{
              input: adorn(<Mail className="w-5 h-5 text-neutral-400" />),
            }}
          />
          {isVisible("pincode") && (
            <TextField
              fullWidth
              label={t("form_pincode")}
              name="pincode"
              required={isRequired("pincode")}
              value={formData.pincode}
              onChange={handlePincodeChange}
              variant="outlined"
              error={!!fieldErrors.pincode}
              helperText={fieldErrors.pincode}
              slotProps={{
                htmlInput: { maxLength: 6, inputMode: "numeric" },
                input: adorn(<MapPin className="w-5 h-5 text-neutral-400" />),
              }}
            />
          )}
          {isVisible("pincode") && (
            <div className="flex gap-2">
              <TextField
                fullWidth
                label={t("form_taluka")}
                name="taluka"
                value={formData.taluka}
                variant="filled"
                slotProps={{ input: { readOnly: true } }}
              />
              <TextField
                fullWidth
                label={t("form_state")}
                name="state"
                value={formData.state}
                variant="filled"
                slotProps={{ input: { readOnly: true } }}
              />
            </div>
          )}
        </div>
      </div>

      {/* --- ADDITIONAL DETAILS & DONATION --- */}
      <div>
        <h4 className="text-sm font-bold text-neutral-900 mb-4 uppercase tracking-wider">
          {t("form_event_contribution")}
        </h4>
        <div className="grid grid-cols-1 gap-4">
          {isVisible("problem") && (
            <TextField
              fullWidth
              label={t("form_problem")}
              name="problem"
              required={isRequired("problem")}
              multiline
              rows={3}
              value={formData.problem}
              onChange={handleChange}
              variant="outlined"
              error={!!fieldErrors.problem}
              helperText={fieldErrors.problem}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment
                      position="start"
                      sx={{ alignSelf: "flex-start", mt: 1.5 }}
                    >
                      <MessageSquare className="w-5 h-5 text-neutral-400" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          )}

          {/* Admin-defined custom fields */}
          {customFields.map((f) => {
            const val = customValues[f.field_key] ?? "";
            const err = fieldErrors[f.field_key];
            const onCustom = (e) => {
              clearError(f.field_key);
              setCustomValues((prev) => ({
                ...prev,
                [f.field_key]: e.target.value,
              }));
            };
            const common = {
              fullWidth: true,
              label: customLabel(f),
              required: f.is_required,
              value: val,
              onChange: onCustom,
              variant: "outlined",
              error: !!err,
              helperText: err,
            };
            if (f.field_type === "select") {
              return (
                <TextField select key={f.field_key} {...common}>
                  {(f.options || []).map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt}
                    </MenuItem>
                  ))}
                </TextField>
              );
            }
            if (f.field_type === "textarea") {
              return (
                <TextField key={f.field_key} multiline rows={3} {...common} />
              );
            }
            if (f.field_type === "date") {
              return (
                <TextField
                  key={f.field_key}
                  type="date"
                  {...common}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              );
            }
            return (
              <TextField
                key={f.field_key}
                type={f.field_type === "number" ? "number" : "text"}
                {...common}
              />
            );
          })}

          <TextField
            select
            fullWidth
            label={t("form_attendees")}
            name="attendeesCount"
            required
            value={formData.attendeesCount}
            onChange={handleChange}
            variant="outlined"
            slotProps={{
              input: adorn(<Users className="w-5 h-5 text-neutral-400" />),
            }}
          >
            {Array.from(
              { length: category.max_attendees_per_reg || 5 },
              (_, i) => i + 1,
            ).map((n) => (
              <MenuItem key={n} value={String(n)}>
                {n} {n === 1 ? "Person" : "People"}
              </MenuItem>
            ))}
          </TextField>

          {!isEnquiry && (
            <div className="mt-4 p-6 border border-orange-100 bg-orange-50/50 rounded-xl">
              <h4 className="text-sm font-bold text-orange-900 mb-2 flex items-center gap-2">
                <Heart className="w-4 h-4 text-orange-600" />
                {t("form_donation_title")}
              </h4>
              <p className="text-xs text-orange-700 mb-4">
                {t("form_donation_desc")}
              </p>
              <TextField
                fullWidth
                label={t("form_donation_amount")}
                name="donation"
                type="number"
                value={formData.donation}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  const safe = isNaN(val) ? "" : String(Math.max(0, val));
                  setFormData((prev) => ({ ...prev, donation: safe }));
                }}
                variant="outlined"
                placeholder="0"
                slotProps={{
                  htmlInput: { min: 0, step: 1 },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">₹</InputAdornment>
                    ),
                  },
                }}
              />
            </div>
          )}

          {/* --- PART PAYMENT OPTION --- */}
          {canPartPay && (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPayAdvance(false)}
                className={`text-left p-4 rounded-xl border-2 transition ${!payAdvance ? "border-orange-500 bg-orange-50" : "border-neutral-200 hover:border-neutral-300"}`}
              >
                <div className="font-bold text-neutral-900 text-sm">Pay Full</div>
                <div className="text-2xl font-black text-orange-600 mt-1">₹{totalAmount.toLocaleString("en-IN")}</div>
                <div className="text-xs text-neutral-500 mt-1">Complete payment now</div>
              </button>
              <button
                type="button"
                onClick={() => setPayAdvance(true)}
                className={`text-left p-4 rounded-xl border-2 transition ${payAdvance ? "border-orange-500 bg-orange-50" : "border-neutral-200 hover:border-neutral-300"}`}
              >
                <div className="font-bold text-neutral-900 text-sm">Pay {advancePct}% Advance</div>
                <div className="text-2xl font-black text-orange-600 mt-1">₹{advanceAmount.toLocaleString("en-IN")}</div>
                <div className="text-xs text-neutral-500 mt-1">Balance ₹{balanceAmount.toLocaleString("en-IN")} via link later</div>
              </button>
              {payAdvance && (
                <p className="sm:col-span-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  We&apos;ll send a payment link for the ₹{balanceAmount.toLocaleString("en-IN")} balance by email &amp; WhatsApp. Your entry pass is issued only after full payment. <strong>No-refund policy applies.</strong>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* --- LEGAL CHECKBOX --- */}
      <div className="pt-4 pb-2">
        <FormControlLabel
          control={
            <Checkbox
              checked={agreedToTerms}
              onChange={(e) => {
                setAgreedToTerms(e.target.checked);
                if (e.target.checked) setTermsError("");
              }}
              sx={{ color: "#a3a3a3", "&.Mui-checked": { color: "#ea580c" } }}
            />
          }
          label={
            <span className="text-sm text-neutral-600">
              {t("form_terms_prefix")}{" "}
              <a
                href="/terms"
                className="text-orange-600 hover:underline"
                target="_blank"
              >
                {t("form_terms_link")}
              </a>
              {", "}
              <a
                href="/privacy"
                className="text-orange-600 hover:underline"
                target="_blank"
              >
                {t("form_privacy_link")}
              </a>
              {` ${t("form_terms_and")} `}
              <a
                href="/refund"
                className="text-orange-600 hover:underline"
                target="_blank"
              >
                {t("form_refund_link")}
              </a>
              {t("form_terms_suffix")}
            </span>
          }
        />
        {termsError && (
          <p className="text-red-600 text-xs mt-1 ml-2">{termsError}</p>
        )}
      </div>

      {/* --- SUBMISSION --- */}
      <div>
        <Button
          type="submit"
          variant="contained"
          disabled={loading || !agreedToTerms}
          fullWidth
          sx={{
            py: 1.5,
            backgroundColor: "#171717",
            "&:hover": { backgroundColor: "#ea580c" },
            "&:disabled": { backgroundColor: "#d4d4d4", color: "#737373" },
            textTransform: "none",
            fontSize: "1.05rem",
            fontWeight: 600,
          }}
        >
          {loading
            ? t("form_processing")
            : isEnquiry
              ? t("form_submit_enquiry")
              : usePartial
                ? `Pay ₹${payNow.toLocaleString("en-IN")} Advance Securely`
                : t("form_pay_button", totalAmount)}
        </Button>

        {!isEnquiry && (
          <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 pt-3">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            <span>{t("form_secure_badge")}</span>
          </div>
        )}
      </div>
    </form>
  );
}
