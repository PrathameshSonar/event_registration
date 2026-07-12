// lib/lang/en.js — English string dictionary
const en = {
  // ===== NAVIGATION =====
  nav_brand: "BaglaBhairav",
  nav_event_details: "Event Details",
  nav_pitham: "Pitham",
  nav_past_events: "Past Events",
  nav_register: "Register",
  nav_current_event: "Current Event",
  nav_home_link: "Home",

  // ===== HOME PAGE =====
  hero_tagline: "Connect & Contribute",
  hero_dates: "Dates to be announced",
  hero_venue: "Venue to be announced",
  hero_event_fallback: "Upcoming Mahotsav",
  hero_desc_fallback: "Event details will be announced shortly.",

  section_categories_title: "Choose Your Contribution",
  section_categories_desc:
    "Select a registration package to reserve your pass and support the cause.",

  category_seats_left: (n) => `Only ${n} seats left`,
  category_full: "Registrations Full",
  category_join_waitlist: "Join the waitlist",
  category_register: "Register Now",
  category_enquire: "Enquire Now",
  category_enquire_price: "Enquire now",

  section_videos: "Video Broadcasts",
  section_gallery: "Event Gallery",

  // ===== DEVOTIONAL HOME SECTIONS =====
  hero_mantra:
    "ॐ ह्लीं बगलामुखि सर्वदुष्टानां वाचं मुखं पदं स्तम्भय जिह्वां कीलय बुद्धिं विनाशय ह्लीं ॐ स्वाहा",
  hero_blessing:
    "May the divine grace of Maa Bagalamukhi & Bhairav Baba bless all devotees",
  hero_register_cta: "Register Now",
  hero_view_schedule: "View Schedule",
  countdown_title: "The Mahotsav Begins In",
  countdown_days: "Days",
  countdown_hours: "Hours",
  countdown_mins: "Minutes",
  countdown_secs: "Seconds",
  countdown_live: "🔱 The Mahotsav is Live — Jai Bagla Bhairav 🔱",
  section_about_title: "About the Mahotsav",
  section_highlights_title: "Sacred Rituals & Highlights",
  section_highlights_desc: "Experience the divine ceremonies of the Mahotsav",
  section_schedule_title: "Programme Schedule",
  section_schedule_desc: "Plan your darshan around the sacred timings",
  section_lineup_title: "Featured Guests",
  section_lineup_desc: "Revered saints, artists and speakers gracing the Mahotsav",
  section_venue_title: "Venue",
  section_travel_title: "Plan Your Visit",
  section_seva_title: "Offer Your Seva",
  section_seva_desc: "Can't attend, or wish to give more? Contribute to the Mahotsav — every offering sustains this sacred gathering.",
  section_seva_cta: "Donate / Contribute",
  venue_directions: "Get Directions",
  hero_registered_count: (n) => `Join ${n}+ registered devotees`,
  whatsapp_help: "Need help? Chat with us",
  sticky_register: "Register for Mahotsav",
  faq_title: "Frequently Asked Questions",
  contact_us_title: "Contact Us",
  contact_us_desc: "Have a question? Reach out to us — we’re happy to help.",
  reminder_title: "Get a Reminder",
  reminder_desc:
    "Leave your details and we will remind you before the Mahotsav begins.",
  reminder_email: "Your email",
  reminder_phone: "WhatsApp number",
  reminder_cta: "🔔 Remind Me",
  reminder_done: "Done! We will remind you before the Mahotsav. 🙏",
  reminder_need_one: "Please enter an email or phone number.",

  // ===== REGISTER PAGE =====
  register_back: "Back to Event Details",
  register_selected_category: "Selected Category",
  register_attendee_info: "Attendee Information",

  // ===== CHECKOUT FORM — SECTION HEADINGS =====
  form_personal_details: "Personal Details",
  form_contact_location: "Contact & Location",
  form_event_contribution: "Event Details & Contribution",

  // ===== CHECKOUT FORM — FIELD LABELS =====
  form_title: "Title",
  form_first_name: "First Name",
  form_last_name: "Last Name",
  form_gotra: "Gotra",
  form_gender: "Gender",
  form_gender_male: "Male",
  form_gender_female: "Female",
  form_gender_other: "Other",
  form_dob: "Date of Birth",

  form_whatsapp: "WhatsApp Number",
  form_email: "Email Address",
  form_pincode: "Pincode",
  form_taluka: "Taluka (Auto)",
  form_state: "State (Auto)",

  form_problem: "Problem / Issue / Samasya",
  form_attendees: "Total Attendees",
  form_attendee_names: "Names of accompanying attendees (optional)",
  form_attendees_1: "1 Person",
  form_attendees_2: "2 People",
  form_attendees_3: "3 People",
  form_attendees_4: "4 People",
  form_attendees_5: "5 People",

  // ===== SALUTATIONS =====
  sal_shri: "Shri",
  sal_smt: "Smt",
  sal_kumari: "Kumari",
  sal_kumar: "Kumar",

  // ===== DONATION SECTION =====
  form_donation_title: "Additional Contribution (Optional)",
  form_donation_desc:
    "Your support helps us organize better facilities and expand our community outreach.",
  form_donation_amount: "Donation Amount",

  // ===== TERMS CHECKBOX =====
  form_terms_prefix: "I agree to the",
  form_terms_link: "Terms & Conditions",
  form_privacy_link: "Privacy Policy",
  form_terms_and: "and",
  form_refund_link: "Refund Policy",
  form_terms_suffix: ".",

  // ===== SUBMIT BUTTON =====
  form_processing: "Processing Securely...",
  form_submit_enquiry: "Submit Enquiry via WhatsApp",
  form_enquire_now: "Enquire Now",
  form_gotra_hint: "If you don't know your gotra, enter 'Kashyap'.",
  form_age_restricted: (label) => `This ticket is restricted to ${label}. Please enter your date of birth.`,
  form_payment_method: "Payment Method",
  form_pay_online: "Pay Online",
  form_method_bank_transfer: "Bank Transfer",
  form_method_cheque: "Cheque",
  form_method_cash: "Cash",
  form_method_dd: "Demand Draft",
  form_offline_pay_to: "Pay to:",
  form_offline_cash_note: "Pay cash at our office / event venue and enter the receipt number if you have one.",
  form_offline_utr: "Transaction / UTR reference",
  form_offline_cheque_no: "Cheque number",
  form_offline_receipt_no: "Receipt number",
  form_offline_dd_no: "DD number",
  form_offline_proof: "Upload payment proof (screenshot / photo)",
  form_offline_verify_note: "Our team will verify your payment and confirm your registration.",
  form_offline_submit: "Submit for Verification",
  form_optional: "optional",
  form_pay_button: (amount) => `Pay ₹${amount} Securely`,
  form_secure_badge: "Secured transaction via Razorpay",
  form_gateway_opening: "Opening secure payment gateway…",
  form_gateway_wait: "Please wait — do not close or refresh this page.",
  form_upi_warning: "Exceeds daily UPI limits. Use Netbanking or Card.",

  // ===== ALERTS =====
  alert_terms: "Please agree to the Terms & Conditions to proceed.",
  alert_pincode_invalid: "Invalid Pincode. Please check and try again.",
  alert_razorpay_fail:
    "Razorpay SDK failed to load. Please check your internet connection.",
  alert_enquiry_success:
    "✅ Enquiry submitted successfully! Our team will connect with you on WhatsApp shortly.",
  alert_payment_success: (email) =>
    `Success! Your payment is confirmed. Your digital ticket pass is being dispatched to ${email}`,
  alert_payment_failed: "Payment was not completed. You can try again.",

  // ===== PITHAM PAGE =====
  pitham_back: "Back to main arena",
  pitham_tagline: "Foundational Geometry",
  pitham_title: "The Pitham Principles",
  pitham_desc:
    "The foundation of traditional architectural space planning relies on mathematical alignments, proportional systems, and geometric harmony. Below are the structural layout pillars governing the planning matrix.",

  pitham_card1_title: "Mandala Grid Layout",
  pitham_card1_desc:
    "Spatial allocation configured through distinct grid divisions (Padam), creating absolute symmetrical weight distributions across coordinates.",
  pitham_card2_title: "Ayadi Axis Calculations",
  pitham_card2_desc:
    "Strict mathematical derivation checking dimensional values for positive energetic vibrations, optimizing lengths, widths, and structural perimeters.",
  pitham_card3_title: "Structural Plinth Heights",
  pitham_card3_desc:
    "Proportional elevation scaling designed according to micro-measurement systems to maximize aesthetic balance and functional load dynamics.",

  pitham_tech_title: "Mathematical Precision Controls",
  pitham_tech_desc:
    "Every element aligns flawlessly to spatial laws. Measurements utilize specialized calculation frameworks down to localized fractional units to maintain geometric integrity.",
  pitham_tech_scale_label: "Standard Scale Alignment",
  pitham_tech_scale_value: "Proportional (1:1 / 1:2)",
  pitham_tech_boundary_label: "Dimensional Boundary System",
  pitham_tech_boundary_value: "Closed Parameter Rules",

  pitham_footer_brand: "The Vaastumayaa Systems",
  pitham_footer_copy:
    "© 2026 Architectural Engineering Subsystems. All paths verified.",

  // ===== PREVIOUS EVENTS PAGE =====
  prev_back: "Back to current event",
  prev_tagline: "Historical Archives",
  prev_title: "Previous Mahotsavs",
  prev_desc:
    "Explore the memories, discussions, and visual galleries from our past gatherings. Each event lays the foundation for the next.",
  prev_empty_title: "The Archives are Empty",
  prev_empty_desc:
    "Our history is just beginning. Past events will appear here once the current Mahotsav concludes.",
  prev_no_media: "No media assets archived for this event.",
  prev_videos_title: "Broadcasts & Recordings",
  prev_photos_title: "Photo Gallery",

  // ── Footer ──
  footer_tagline: "Annual spiritual gathering — connecting devotees and contributors across Bharat.",
  footer_home: "Home",
  footer_find_registration: "Find My Registration",
  footer_donate: "Donate / Seva",
  footer_terms: "Terms & Conditions",
  footer_privacy: "Privacy Policy",
  footer_refund: "Refund Policy",
  footer_rights: "© 2025 BaglaBhairav. All rights reserved.",
  footer_secured: "Payments secured by Razorpay.",

  // ── Donate / Seva page ──
  donate_hero_title: "Offer Your Seva",
  donate_hero_desc: "Contribute to the BaglaBhairav Mahotsav. Every offering, big or small, sustains this sacred gathering.",
  donate_choose_amount: "Choose an amount",
  donate_custom_ph: "Or enter a custom amount (₹)",
  donate_name_ph: "Full name *",
  donate_phone_ph: "Mobile (optional)",
  donate_email_ph: "Email (for a receipt)",
  donate_message_ph: "Dedication / message (optional)",
  donate_anonymous: "Give anonymously — do not record my name",
  donate_anonymous_hint: "Your name won't be stored. Leave an email if you'd still like a receipt.",
  donate_anon_donor: "devotee",
  donate_cta: (amt) => `🙏 Donate ₹${amt}`,
  donate_processing: "Processing…",
  donate_secured: "Secured by Razorpay. Your contribution supports the Mahotsav.",
  donate_err_name: "Please enter your name.",
  donate_err_amount: "Please choose a valid amount.",
  donate_err_email: "Enter a valid email (or leave it blank).",
  donate_err_gateway: "Could not load the payment gateway. Check your connection.",
  donate_err_start: "Could not start the payment.",
  donate_err_verify: "Payment could not be verified. If money was deducted, contact us.",
  donate_err_generic: "Something went wrong. Try again.",
  donate_thank_title: (name) => `Dhanyavaad, ${name}!`,
  donate_thank_desc: (amt) => `Your Seva of ₹${amt} is received. May you be blessed.`,
  donate_thank_email: "A receipt is on its way to your email.",
  donate_back_home: "Back to Home",

  // ── Find My Registration ──
  mypass_title: "Find My Registration",
  mypass_desc: "Lost your entry pass or need to finish a payment? Enter your registered mobile number and we'll send your pass link to your registered email & WhatsApp.",
  mypass_phone_label: "Registered mobile number",
  mypass_phone_ph: "10-digit mobile",
  mypass_send: "Send my pass",
  mypass_sending: "Sending…",
  mypass_security: "For your security, we send only to the contact on file — not shown here.",
  mypass_err_phone: "Enter your 10-digit mobile number.",
  mypass_err_generic: "Something went wrong. Please try again.",
  mypass_done_title: "Check your email & WhatsApp",
  mypass_done_desc: "If that number is registered, we've sent your pass link (and any pending payment link) to the email & WhatsApp on file. It can take a minute to arrive.",
  mypass_try_another: "Try another number",

  // ── Feedback ──
  fb_title: "How was the Mahotsav?",
  fb_desc: "Your feedback means a lot to us.",
  fb_comment_ph: "What did you love? What can we improve? (optional)",
  fb_name_ph: "Your name (optional)",
  fb_phone_ph: "Mobile (optional)",
  fb_submit: "Submit feedback",
  fb_sending: "Sending…",
  fb_err_rating: "Please tap a star to rate.",
  fb_err_generic: "Something went wrong. Try again.",
  fb_thank_title: "Thank you!",
  fb_thank_desc: "Your feedback helps us make the next Mahotsav even more blessed.",
  fb_back_home: "Back to Home",

  // ── Waitlist ──
  wl_title: "Join the waitlist",
  wl_desc: (tier) => `${tier} is full. Leave your details and we'll notify you if a spot opens.`,
  wl_name_ph: "Full name",
  wl_phone_ph: "Mobile number (10-digit)",
  wl_email_ph: "Email (optional)",
  wl_cancel: "Cancel",
  wl_join: "Join waitlist",
  wl_joining: "Joining…",
  wl_err_name: "Please enter your name.",
  wl_err_phone: "Enter a valid 10-digit mobile number.",
  wl_err_generic: "Something went wrong. Try again.",
  wl_done_title: "You're on the waitlist",
  wl_done_desc: (tier) => `If a spot opens for ${tier}, we'll message you a registration link right away.`,
  wl_done: "Done",

  // ── Pass page ──
  pass_entry_pass: "Entry Pass",
  pass_registration: "Registration",
  pass_paid_note: "✓ Paid — show this at the gate",
  pass_status: (s) => `Status: ${s}`,
  pass_scan_note: "Our team will scan this to admit you.",
  pass_tier: "Tier",
  pass_attendees: "Attendees",
  pass_persons: (n) => `${n} Person(s)`,
  pass_pending: (amt) => `A payment of ₹${amt} is pending to confirm your registration.`,
  pass_not_confirmed: "Your registration is not yet confirmed.",
  pass_complete_payment: "Complete payment",
};

export default en;
