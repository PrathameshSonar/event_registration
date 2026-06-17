// components/CheckoutForm.js
"use client";

import { useState } from 'react';
import { ShieldCheck, AlertCircle, MapPin, Calendar, MessageSquare, Mail, Phone, Users, Heart } from 'lucide-react';
import { TextField, MenuItem, InputAdornment, Button, Checkbox, FormControlLabel } from '@mui/material';
import { useLanguage } from './LanguageProvider';

export default function CheckoutForm({ category }) {
    const { t } = useLanguage();

    const [loading, setLoading] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [formData, setFormData] = useState({
        salutation: '',
        firstName: '',
        lastName: '',
        gotra: '',
        gender: '',
        dob: '',
        email: '',
        phone: '',
        pincode: '',
        taluka: '',
        state: '',
        problem: '',
        attendeesCount: 1,
        donation: '',
    });

    const isEnquiry = category.is_enquiry_only === true;
    const donationValue = isEnquiry ? 0 : (parseFloat(formData.donation) || 0);
    const totalAmount = isEnquiry ? 0 : (category.price + donationValue);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePincodeChange = async (e) => {
        const value = e.target.value.replace(/\D/g, '');
        if (value.length > 6) return;
        setFormData((prev) => ({ ...prev, pincode: value }));

        if (value.length === 6) {
            try {
                const response = await fetch(`https://api.postalpincode.in/pincode/${value}`);
                const data = await response.json();
                if (data[0].Status === 'Success') {
                    const postOffice = data[0].PostOffice[0];
                    setFormData((prev) => ({
                        ...prev,
                        taluka: postOffice.Block || postOffice.Name || '',
                        state: postOffice.State || '',
                    }));
                } else {
                    alert(t('alert_pincode_invalid'));
                    setFormData((prev) => ({ ...prev, taluka: '', state: '' }));
                }
            } catch (error) {
                console.error('Pincode API Error:', error);
            }
        }
    };

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        if (!agreedToTerms) {
            alert(t('alert_terms'));
            return;
        }
        setLoading(true);

        const fullNameCombined = `${formData.salutation} ${formData.firstName} ${formData.lastName}`.trim();

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

        // ==========================================
        // ENQUIRY BYPASS LOGIC (no payment)
        // ==========================================
        if (isEnquiry) {
            try {
                const enquiryRes = await fetch('/api/enquiry', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        categoryId: category.id,
                        attendeesCount: formData.attendeesCount,
                        agreedToTerms,
                        attendee: attendeePayload,
                    }),
                });
                const enquiryData = await enquiryRes.json();
                if (!enquiryRes.ok) {
                    alert(`⚠️ ${enquiryData.error || t('alert_enquiry_success')}`);
                    setLoading(false);
                    return;
                }
            } catch (err) {
                console.error('Enquiry submission error:', err);
                alert(t('alert_enquiry_success'));
                setLoading(false);
                return;
            }
            alert(t('alert_enquiry_success'));
            window.location.reload();
            return;
        }

        // ==========================================
        // STANDARD PAID CHECKOUT LOGIC
        // ==========================================
        const res = await loadRazorpayScript();
        if (!res) {
            alert(t('alert_razorpay_fail'));
            setLoading(false);
            return;
        }

        const orderResponse = await fetch('/api/razorpay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
            console.error('Payment API Error Data:', orderData);
            alert(`🚨 ${orderData.error || 'Unknown server error.'}`);
            setLoading(false);
            return;
        }

        if (!orderData.orderId) {
            alert('🚨 Payment Gateway Error: No Order ID was returned from the server.');
            setLoading(false);
            return;
        }

        const options = {
            key: orderData.keyId,
            amount: orderData.amount,
            currency: orderData.currency || 'INR',
            name: 'BaglaBhairav',
            description: 'Registration & Contribution',
            order_id: orderData.orderId,
            handler: async function () {
                alert(t('alert_payment_success', formData.email));
                window.location.reload();
            },
            prefill: {
                name: fullNameCombined,
                email: formData.email,
                contact: formData.phone,
            },
            theme: { color: '#ea580c' },
        };
        const paymentObject = new window.Razorpay(options);
        paymentObject.on('payment.failed', function () {
            alert(t('alert_payment_failed'));
        });
        paymentObject.open();
        setLoading(false);
    };

    return (
        <form onSubmit={handlePayment} className="space-y-8">

            {totalAmount >= 100000 && !isEnquiry && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg flex items-start gap-3 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p><strong>Note:</strong> {t('form_upi_warning')}</p>
                </div>
            )}

            {/* --- PERSONAL DETAILS --- */}
            <div>
                <h4 className="text-sm font-bold text-neutral-900 mb-4 uppercase tracking-wider">{t('form_personal_details')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2 flex gap-4">
                        <TextField
                            select
                            label={t('form_title')}
                            name="salutation"
                            required
                            value={formData.salutation}
                            onChange={handleChange}
                            variant="outlined"
                            size="medium"
                            sx={{ width: '120px' }}
                        >
                            <MenuItem value="Shri">{t('sal_shri')}</MenuItem>
                            <MenuItem value="Smt">{t('sal_smt')}</MenuItem>
                            <MenuItem value="Kumari">{t('sal_kumari')}</MenuItem>
                            <MenuItem value="Mr">{t('sal_mr')}</MenuItem>
                            <MenuItem value="Ms">{t('sal_ms')}</MenuItem>
                            <MenuItem value="Dr">{t('sal_dr')}</MenuItem>
                        </TextField>
                        <TextField
                            fullWidth
                            label={t('form_first_name')}
                            name="firstName"
                            required
                            value={formData.firstName}
                            onChange={handleChange}
                            variant="outlined"
                        />
                    </div>
                    <TextField
                        fullWidth
                        label={t('form_last_name')}
                        name="lastName"
                        required
                        value={formData.lastName}
                        onChange={handleChange}
                        variant="outlined"
                    />
                    <TextField
                        fullWidth
                        label={t('form_gotra')}
                        name="gotra"
                        required
                        value={formData.gotra}
                        onChange={handleChange}
                        variant="outlined"
                    />
                    <TextField
                        select
                        fullWidth
                        label={t('form_gender')}
                        name="gender"
                        required
                        value={formData.gender}
                        onChange={handleChange}
                        variant="outlined"
                    >
                        <MenuItem value="Male">{t('form_gender_male')}</MenuItem>
                        <MenuItem value="Female">{t('form_gender_female')}</MenuItem>
                        <MenuItem value="Other">{t('form_gender_other')}</MenuItem>
                    </TextField>
                    <TextField
                        fullWidth
                        label={t('form_dob')}
                        name="dob"
                        type="date"
                        required
                        value={formData.dob}
                        onChange={handleChange}
                        variant="outlined"
                        InputLabelProps={{ shrink: true }}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><Calendar className="w-5 h-5 text-neutral-400" /></InputAdornment>
                        }}
                    />
                </div>
            </div>

            {/* --- CONTACT & LOCATION --- */}
            <div>
                <h4 className="text-sm font-bold text-neutral-900 mb-4 uppercase tracking-wider">{t('form_contact_location')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextField
                        fullWidth
                        label={t('form_whatsapp')}
                        name="phone"
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        variant="outlined"
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><Phone className="w-5 h-5 text-neutral-400" /></InputAdornment>
                        }}
                    />
                    <TextField
                        fullWidth
                        label={t('form_email')}
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        variant="outlined"
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><Mail className="w-5 h-5 text-neutral-400" /></InputAdornment>
                        }}
                    />
                    <TextField
                        fullWidth
                        label={t('form_pincode')}
                        name="pincode"
                        required
                        value={formData.pincode}
                        onChange={handlePincodeChange}
                        variant="outlined"
                        inputProps={{ maxLength: 6 }}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><MapPin className="w-5 h-5 text-neutral-400" /></InputAdornment>
                        }}
                    />
                    <div className="flex gap-2">
                        <TextField
                            fullWidth
                            label={t('form_taluka')}
                            name="taluka"
                            required
                            value={formData.taluka}
                            variant="filled"
                            InputProps={{ readOnly: true }}
                        />
                        <TextField
                            fullWidth
                            label={t('form_state')}
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
                <h4 className="text-sm font-bold text-neutral-900 mb-4 uppercase tracking-wider">{t('form_event_contribution')}</h4>
                <div className="grid grid-cols-1 gap-4">
                    <TextField
                        fullWidth
                        label={t('form_problem')}
                        name="problem"
                        required
                        multiline
                        rows={3}
                        value={formData.problem}
                        onChange={handleChange}
                        variant="outlined"
                        InputProps={{
                            startAdornment: <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}><MessageSquare className="w-5 h-5 text-neutral-400" /></InputAdornment>
                        }}
                    />
                    <TextField
                        select
                        fullWidth
                        label={t('form_attendees')}
                        name="attendeesCount"
                        required
                        value={formData.attendeesCount}
                        onChange={handleChange}
                        variant="outlined"
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><Users className="w-5 h-5 text-neutral-400" /></InputAdornment>
                        }}
                    >
                        <MenuItem value="1">{t('form_attendees_1')}</MenuItem>
                        <MenuItem value="2">{t('form_attendees_2')}</MenuItem>
                        <MenuItem value="3">{t('form_attendees_3')}</MenuItem>
                        <MenuItem value="4">{t('form_attendees_4')}</MenuItem>
                        <MenuItem value="5">{t('form_attendees_5')}</MenuItem>
                    </TextField>

                    {!isEnquiry && (
                        <div className="mt-4 p-6 border border-orange-100 bg-orange-50/50 rounded-xl">
                            <h4 className="text-sm font-bold text-orange-900 mb-2 flex items-center gap-2">
                                <Heart className="w-4 h-4 text-orange-600" />
                                {t('form_donation_title')}
                            </h4>
                            <p className="text-xs text-orange-700 mb-4">
                                {t('form_donation_desc')}
                            </p>
                            <TextField
                                fullWidth
                                label={t('form_donation_amount')}
                                name="donation"
                                type="number"
                                value={formData.donation}
                                onChange={handleChange}
                                variant="outlined"
                                placeholder="0"
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">₹</InputAdornment>
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
                            sx={{
                                color: '#a3a3a3',
                                '&.Mui-checked': { color: '#ea580c' },
                            }}
                        />
                    }
                    label={
                        <span className="text-sm text-neutral-600">
                            {t('form_terms_prefix')}{' '}
                            <a href="/terms" className="text-orange-600 hover:underline" target="_blank">{t('form_terms_link')}</a>
                            {', '}
                            <a href="/privacy" className="text-orange-600 hover:underline" target="_blank">{t('form_privacy_link')}</a>
                            {` ${t('form_terms_and')} `}
                            <a href="/refund" className="text-orange-600 hover:underline" target="_blank">{t('form_refund_link')}</a>
                            {t('form_terms_suffix')}
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
                        backgroundColor: '#171717',
                        '&:hover': { backgroundColor: '#ea580c' },
                        '&:disabled': { backgroundColor: '#d4d4d4', color: '#737373' },
                        textTransform: 'none',
                        fontSize: '1.05rem',
                        fontWeight: 600,
                    }}
                >
                    {loading ? t('form_processing') : (isEnquiry ? t('form_submit_enquiry') : t('form_pay_button', totalAmount))}
                </Button>

                {!isEnquiry && (
                    <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 pt-3">
                        <ShieldCheck className="w-4 h-4 text-green-600" />
                        <span>{t('form_secure_badge')}</span>
                    </div>
                )}
            </div>

        </form>
    );
}
