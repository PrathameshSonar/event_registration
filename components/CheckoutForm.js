// components/CheckoutForm.js
"use client";

import { useState, useEffect, useRef } from "react";
import { useBranding } from "@/components/BrandingProvider";
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
  Loader2,
  ScrollText,
  ArrowLeft,
  ArrowRight,
  Check,
} from "lucide-react";
import {
  TextField,
  MenuItem,
  InputAdornment,
  Checkbox,
  FormControlLabel,
  createTheme,
  ThemeProvider,
} from "@mui/material";
import { useLanguage } from "./LanguageProvider";
import CheckoutSuccess from "./checkout/CheckoutSuccess";
import { pick } from "@/lib/i18n";
import { BUILTIN_FIELDS, CORE_KEYS } from "@/lib/formFields";
import { ageError, ageLimitLabel } from "@/lib/age";

const TODAY_STR = new Date().toISOString().split("T")[0];

// Warm the MUI fields to the temple/luxury palette: rounded corners, gold-tinted
// borders, vermillion focus — instead of the default grey Material look.
const GOLD = "#c9911f";
const VERMILLION = "#b8322a";
const luxTheme = createTheme({
  palette: { primary: { main: VERMILLION } },
  shape: { borderRadius: 12 },
  typography: { fontFamily: "var(--font-inter), Inter, sans-serif" },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "#fffdf8",
          "& fieldset": { borderColor: "rgba(201,145,31,0.30)" },
          "&:hover fieldset": { borderColor: "rgba(201,145,31,0.55)" },
          "&.Mui-focused fieldset": { borderColor: GOLD, borderWidth: 2 },
        },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { "&.Mui-focused": { color: VERMILLION } } } },
  },
});
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

