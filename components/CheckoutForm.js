// components/CheckoutForm.js
"use client";

import { useState } from "react";
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

const TODAY_STR = new Date().toISOString().split("T")[0];

function validatePhone(raw) {
  const clean = String(raw)
    .replace(/\s+/g, "")
    .replace(/^(\+91|0091|91|0)/, "");
  return /^[6-9]\d{9}$/.test(clean);
}

function hasHtml(str) {
  return /<[^>]+>/.test(str) || /javascript:/i.test(str);
}

export default function CheckoutForm({ category }) {
  const { t } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [formError, setFormError] = useState("");
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

  const isEnquiry = category.is_enquiry_only === true;
  const donationValue = isEnquiry
    ? 0
    : Math.max(0, parseFloat(formData.donation) || 0);
  const totalAmount = isEnquiry ? 0 : category.price + donationValue;

  const handleChange = (e) => {
    setFormError("");
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePincodeChange = async (e) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length > 6) return;
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
          setFormError(
            t("alert_pincode_invalid") ||
              "Invalid pincode. Please check and try again.",
          );
          setFormData((prev) => ({ ...prev, taluka: "", state: "" }));
        }
      } catch {}
    }
  };

  const validate = () => {
    if (!validatePhone(formData.phone)) {
      return "Enter a valid 10-digit Indian mobile number (starts with 6, 7, 8 or 9).";
    }
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      return "Enter a valid email address.";
    }
    if (formData.dob && formData.dob > TODAY_STR) {
      return "Date of birth cannot be a future date.";
    }
    if (hasHtml(formData.problem)) {
      return "Problem/Samasya must be plain text — HTML and scripts are not allowed.";
    }
    if (!formData.problem.trim()) {
      return "Please describe your problem/samasya.";
    }
    return null;
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

    if (!agreedToTerms) {
      setFormError(
        t("alert_terms") || "Please agree to the terms and conditions.",
      );
      return;
    }

    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }

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
          amount: totalAmount,
          category: category.title,
          attendees: formData.attendeesCount,
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
          {successData.isEnquiry ? "Enquiry Received!" : "Payment Successful!"}
        </h2>
        <p className="text-neutral-500 text-sm mb-6">
          {successData.isEnquiry
            ? "Our team will contact you shortly."
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
                <span className="font-bold text-green-600">✓ Paid</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Amount</span>
                <span className="font-bold text-neutral-900">
                  ₹{successData.amount.toLocaleString("en-IN")}
                </span>
              </div>
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

        <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 mb-6">
          <Mail className="w-4 h-4" />
          <span>
            Confirmation email{" "}
            {successData.isEnquiry ? "" : "with your QR entry pass "}sent to{" "}
            {successData.email}
          </span>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="text-sm text-orange-600 hover:text-orange-700 font-semibold underline"
        >
          Register another person
        </button>
      </div>
    );
  }

  // ── FORM ──────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handlePayment} className="space-y-8">
      {totalAmount >= 100000 && !isEnquiry && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>
            <strong>Note:</strong> {t("form_upi_warning")}
          </p>
        </div>
      )}

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
            <TextField
              select
              label={t("form_title")}
              name="salutation"
              required
              value={formData.salutation}
              onChange={handleChange}
              variant="outlined"
              size="medium"
              sx={{ width: "120px" }}
            >
              <MenuItem value="Shri">{t("sal_shri")}</MenuItem>
              <MenuItem value="Smt">{t("sal_smt")}</MenuItem>
              <MenuItem value="Kumari">{t("sal_kumari")}</MenuItem>
              <MenuItem value="Mr">{t("sal_mr")}</MenuItem>
              <MenuItem value="Ms">{t("sal_ms")}</MenuItem>
              <MenuItem value="Dr">{t("sal_dr")}</MenuItem>
            </TextField>
            <TextField
              fullWidth
              label={t("form_first_name")}
              name="firstName"
              required
              value={formData.firstName}
              onChange={handleChange}
              variant="outlined"
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
          />
          <TextField
            fullWidth
            label={t("form_gotra")}
            name="gotra"
            required
            value={formData.gotra}
            onChange={handleChange}
            variant="outlined"
          />
          <TextField
            select
            fullWidth
            label={t("form_gender")}
            name="gender"
            required
            value={formData.gender}
            onChange={handleChange}
            variant="outlined"
          >
            <MenuItem value="Male">{t("form_gender_male")}</MenuItem>
            <MenuItem value="Female">{t("form_gender_female")}</MenuItem>
            <MenuItem value="Other">{t("form_gender_other")}</MenuItem>
          </TextField>
          <TextField
            fullWidth
            label={t("form_dob")}
            name="dob"
            type="date"
            required
            value={formData.dob}
            onChange={handleChange}
            variant="outlined"
            InputLabelProps={{ shrink: true }}
            inputProps={{ max: TODAY_STR }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Calendar className="w-5 h-5 text-neutral-400" />
                </InputAdornment>
              ),
            }}
          />
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
            helperText="10-digit Indian mobile number"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Phone className="w-5 h-5 text-neutral-400" />
                </InputAdornment>
              ),
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
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Mail className="w-5 h-5 text-neutral-400" />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            fullWidth
            label={t("form_pincode")}
            name="pincode"
            required
            value={formData.pincode}
            onChange={handlePincodeChange}
            variant="outlined"
            inputProps={{ maxLength: 6 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MapPin className="w-5 h-5 text-neutral-400" />
                </InputAdornment>
              ),
            }}
          />
          <div className="flex gap-2">
            <TextField
              fullWidth
              label={t("form_taluka")}
              name="taluka"
              required
              value={formData.taluka}
              variant="filled"
              InputProps={{ readOnly: true }}
            />
            <TextField
              fullWidth
              label={t("form_state")}
              name="state"
              required
              value={formData.state}
              variant="filled"
              InputProps={{ readOnly: true }}
            />
          </div>
        </div>
      </div>

      {/* --- ADDITIONAL DETAILS & DONATION --- */}
      <div>
        <h4 className="text-sm font-bold text-neutral-900 mb-4 uppercase tracking-wider">
          {t("form_event_contribution")}
        </h4>
        <div className="grid grid-cols-1 gap-4">
          <TextField
            fullWidth
            label={t("form_problem")}
            name="problem"
            required
            multiline
            rows={3}
            value={formData.problem}
            onChange={(e) => {
              handleChange(e);
              if (hasHtml(e.target.value))
                setFormError(
                  "Problem/Samasya must be plain text — HTML and scripts are not allowed.",
                );
            }}
            variant="outlined"
            helperText="Plain text only — no HTML or special characters"
            InputProps={{
              startAdornment: (
                <InputAdornment
                  position="start"
                  sx={{ alignSelf: "flex-start", mt: 1.5 }}
                >
                  <MessageSquare className="w-5 h-5 text-neutral-400" />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            select
            fullWidth
            label={t("form_attendees")}
            name="attendeesCount"
            required
            value={formData.attendeesCount}
            onChange={handleChange}
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Users className="w-5 h-5 text-neutral-400" />
                </InputAdornment>
              ),
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
                inputProps={{ min: 0, step: 1 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">₹</InputAdornment>
                  ),
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
              onChange={(e) => setAgreedToTerms(e.target.checked)}
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
