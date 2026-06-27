// lib/lang/hi.js — Hindi string dictionary
const hi = {
    // ===== NAVIGATION =====
    nav_brand: 'BaglaBhairav',
    nav_event_details: 'कार्यक्रम विवरण',
    nav_pitham: 'पीठम',
    nav_past_events: 'पिछले कार्यक्रम',
    nav_register: 'पंजीकरण',
    nav_current_event: 'वर्तमान कार्यक्रम',
    nav_home_link: 'होम',

    // ===== HOME PAGE =====
    hero_tagline: 'जुड़ें और सहयोग करें',
    hero_dates: 'तिथियां शीघ्र घोषित होंगी',
    hero_venue: 'स्थान शीघ्र घोषित होगा',
    hero_event_fallback: 'आगामी महोत्सव',
    hero_desc_fallback: 'कार्यक्रम विवरण शीघ्र घोषित किया जाएगा।',

    section_categories_title: 'अपना सहयोग चुनें',
    section_categories_desc: 'पंजीकरण पैकेज चुनें और अपनी सीट आरक्षित करें।',

    category_seats_left: (n) => `केवल ${n} सीटें शेष`,
    category_full: 'पंजीकरण पूर्ण',
    category_register: 'अभी पंजीकरण करें',
    category_enquire: 'जानकारी लें',
    category_enquire_price: 'जानकारी लें',

    section_videos: 'वीडियो प्रसारण',
    section_gallery: 'कार्यक्रम गैलरी',

    // ===== भक्तिमय खंड =====
    hero_mantra: 'ॐ ह्लीं बगलामुखि सर्वदुष्टानां वाचं मुखं पदं स्तम्भय जिह्वां कीलय बुद्धिं विनाशय ह्लीं ॐ स्वाहा',
    hero_blessing: 'माँ बगलामुखी एवं भैरव बाबा की कृपा सभी भक्तों पर बनी रहे',
    hero_register_cta: 'अभी पंजीकरण करें',
    hero_view_schedule: 'कार्यक्रम देखें',
    countdown_title: 'महोत्सव आरंभ होने में',
    countdown_days: 'दिन',
    countdown_hours: 'घंटे',
    countdown_mins: 'मिनट',
    countdown_secs: 'सेकंड',
    countdown_live: '🔱 महोत्सव चल रहा है — जय बगला भैरव 🔱',
    section_about_title: 'महोत्सव के बारे में',
    section_highlights_title: 'पावन अनुष्ठान एवं विशेषताएँ',
    section_highlights_desc: 'महोत्सव के दिव्य अनुष्ठानों का अनुभव करें',
    section_schedule_title: 'कार्यक्रम सूची',
    section_schedule_desc: 'पावन समय के अनुसार अपने दर्शन की योजना बनाएं',
    whatsapp_help: 'सहायता चाहिए? हमसे बात करें',
    sticky_register: 'महोत्सव हेतु पंजीकरण',
    faq_title: 'अक्सर पूछे जाने वाले प्रश्न',
    reminder_title: 'अनुस्मारक प्राप्त करें',
    reminder_desc: 'अपनी जानकारी दें और महोत्सव आरंभ होने से पहले हम आपको याद दिलाएंगे।',
    reminder_email: 'आपका ईमेल',
    reminder_phone: 'व्हाट्सएप नंबर',
    reminder_cta: '🔔 मुझे याद दिलाएं',
    reminder_done: 'हो गया! महोत्सव से पहले हम आपको याद दिलाएंगे। 🙏',
    reminder_need_one: 'कृपया ईमेल या फ़ोन नंबर दर्ज करें।',

    // ===== REGISTER PAGE =====
    register_back: 'कार्यक्रम विवरण पर वापस जाएं',
    register_selected_category: 'चयनित श्रेणी',
    register_attendee_info: 'उपस्थित व्यक्ति की जानकारी',

    // ===== CHECKOUT FORM — SECTION HEADINGS =====
    form_personal_details: 'व्यक्तिगत विवरण',
    form_contact_location: 'संपर्क और पता',
    form_event_contribution: 'कार्यक्रम विवरण और सहयोग',

    // ===== CHECKOUT FORM — FIELD LABELS =====
    form_title: 'शीर्षक',
    form_first_name: 'पहला नाम',
    form_last_name: 'अंतिम नाम',
    form_gotra: 'गोत्र',
    form_gender: 'लिंग',
    form_gender_male: 'पुरुष',
    form_gender_female: 'महिला',
    form_gender_other: 'अन्य',
    form_dob: 'जन्म तिथि',

    form_whatsapp: 'व्हाट्सएप नंबर',
    form_email: 'ईमेल पता',
    form_pincode: 'पिनकोड',
    form_taluka: 'तहसील (स्वचालित)',
    form_state: 'राज्य (स्वचालित)',

    form_problem: 'समस्या / विषय',
    form_attendees: 'कुल उपस्थित',
    form_attendees_1: '1 व्यक्ति',
    form_attendees_2: '2 व्यक्ति',
    form_attendees_3: '3 व्यक्ति',
    form_attendees_4: '4 व्यक्ति',
    form_attendees_5: '5 व्यक्ति',

    // ===== SALUTATIONS =====
    sal_shri: 'श्री',
    sal_smt: 'श्रीमती',
    sal_kumari: 'कुमारी',
    sal_mr: 'Mr.',
    sal_ms: 'Ms.',
    sal_dr: 'डॉ.',

    // ===== DONATION SECTION =====
    form_donation_title: 'अतिरिक्त सहयोग (वैकल्पिक)',
    form_donation_desc: 'आपका सहयोग हमें बेहतर सुविधाएं और सामुदायिक सेवा के विस्तार में मदद करता है।',
    form_donation_amount: 'दान राशि',

    // ===== TERMS CHECKBOX =====
    form_terms_prefix: 'मैं',
    form_terms_link: 'नियम एवं शर्तें',
    form_privacy_link: 'गोपनीयता नीति',
    form_terms_and: 'और',
    form_refund_link: 'वापसी नीति',
    form_terms_suffix: ' से सहमत हूं।',

    // ===== SUBMIT BUTTON =====
    form_processing: 'सुरक्षित प्रक्रिया जारी है...',
    form_submit_enquiry: 'व्हाट्सएप पर जानकारी भेजें',
    form_pay_button: (amount) => `₹${amount} सुरक्षित भुगतान करें`,
    form_secure_badge: 'Razorpay द्वारा सुरक्षित लेनदेन',
    form_upi_warning: 'दैनिक UPI सीमा से अधिक। नेटबैंकिंग या कार्ड से भुगतान करें।',

    // ===== ALERTS =====
    alert_terms: 'आगे बढ़ने के लिए नियम एवं शर्तों से सहमत हों।',
    alert_pincode_invalid: 'अमान्य पिनकोड। कृपया जांचें और पुनः प्रयास करें।',
    alert_razorpay_fail: 'Razorpay लोड नहीं हो सका। कृपया अपना इंटरनेट कनेक्शन जांचें।',
    alert_enquiry_success: '✅ जानकारी सफलतापूर्वक भेजी गई! हमारी टीम जल्द ही WhatsApp पर संपर्क करेगी।',
    alert_payment_success: (email) => `सफलता! आपका भुगतान स्वीकृत हो गया। आपका डिजिटल टिकट ${email} पर भेजा जा रहा है।`,
    alert_payment_failed: 'भुगतान पूरा नहीं हुआ। आप पुनः प्रयास कर सकते हैं।',

    // ===== PITHAM PAGE =====
    pitham_back: 'मुख्य क्षेत्र पर वापस जाएं',
    pitham_tagline: 'आधारभूत ज्यामिति',
    pitham_title: 'पीठम के सिद्धांत',
    pitham_desc: 'पारंपरिक वास्तु नियोजन का आधार गणितीय संरेखण, अनुपात प्रणाली और ज्यामितीय सामंजस्य पर निर्भर है। नीचे नियोजन मैट्रिक्स को नियंत्रित करने वाले संरचनात्मक स्तंभ दिए गए हैं।',

    pitham_card1_title: 'मंडल ग्रिड विन्यास',
    pitham_card1_desc: 'विशिष्ट ग्रिड विभाजन (पदम) के माध्यम से स्थान आवंटन, निर्देशांकों में पूर्ण सममितीय भार वितरण सुनिश्चित करता है।',
    pitham_card2_title: 'अयादि अक्ष गणना',
    pitham_card2_desc: 'सकारात्मक ऊर्जा कंपन के लिए आयामी मूल्यों की कड़ी गणितीय जांच, लंबाई, चौड़ाई और संरचनात्मक परिमाप का अनुकूलन।',
    pitham_card3_title: 'संरचनात्मक आधार ऊंचाइयां',
    pitham_card3_desc: 'सूक्ष्म माप प्रणाली के अनुसार आनुपातिक ऊंचाई स्केलिंग, सौंदर्य संतुलन और कार्यात्मक भार गतिशीलता को अधिकतम करने के लिए।',

    pitham_tech_title: 'गणितीय सटीकता नियंत्रण',
    pitham_tech_desc: 'प्रत्येक तत्व स्थानिक नियमों के साथ पूरी तरह संरेखित है। माप में स्थानीय भिन्नात्मक इकाइयों तक विशेष गणना ढांचे का उपयोग किया जाता है।',
    pitham_tech_scale_label: 'मानक मापदंड संरेखण',
    pitham_tech_scale_value: 'आनुपातिक (1:1 / 1:2)',
    pitham_tech_boundary_label: 'आयामी सीमा प्रणाली',
    pitham_tech_boundary_value: 'बंद पैरामीटर नियम',

    pitham_footer_brand: 'The Vaastumayaa Systems',
    pitham_footer_copy: '© 2026 Architectural Engineering Subsystems. All paths verified.',

    // ===== PREVIOUS EVENTS PAGE =====
    prev_back: 'वर्तमान कार्यक्रम पर वापस जाएं',
    prev_tagline: 'ऐतिहासिक अभिलेखागार',
    prev_title: 'पिछले महोत्सव',
    prev_desc: 'हमारे पिछले आयोजनों की यादें, चर्चाएं और दृश्य दीर्घाएं देखें। प्रत्येक कार्यक्रम अगले की नींव रखता है।',
    prev_empty_title: 'अभिलेखागार खाली है',
    prev_empty_desc: 'हमारा इतिहास अभी शुरू हो रहा है। वर्तमान महोत्सव के समाप्त होने के बाद पिछले कार्यक्रम यहां दिखाई देंगे।',
    prev_no_media: 'इस कार्यक्रम के लिए कोई मीडिया संग्रहीत नहीं है।',
    prev_videos_title: 'प्रसारण और रिकॉर्डिंग',
    prev_photos_title: 'फोटो गैलरी',
};

export default hi;