export default function CheckoutForm({ category, paymentSettings = null }) {
  const { site_name: siteName } = useBranding();
  const { t, lang } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [submitAction, setSubmitAction] = useState("pay"); // 'pay' | 'enquire' | 'offline'
  const [paymentMethod, setPaymentMethod] = useState("razorpay"); // 'razorpay' | 'bank_transfer' | 'cheque' | 'cash' | 'dd'
  const [offlineReference, setOfflineReference] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [formError, setFormError] = useState(""); // global (payment/network/terms)
  const [termsError, setTermsError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({}); // per-field, shown below field
  const [successData, setSuccessData] = useState(null);
  // Declaration / Samanti Patra — when enabled it becomes STEP 1 of a 2-step flow
  // (declaration + identity → then the full form). Fetched client-side.
  const [declaration, setDeclaration] = useState(null);
  const [step, setStep] = useState(1);
  const [declAccepted, setDeclAccepted] = useState(false);
  const [declAtEnd, setDeclAtEnd] = useState(false);
  const declBodyRef = useRef(null);
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

  // Names of additional attendees (positions 2..N; the primary is the main form).
  const [attendeeNames, setAttendeeNames] = useState([]);
  const setAttendeeName = (i, val) =>
    setAttendeeNames((prev) => { const next = [...prev]; next[i] = val; return next; });

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

  useEffect(() => {
    fetch("/api/declaration")
      .then((r) => r.json())
      .then((d) => setDeclaration(d?.declaration || null))
      .catch(() => setDeclaration(null));
  }, []);

  // If the declaration text is short enough that it doesn't scroll, treat it as
  // already read so the accept checkbox is enabled.
  useEffect(() => {
    const el = declBodyRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 8) setDeclAtEnd(true);
  }, [declaration, step, lang]);

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
  const customLabel = (f) => pick(f, "label", lang);

  // `isEnquiry` = the tier is ENQUIRY-ONLY (no direct pay, no price shown).
  // `showEnquireBtn` = also offer "Enquire Now" next to "Pay" on a payable tier.
  const isEnquiry = category.is_enquiry_only === true;
  const showEnquireBtn = isEnquiry || category.allow_enquiry === true;
  const hasAgeLimit = (Number(category.min_age) || 0) > 0 || (Number(category.max_age) || 0) > 0;
  const ageLabel = ageLimitLabel(category);

  // Offline payment (bank transfer / cheque / cash / DD) — only for payable tiers,
  // only when enabled in global settings, and only for the methods enabled there.
  const offlineMethods = Array.isArray(paymentSettings?.methods) ? paymentSettings.methods : [];
  const offlineEnabled = !isEnquiry && paymentSettings?.offline_enabled === true && category.price > 0 && offlineMethods.length > 0;
  const isOffline = paymentMethod !== "razorpay";
  const needsProof = paymentMethod === "bank_transfer" || paymentMethod === "cheque";
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
    // Names + gotra: letters only (allows spaces, . ' - and any language script).
    const lettersOnly = /^[\p{L}\s.'-]+$/u;
    if (!String(formData.firstName || "").trim()) {
      errs.firstName = `${t("form_first_name")} is required.`;
    } else if (!lettersOnly.test(formData.firstName.trim())) {
      errs.firstName = "Only letters are allowed.";
    }
    if (!String(formData.lastName || "").trim()) {
      errs.lastName = `${t("form_last_name")} is required.`;
    } else if (!lettersOnly.test(formData.lastName.trim())) {
      errs.lastName = "Only letters are allowed.";
    }
    if (isVisible("gotra") && formData.gotra && !lettersOnly.test(formData.gotra.trim())) {
      errs.gotra = "Only letters are allowed.";
    }
    // Donation must be a non-negative number.
    if (formData.donation !== "" && formData.donation != null && !/^\d+(\.\d{1,2})?$/.test(String(formData.donation))) {
      errs.donation = "Enter a valid amount (numbers only).";
    }
    // Pincode FORMAT is checked whenever a value is present; whether it is
    // *required* is the admin's call per tier (Form Fields) and is handled by the
    // generic isVisible/isRequired loop below — same as gotra, DOB, etc. The
    // servers mirror this exactly, so an optional pincode really is optional.
    const pin = String(formData.pincode || "").trim();
    if (pin && !/^\d{6}$/.test(pin)) {
      errs.pincode = "Enter a valid 6-digit pincode.";
    }
    if (isVisible("dob") && formData.dob && formData.dob > TODAY_STR) {
      errs.dob = "Date of birth cannot be a future date.";
    }
    // Per-tier age restriction. DOB becomes required when the tier limits age.
    if (hasAgeLimit) {
      if (!formData.dob) {
        errs.dob = "Date of birth is required for this tier.";
      } else {
        const ae = ageError(category, formData.dob);
        if (ae) errs.dob = ae;
      }
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

  const handlePayment = async (e, intent = "pay") => {
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
      // Without this, tapping Pay at the bottom of a long form with an error up
      // top does nothing visible — reads as a broken button. Announce it and
      // bring the first invalid field into view.
      setFormError(
        t("alert_fix_fields") || "Please fix the highlighted fields below.",
      );
      requestAnimationFrame(() => {
        const firstKey = Object.keys(errs)[0];
        const el = document.querySelector(`[name="${firstKey}"]`);
        (el || document.querySelector("form"))?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        if (el && typeof el.focus === "function") el.focus({ preventScroll: true });
      });
      return;
    }
    setFieldErrors({});
    // Enquiry-only tiers always enquire; on a dual tier the clicked button decides.
    const asEnquiry = isEnquiry || intent === "enquire";
    const asOffline = !asEnquiry && isOffline;
    if (asOffline && needsProof && !proofFile) {
      setFormError(paymentMethod === "cheque" ? "Please attach a photo of the cheque." : "Please attach a payment screenshot.");
      return;
    }
    setSubmitAction(asEnquiry ? "enquire" : asOffline ? "offline" : "pay");
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

    // Group attendee names: primary first, then any additional names provided.
    const extraCount = Math.max(0, (parseInt(formData.attendeesCount, 10) || 1) - 1);
    const attendeesList = [
      { name: `${formData.firstName} ${formData.lastName}`.trim() },
      ...Array.from({ length: extraCount }, (_, i) => (attendeeNames[i] || "").trim())
        .filter(Boolean)
        .map((name) => ({ name })),
    ];

    // ── ENQUIRY ──────────────────────────────────────────────────────
    if (asEnquiry) {
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

    // ── OFFLINE PAYMENT (bank transfer / cheque / cash / DD) ──────────
    if (asOffline) {
      try {
        const fd = new FormData();
        fd.append("categoryId", category.id);
        fd.append("paymentMethod", paymentMethod);
        fd.append("offlineReference", offlineReference);
        fd.append("paymentPlan", usePartial ? "partial" : "full");
        fd.append("agreedToTerms", "true");
        fd.append("attendee", JSON.stringify(attendeePayload));
        fd.append("attendees", JSON.stringify(attendeesList));
        fd.append("customFields", JSON.stringify(customValues));
        fd.append("donation", String(formData.donation || 0));
        fd.append("attendeesCount", String(formData.attendeesCount));
        if (proofFile) fd.append("proof", proofFile);

        const res = await fetch("/api/offline-payment", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) {
          setFormError(data.error || "Submission failed. Please try again.");
          setLoading(false);
          return;
        }
        setSuccessData({
          offlineReview: true,
          method: paymentMethod,
          reference: offlineReference,
          name: fullName,
          email: formData.email,
          category: category.title,
          amount: totalAmount,
          attendees: formData.attendeesCount,
          partial: usePartial,
          paidNow: payNow,
          balance: usePartial ? balanceAmount : 0,
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

    // Wrapped in try/catch: without it, a dropped connection here rejects
    // unhandled and the full-screen gateway loader stays up forever with no way
    // out but a page reload — the worst failure on the most-used path.
    let orderResponse, orderData;
    try {
      orderResponse = await fetch("/api/razorpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: category.id,
          donation: formData.donation,
          attendeesCount: formData.attendeesCount,
          agreedToTerms,
          attendee: attendeePayload,
          attendees: attendeesList,
          customFields: customValues,
          paymentPlan: usePartial ? "partial" : "full",
        }),
      });
      orderData = await orderResponse.json();
    } catch {
      setFormError(
        t("alert_network") ||
          "Network error while starting payment. Check your connection and try again.",
      );
      setLoading(false);
      return;
    }

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
      name: siteName,
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
      // Closing the gateway without paying should leave a clear note, not a
      // silent return to the form (a common drop-off point).
      modal: {
        ondismiss: function () {
          setFormError(
            t("alert_payment_cancelled") ||
              "Payment cancelled — you can try again whenever you're ready.",
          );
          setLoading(false);
        },
      },
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
  if (successData) return <CheckoutSuccess data={{ ...successData, siteName }} />;

  // Reactive validity — mirrors validate() so the submit button stays DISABLED
  // until terms are agreed and every required field is filled/valid (instead of
  // only erroring on click). Enquiry doesn't need the offline payment proof.
  const coreValid = agreedToTerms && Object.keys(validate()).length === 0;
  const payValid = coreValid && !(isOffline && needsProof && !proofFile);

  // ── DECLARATION (Samanti Patra) — step 1 of 2 when enabled ─────────────
  const declTitle = declaration?.title?.[lang] || declaration?.title?.en || t("declaration_title") || "Declaration";
  const declBody = declaration?.body?.[lang] || declaration?.body?.en || "";
  const twoStep = !!(declaration?.enabled && declBody);

  const nameOk = (v) => !!String(v || "").trim() && /^[\p{L}\s.'-]+$/u.test(String(v).trim());
  const step1Valid =
    declAccepted &&
    nameOk(formData.firstName) && nameOk(formData.lastName) &&
    !!formData.dob && formData.dob <= TODAY_STR && (!hasAgeLimit || !ageError(category, formData.dob)) &&
    validatePhone(formData.phone);

  const onDeclScroll = (e) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setDeclAtEnd(true);
  };
  const goToDetails = () => {
    if (!step1Valid) return;
    setStep(2);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const StepProgress = ({ current }) => (
    <div className="flex items-center gap-2">
      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${current >= 1 ? "bg-vermillion text-white shadow-sm" : "bg-gold/15 text-brown/50"}`}>{current > 1 ? <Check className="w-3.5 h-3.5" /> : "1"}</span>
      <span className={`h-0.5 w-5 ${current > 1 ? "bg-vermillion" : "bg-gold/20"}`} />
      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${current >= 2 ? "bg-vermillion text-white shadow-sm" : "bg-gold/15 text-brown/50"}`}>2</span>
      <span className="ml-1.5 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-brown/55 truncate">
        {current === 1 ? (t("declaration_step_label") || "Declaration") : (t("declaration_step2_label") || "Your details")}
      </span>
    </div>
  );

  if (twoStep && step === 1) {
    return (
      <ThemeProvider theme={luxTheme}>
      <div className="space-y-5">
        <StepProgress current={1} />

        <div>
          <div className="flex items-center gap-2 mb-3">
            <ScrollText className="w-5 h-5 text-orange-600 shrink-0" />
            <h3 className="text-base sm:text-lg font-bold text-neutral-900 leading-tight">{declTitle}</h3>
          </div>
          <div ref={declBodyRef} onScroll={onDeclScroll} className="max-h-60 sm:max-h-72 overflow-y-auto rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 sm:p-4 text-[13.5px] sm:text-[14px] leading-[1.75] text-neutral-700 whitespace-pre-wrap">
            {declBody}
          </div>
          {!declAtEnd && <p className="mt-2 text-xs text-neutral-400">{t("declaration_scroll_hint") || "Please scroll to the bottom to continue."}</p>}
        </div>

        <div>
          <h4 className="text-sm font-bold text-neutral-900 mb-3 uppercase tracking-wider">{t("declaration_your_details") || "Your details (for this declaration)"}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-5">
            <TextField fullWidth size="small" label={t("form_first_name")} name="firstName" required value={formData.firstName} onChange={handleChange} variant="outlined" />
            <TextField fullWidth size="small" label={t("form_last_name")} name="lastName" required value={formData.lastName} onChange={handleChange} variant="outlined" />
            <TextField fullWidth size="small" label={t("form_dob")} name="dob" type="date" required value={formData.dob} onChange={handleChange} variant="outlined" slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: TODAY_STR }, input: adorn(<Calendar className="w-5 h-5 text-neutral-400" />) }} />
            <TextField fullWidth size="small" label={t("form_whatsapp")} name="phone" type="tel" required value={formData.phone} onChange={handleChange} variant="outlined" slotProps={{ input: adorn(<Phone className="w-5 h-5 text-neutral-400" />), htmlInput: { inputMode: "numeric", maxLength: 13 } }} />
          </div>
        </div>

        <FormControlLabel
          control={<Checkbox checked={declAccepted} disabled={!declAtEnd} onChange={(e) => setDeclAccepted(e.target.checked)} />}
          label={<span className="text-sm text-neutral-700">{t("declaration_accept_personal") || "I have read and I accept the above declaration."}</span>}
        />

        <button type="button" onClick={goToDetails} disabled={!step1Valid}
          className="btn-gold w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">
          {t("declaration_continue") || "Accept & Continue"} <ArrowRight className="w-4 h-4" />
        </button>
        {declAtEnd && !step1Valid && (
          <p className="text-center text-xs text-neutral-400">{t("declaration_step1_hint") || "Fill your name, date of birth and mobile, then accept to continue."}</p>
        )}
      </div>
      </ThemeProvider>
    );
  }

  // ── FORM ──────────────────────────────────────────────────────────────
  return (
    <ThemeProvider theme={luxTheme}>
    <form onSubmit={handlePayment} noValidate className="space-y-6 md:space-y-8">
      {twoStep && (
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-neutral-100">
          <StepProgress current={2} />
          <button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 h-8 text-xs font-semibold text-neutral-600 hover:border-orange-300 hover:text-orange-600 transition shrink-0">
            <ArrowLeft className="w-3.5 h-3.5" /> {t("declaration_back_short") || "Back"}
          </button>
        </div>
      )}
      {/* Full-screen loader while we create the order + load Razorpay, before
          the gateway modal appears — so the wait never looks frozen. Sits below
          Razorpay's own overlay (which takes over once the modal opens). */}
      {loading && submitAction === "pay" && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 bg-neutral-900/70 backdrop-blur-sm px-6 text-center">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
          <p className="text-white font-semibold text-lg">{t("form_gateway_opening")}</p>
          <p className="text-neutral-300 text-sm max-w-xs">{t("form_gateway_wait")}</p>
        </div>
      )}

      {totalAmount >= 100000 && !isEnquiry && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>
            <strong>Note:</strong> {t("form_upi_warning")}
          </p>
        </div>
      )}

      {hasAgeLimit && ageLabel && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{t("form_age_restricted", ageLabel)}</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
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
              helperText={fieldErrors.gotra || t("form_gotra_hint")}
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
          {(isVisible("dob") || hasAgeLimit) && (
            <TextField
              fullWidth
              label={t("form_dob")}
              name="dob"
              type="date"
              required={isRequired("dob") || hasAgeLimit}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
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
              htmlInput: { inputMode: "numeric", maxLength: 13 },
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
          {/* Pincode follows the tier's Form Fields config like every other
              non-core field. It drives the taluka/state autofill, so hiding it
              simply means those are typed by hand (or hidden too). */}
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
        </div>
      </div>

      {/* --- ADDITIONAL DETAILS & DONATION --- */}
      <div>
        <h4 className="text-sm font-bold text-neutral-900 mb-4 uppercase tracking-wider">
          {t("form_event_contribution")}
        </h4>
        {/* space-y-6, not 4: an MUI floating label sits ABOVE its field's top
            border, so a 16px gap leaves only ~8px of real clearance and the next
            label collides with the previous field's bottom border. */}
        <div className="space-y-6">
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

          {/* Names of the additional attendees (optional but helps at the gate). */}
          {(parseInt(formData.attendeesCount, 10) || 1) > 1 && (
            <div className="sm:col-span-2 space-y-2">
              <p className="text-xs font-semibold text-neutral-500">{t("form_attendee_names") || "Names of accompanying attendees (optional)"}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: (parseInt(formData.attendeesCount, 10) || 1) - 1 }, (_, i) => (
                  <input
                    key={i}
                    value={attendeeNames[i] || ""}
                    onChange={(e) => setAttendeeName(i, e.target.value)}
                    placeholder={`Attendee ${i + 2} name`}
                    className="w-full px-3 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                  />
                ))}
              </div>
            </div>
          )}

          {/* --- PART PAYMENT OPTION --- */}
          {/* Comes BEFORE the donation box on purpose: decide how you're paying the
              Seva fee first, then decide on an optional extra on top. */}
          {canPartPay && (
            <div className="mt-2 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPayAdvance(false)}
                className={`text-left p-3 rounded-xl border-2 transition ${!payAdvance ? "border-vermillion bg-vermillion/5" : "border-neutral-200 hover:border-neutral-300"}`}
              >
                <div className="font-bold text-neutral-900 text-[13px]">Pay Full</div>
                <div className="text-lg font-bold text-vermillion mt-0.5">₹{totalAmount.toLocaleString("en-IN")}</div>
                <div className="text-[11px] text-neutral-500 mt-0.5">Complete payment now</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPayAdvance(true);
                  // A part payment never carries a donation, so drop anything already
                  // typed — otherwise the shown total wouldn't match what's charged.
                  setFormData((prev) => (prev.donation ? { ...prev, donation: "" } : prev));
                }}
                className={`text-left p-3 rounded-xl border-2 transition ${payAdvance ? "border-vermillion bg-vermillion/5" : "border-neutral-200 hover:border-neutral-300"}`}
              >
                <div className="font-bold text-neutral-900 text-[13px]">Pay {advancePct}% Advance</div>
                <div className="text-lg font-bold text-vermillion mt-0.5">₹{advanceAmount.toLocaleString("en-IN")}</div>
                <div className="text-[11px] text-neutral-500 mt-0.5">Balance ₹{balanceAmount.toLocaleString("en-IN")} later</div>
              </button>
              {payAdvance && (
                <p className="col-span-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  We&apos;ll send a payment link for the ₹{balanceAmount.toLocaleString("en-IN")} balance by email &amp; WhatsApp. Your entry pass is issued only after full payment. <strong>No-refund policy applies.</strong>
                </p>
              )}
            </div>
          )}

          {/* On an advance plan the donation box is replaced by a pointer to the
              standalone Seva page: a part payment never carries a donation, so there
              is nothing to enter here and nothing to explain away later. */}
          {!isEnquiry && usePartial && (
            <div className="mt-4 p-5 border border-orange-100 bg-orange-50/50 rounded-xl">
              <h4 className="text-sm font-bold text-orange-900 mb-2 flex items-center gap-2">
                <Heart className="w-4 h-4 text-orange-600" />
                {t("form_donation_title")}
              </h4>
              <p className="text-xs text-orange-800 leading-relaxed">
                {t("form_donation_partial_note")}
              </p>
              <a
                href="/donate"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-orange-700 hover:text-orange-900 underline underline-offset-2"
              >
                {t("form_donation_partial_cta")}
              </a>
            </div>
          )}

          {!isEnquiry && !usePartial && (
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
                error={!!fieldErrors.donation}
                helperText={fieldErrors.donation}
                slotProps={{
                  htmlInput: { min: 0, step: 1, inputMode: "decimal" },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">₹</InputAdornment>
                    ),
                  },
                }}
              />
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

      {/* --- PAYMENT METHOD (only when offline is enabled for payable tiers) --- */}
      {offlineEnabled && (
        <div className="space-y-3">
          <label className="block text-sm font-bold text-neutral-800">
            {t("form_payment_method")}
          </label>
          <div className="flex flex-wrap gap-2">
            {[{ k: "razorpay", label: t("form_pay_online") }, ...offlineMethods.map((m) => ({ k: m, label: t(`form_method_${m}`) }))].map((opt) => (
              <button
                key={opt.k}
                type="button"
                onClick={() => setPaymentMethod(opt.k)}
                className={`flex-1 min-w-[130px] px-3 py-2.5 rounded-lg text-sm font-semibold border transition text-center ${paymentMethod === opt.k ? "bg-vermillion text-white border-vermillion shadow-sm" : "bg-white text-neutral-700 border-neutral-200 hover:border-gold"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {isOffline && (
            <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50 space-y-3 text-sm">
              {/* Where to pay */}
              {(paymentMethod === "bank_transfer" || paymentMethod === "cheque") && (
                <div className="space-y-1 text-neutral-700">
                  <p className="font-bold text-neutral-900">{t("form_offline_pay_to")}</p>
                  {paymentSettings?.account_name && <p>A/C Name: <strong>{paymentSettings.account_name}</strong></p>}
                  {paymentMethod === "bank_transfer" && paymentSettings?.account_number && <p>A/C No: <strong>{paymentSettings.account_number}</strong></p>}
                  {paymentMethod === "bank_transfer" && paymentSettings?.ifsc && <p>IFSC: <strong>{paymentSettings.ifsc}</strong></p>}
                  {paymentMethod === "bank_transfer" && paymentSettings?.bank && <p>Bank: <strong>{paymentSettings.bank}</strong></p>}
                  {paymentMethod === "bank_transfer" && paymentSettings?.upi_id && <p>UPI: <strong>{paymentSettings.upi_id}</strong></p>}
                  {paymentMethod === "cheque" && paymentSettings?.cheque_payee && <p>Payee: <strong>{paymentSettings.cheque_payee}</strong></p>}
                </div>
              )}
              {paymentSettings?.instructions && (
                <p className="text-neutral-500 whitespace-pre-wrap">{paymentSettings.instructions}</p>
              )}
              {paymentMethod === "cash" && !paymentSettings?.instructions && (
                <p className="text-neutral-500">{t("form_offline_cash_note")}</p>
              )}

              {/* Reference */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                  {paymentMethod === "cheque" ? t("form_offline_cheque_no") : paymentMethod === "cash" ? t("form_offline_receipt_no") : paymentMethod === "dd" ? t("form_offline_dd_no") : t("form_offline_utr")}
                </label>
                <input
                  type="text"
                  value={offlineReference}
                  onChange={(e) => setOfflineReference(e.target.value)}
                  placeholder={paymentMethod === "cheque" ? "e.g. 000123" : paymentMethod === "cash" ? t("form_optional") : "e.g. UTR / txn id"}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600 text-sm"
                />
              </div>

              {/* Proof upload */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                  {t("form_offline_proof")}{needsProof ? " *" : ` (${t("form_optional")})`}
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-neutral-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-vermillion file:text-white hover:file:bg-lotus file:cursor-pointer"
                />
                {proofFile && <p className="text-xs text-green-700 mt-1">✓ {proofFile.name}</p>}
              </div>

              <p className="text-xs text-neutral-400">{t("form_offline_verify_note")}</p>
            </div>
          )}
        </div>
      )}

      {/* --- ORDER SUMMARY --- itemised so the amount is never a surprise at the
          moment of payment (the total otherwise only lived inside the button). */}
      {!isEnquiry && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500">{t("form_sum_ticket")}</span>
            <span className="font-semibold text-neutral-900">₹{category.price.toLocaleString("en-IN")}</span>
          </div>
          {donationValue > 0 && (
            <div className="flex justify-between">
              <span className="text-neutral-500">{t("form_sum_seva")}</span>
              <span className="font-semibold text-neutral-900">₹{donationValue.toLocaleString("en-IN")}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-neutral-200 pt-2">
            <span className="font-bold text-neutral-900">{t("form_sum_total")}</span>
            <span className="font-black text-orange-600">₹{totalAmount.toLocaleString("en-IN")}</span>
          </div>
          {usePartial && (
            <>
              <div className="flex justify-between text-xs pt-1">
                <span className="text-neutral-500">{t("form_sum_pay_now")}</span>
                <span className="font-bold text-neutral-900">₹{payNow.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">{t("form_sum_balance")}</span>
                <span className="font-bold text-amber-700">₹{balanceAmount.toLocaleString("en-IN")}</span>
              </div>
              {/* No donation split needed: a part payment never carries one, so the
                  balance is always just the rest of the Seva fee. */}
            </>
          )}
        </div>
      )}

      {/* --- SUBMISSION --- */}
      <div>
        {/* Pay button — hidden on enquiry-only tiers */}
        {!isEnquiry && (
          <button
            type="submit"
            // Disabled until the whole form is valid (required fields + terms) and,
            // for offline bank/cheque, the payment proof is attached.
            disabled={loading || !payValid}
            className="btn-gold w-full justify-center text-[1.05rem] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {loading && (submitAction === "pay" || submitAction === "offline") ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> {t("form_processing")}</>
            ) : isOffline ? (
              t("form_offline_submit")
            ) : usePartial ? (
              `Pay ₹${payNow.toLocaleString("en-IN")} Advance Securely`
            ) : (
              t("form_pay_button", totalAmount)
            )}
          </button>
        )}

        {/* Enquire button — primary on enquiry-only tiers, secondary alongside Pay */}
        {showEnquireBtn && (
          <button
            type={isEnquiry ? "submit" : "button"}
            onClick={isEnquiry ? undefined : (e) => handlePayment(e, "enquire")}
            disabled={loading || !coreValid}
            className={`${isEnquiry ? "btn-gold" : "btn-outline-gold mt-3"} w-full justify-center text-[1.05rem] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0`}
          >
            {loading && submitAction === "enquire" ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> {t("form_processing")}</>
            ) : (
              t("form_enquire_now")
            )}
          </button>
        )}

        {!loading && !coreValid && (
          <p className="text-center text-xs text-neutral-400 pt-2.5">
            {t("form_complete_required") || "Complete all required fields to continue."}
          </p>
        )}

        {!isEnquiry && (
          <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 pt-3">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            <span>{t("form_secure_badge")}</span>
          </div>
        )}
      </div>
    </form>
    </ThemeProvider>
  );
}
