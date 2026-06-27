// lib/lang/en.js — English string dictionary
const en = {
    // ===== NAVIGATION =====
    nav_brand: 'BaglaBhairav',
    nav_event_details: 'Event Details',
    nav_pitham: 'Pitham',
    nav_past_events: 'Past Events',
    nav_register: 'Register',
    nav_current_event: 'Current Event',
    nav_home_link: 'Home',

    // ===== HOME PAGE =====
    hero_tagline: 'Connect & Contribute',
    hero_dates: 'Dates to be announced',
    hero_venue: 'Venue to be announced',
    hero_event_fallback: 'Upcoming Mahotsav',
    hero_desc_fallback: 'Event details will be announced shortly.',

    section_categories_title: 'Choose Your Contribution',
    section_categories_desc: 'Select a registration package to reserve your pass and support the cause.',

    category_seats_left: (n) => `Only ${n} seats left`,
    category_full: 'Registrations Full',
    category_register: 'Register Now',
    category_enquire: 'Enquire Now',
    category_enquire_price: 'Enquire now',

    section_videos: 'Video Broadcasts',
    section_gallery: 'Event Gallery',

    // ===== DEVOTIONAL HOME SECTIONS =====
    hero_mantra: 'ॐ ह्लीं बगलामुखि सर्वदुष्टानां वाचं मुखं पदं स्तम्भय जिह्वां कीलय बुद्धिं विनाशय ह्लीं ॐ स्वाहा',
    hero_blessing: 'May the divine grace of Maa Bagalamukhi & Bhairav Baba bless all devotees',
    hero_register_cta: 'Register Now',
    hero_view_schedule: 'View Schedule',
    countdown_title: 'The Mahotsav Begins In',
    countdown_days: 'Days',
    countdown_hours: 'Hours',
    countdown_mins: 'Minutes',
    countdown_secs: 'Seconds',
    countdown_live: '🔱 The Mahotsav is Live — Jai Bagla Bhairav 🔱',
    section_about_title: 'About the Mahotsav',
    section_highlights_title: 'Sacred Rituals & Highlights',
    section_highlights_desc: 'Experience the divine ceremonies of the Mahotsav',
    section_schedule_title: 'Programme Schedule',
    section_schedule_desc: 'Plan your darshan around the sacred timings',
    whatsapp_help: 'Need help? Chat with us',
    sticky_register: 'Register for Mahotsav',

    // ===== REGISTER PAGE =====
    register_back: 'Back to Event Details',
    register_selected_category: 'Selected Category',
    register_attendee_info: 'Attendee Information',

    // ===== CHECKOUT FORM — SECTION HEADINGS =====
    form_personal_details: 'Personal Details',
    form_contact_location: 'Contact & Location',
    form_event_contribution: 'Event Details & Contribution',

    // ===== CHECKOUT FORM — FIELD LABELS =====
    form_title: 'Title',
    form_first_name: 'First Name',
    form_last_name: 'Last Name',
    form_gotra: 'Gotra',
    form_gender: 'Gender',
    form_gender_male: 'Male',
    form_gender_female: 'Female',
    form_gender_other: 'Other',
    form_dob: 'Date of Birth',

    form_whatsapp: 'WhatsApp Number',
    form_email: 'Email Address',
    form_pincode: 'Pincode',
    form_taluka: 'Taluka (Auto)',
    form_state: 'State (Auto)',

    form_problem: 'Problem / Issue / Samasya',
    form_attendees: 'Total Attendees',
    form_attendees_1: '1 Person',
    form_attendees_2: '2 People',
    form_attendees_3: '3 People',
    form_attendees_4: '4 People',
    form_attendees_5: '5 People',

    // ===== SALUTATIONS =====
    sal_shri: 'Shri',
    sal_smt: 'Smt',
    sal_kumari: 'Kumari',
    sal_mr: 'Mr.',
    sal_ms: 'Ms.',
    sal_dr: 'Dr.',

    // ===== DONATION SECTION =====
    form_donation_title: 'Additional Contribution (Optional)',
    form_donation_desc: 'Your support helps us organize better facilities and expand our community outreach.',
    form_donation_amount: 'Donation Amount',

    // ===== TERMS CHECKBOX =====
    form_terms_prefix: 'I agree to the',
    form_terms_link: 'Terms & Conditions',
    form_privacy_link: 'Privacy Policy',
    form_terms_and: 'and',
    form_refund_link: 'Refund Policy',
    form_terms_suffix: '.',

    // ===== SUBMIT BUTTON =====
    form_processing: 'Processing Securely...',
    form_submit_enquiry: 'Submit Enquiry via WhatsApp',
    form_pay_button: (amount) => `Pay ₹${amount} Securely`,
    form_secure_badge: 'Secured transaction via Razorpay',
    form_upi_warning: 'Exceeds daily UPI limits. Use Netbanking or Card.',

    // ===== ALERTS =====
    alert_terms: 'Please agree to the Terms & Conditions to proceed.',
    alert_pincode_invalid: 'Invalid Pincode. Please check and try again.',
    alert_razorpay_fail: 'Razorpay SDK failed to load. Please check your internet connection.',
    alert_enquiry_success: '✅ Enquiry submitted successfully! Our team will connect with you on WhatsApp shortly.',
    alert_payment_success: (email) => `Success! Your payment is confirmed. Your digital ticket pass is being dispatched to ${email}`,
    alert_payment_failed: 'Payment was not completed. You can try again.',

    // ===== PITHAM PAGE =====
    pitham_back: 'Back to main arena',
    pitham_tagline: 'Foundational Geometry',
    pitham_title: 'The Pitham Principles',
    pitham_desc: 'The foundation of traditional architectural space planning relies on mathematical alignments, proportional systems, and geometric harmony. Below are the structural layout pillars governing the planning matrix.',

    pitham_card1_title: 'Mandala Grid Layout',
    pitham_card1_desc: 'Spatial allocation configured through distinct grid divisions (Padam), creating absolute symmetrical weight distributions across coordinates.',
    pitham_card2_title: 'Ayadi Axis Calculations',
    pitham_card2_desc: 'Strict mathematical derivation checking dimensional values for positive energetic vibrations, optimizing lengths, widths, and structural perimeters.',
    pitham_card3_title: 'Structural Plinth Heights',
    pitham_card3_desc: 'Proportional elevation scaling designed according to micro-measurement systems to maximize aesthetic balance and functional load dynamics.',

    pitham_tech_title: 'Mathematical Precision Controls',
    pitham_tech_desc: 'Every element aligns flawlessly to spatial laws. Measurements utilize specialized calculation frameworks down to localized fractional units to maintain geometric integrity.',
    pitham_tech_scale_label: 'Standard Scale Alignment',
    pitham_tech_scale_value: 'Proportional (1:1 / 1:2)',
    pitham_tech_boundary_label: 'Dimensional Boundary System',
    pitham_tech_boundary_value: 'Closed Parameter Rules',

    pitham_footer_brand: 'The Vaastumayaa Systems',
    pitham_footer_copy: '© 2026 Architectural Engineering Subsystems. All paths verified.',

    // ===== PREVIOUS EVENTS PAGE =====
    prev_back: 'Back to current event',
    prev_tagline: 'Historical Archives',
    prev_title: 'Previous Mahotsavs',
    prev_desc: 'Explore the memories, discussions, and visual galleries from our past gatherings. Each event lays the foundation for the next.',
    prev_empty_title: 'The Archives are Empty',
    prev_empty_desc: 'Our history is just beginning. Past events will appear here once the current Mahotsav concludes.',
    prev_no_media: 'No media assets archived for this event.',
    prev_videos_title: 'Broadcasts & Recordings',
    prev_photos_title: 'Photo Gallery',
};

export default en;
