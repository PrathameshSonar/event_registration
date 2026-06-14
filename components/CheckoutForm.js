// components/CheckoutForm.js
"use client";

import { useState } from 'react';
import { ShieldCheck, AlertCircle, MapPin, Calendar, MessageSquare, User, Mail, Phone, Users, Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { TextField, MenuItem, InputAdornment, Button, Checkbox, FormControlLabel } from '@mui/material';

export default function CheckoutForm({ category }) {
    const [loading, setLoading] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false); // NEW: Terms Checkbox State
    const [formData, setFormData] = useState({
        salutation: '',
        firstName: '',
        lastName: '',
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

                if (data[0].Status === "Success") {
                    const postOffice = data[0].PostOffice[0];
                    setFormData((prev) => ({
                        ...prev,
                        taluka: postOffice.Block || postOffice.Name || '',
                        state: postOffice.State || ''
                    }));
                } else {
                    alert("Invalid Pincode. Please check and try again.");
                    setFormData((prev) => ({ ...prev, taluka: '', state: '' }));
                }
            } catch (error) {
                console.error("Pincode API Error:", error);
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
            alert("Please agree to the Terms & Conditions to proceed.");
            return;
        }

        setLoading(true);

        const fullNameCombined = `${formData.salutation} ${formData.firstName} ${formData.lastName}`;

        // ==========================================
        // ENQUIRY BYPASS LOGIC
        // ==========================================
        if (isEnquiry) {
            const { error: dbError } = await supabase
                .from('registrations')
                .insert([
                    {
                        category_id: category.id,
                        full_name: fullNameCombined,
                        salutation: formData.salutation,
                        first_name: formData.firstName,
                        last_name: formData.lastName,
                        gender: formData.gender,
                        date_of_birth: formData.dob,
                        email: formData.email,
                        phone: formData.phone,
                        pincode: formData.pincode,
                        taluka: formData.taluka,
                        state: formData.state,
                        problem_samasya: formData.problem,
                        attendees_count: formData.attendeesCount,
                        donation_amount: 0,
                        total_amount: 0,
                        payment_status: 'enquired'
                    }
                ]);

            if (dbError) {
                console.error("Database Error:", dbError);
                alert("Failed to submit enquiry. Please try again.");
                setLoading(false);
                return;
            }

            alert("✅ Enquiry submitted successfully! Our team will connect with you on WhatsApp shortly.");
            window.location.reload();
            return;
        }

        // ==========================================
        // STANDARD PAID CHECKOUT LOGIC
        // ==========================================
        const res = await loadRazorpayScript();
        if (!res) {
            alert('Razorpay SDK failed to load. Please check your internet connection.');
            setLoading(false);
            return;
        }

        const orderResponse = await fetch('/api/razorpay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: totalAmount }),
        });

        const orderData = await orderResponse.json();

        if (!orderResponse.ok) {
            console.error("Payment API Error Data:", orderData);
            alert(`🚨 Payment Gateway Error: ${orderData.error || "Unknown server error."}`);
            setLoading(false);
            return;
        }

        const finalOrderId = orderData.id || (orderData.order && orderData.order.id);
        const finalOrderAmount = orderData.amount || (orderData.order && orderData.order.amount);

        if (!finalOrderId) {
            alert("🚨 Payment Gateway Error: No Order ID was returned from the server.");
            setLoading(false);
            return;
        }

        const { data: pendingRecord, error: dbError } = await supabase
            .from('registrations')
            .insert([
                {
                    category_id: category.id,
                    full_name: fullNameCombined,
                    salutation: formData.salutation,
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                    gender: formData.gender,
                    date_of_birth: formData.dob,
                    email: formData.email,
                    phone: formData.phone,
                    pincode: formData.pincode,
                    taluka: formData.taluka,
                    state: formData.state,
                    problem_samasya: formData.problem,
                    attendees_count: formData.attendeesCount,
                    donation_amount: donationValue,
                    total_amount: totalAmount,
                    razorpay_order_id: finalOrderId,
                    payment_status: 'pending'
                }
            ])
            .select()
            .single();

        if (dbError) {
            console.error("Database Error:", dbError);
            alert("Failed to initialize registration. Please try again.");
            setLoading(false);
            return;
        }

        const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            amount: finalOrderAmount,
            currency: "INR",
            name: "BaglaBhairav",
            description: `Registration & Contribution`,
            order_id: finalOrderId,

            handler: async function (response) {
                await supabase
                    .from('registrations')
                    .update({
                        payment_status: 'completed',
                        razorpay_payment_id: response.razorpay_payment_id
                    })
                    .eq('id', pendingRecord.id);

                try {
                    const emailPromise = fetch('/api/send-ticket', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: formData.email,
                            firstName: formData.firstName,
                            lastName: formData.lastName,
                            categoryTitle: category.title,
                            totalAmount: totalAmount,
                            paymentId: response.razorpay_payment_id,
                            attendeesCount: formData.attendeesCount
                        })
                    });

                    const whatsappPromise = fetch('/api/send-whatsapp', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            phone: formData.phone,
                            firstName: formData.firstName,
                            lastName: formData.lastName,
                            categoryTitle: category.title,
                            paymentId: response.razorpay_payment_id
                        })
                    });

                    await Promise.all([emailPromise, whatsappPromise]);

                } catch (notificationErr) {
                    console.error("Silent notification channel error:", notificationErr);
                }

                alert(`Success! Your payment is confirmed. Your digital ticket pass has been dispatched to ${formData.email}`);
                window.location.reload();
            },
            prefill: {
                name: fullNameCombined,
                email: formData.email,
                contact: formData.phone,
            },
            theme: { color: "#ea580c" },
        };

        const paymentObject = new window.Razorpay(options);
        paymentObject.on('payment.failed', function () {
            alert("Payment was not completed. You can try again.");
        });

        paymentObject.open();
        setLoading(false);
    };

    return (
        <form onSubmit={handlePayment} className="space-y-8">

            {totalAmount >= 100000 && !isEnquiry && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg flex items-start gap-3 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p><strong>Note:</strong> Exceeds daily UPI limits. Use <strong>Netbanking</strong> or <strong>Card</strong>.</p>
                </div>
            )}

            {/* --- PERSONAL DETAILS --- */}
            <div>
                <h4 className="text-sm font-bold text-neutral-900 mb-4 uppercase tracking-wider">Personal Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div className="col-span-1 md:col-span-2 flex gap-4">
                        <TextField
                            select
                            label="Title"
                            name="salutation"
                            required
                            value={formData.salutation}
                            onChange={handleChange}
                            variant="outlined"
                            size="medium"
                            sx={{ width: '120px' }}
                        >
                            <MenuItem value="Shri">Shri</MenuItem>
                            <MenuItem value="Smt">Smt</MenuItem>
                            <MenuItem value="Kumari">Kumari</MenuItem>
                            <MenuItem value="Mr">Mr.</MenuItem>
                            <MenuItem value="Ms">Ms.</MenuItem>
                            <MenuItem value="Dr">Dr.</MenuItem>
                        </TextField>
                        <TextField
                            fullWidth
                            label="First Name"
                            name="firstName"
                            required
                            value={formData.firstName}
                            onChange={handleChange}
                            variant="outlined"
                        />
                    </div>

                    <TextField
                        fullWidth
                        label="Last Name"
                        name="lastName"
                        required
                        value={formData.lastName}
                        onChange={handleChange}
                        variant="outlined"
                    />

                    <TextField
                        select
                        fullWidth
                        label="Gender"
                        name="gender"
                        required
                        value={formData.gender}
                        onChange={handleChange}
                        variant="outlined"
                    >
                        <MenuItem value="Male">Male</MenuItem>
                        <MenuItem value="Female">Female</MenuItem>
                        <MenuItem value="Other">Other</MenuItem>
                    </TextField>

                    <TextField
                        fullWidth
                        label="Date of Birth"
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
                <h4 className="text-sm font-bold text-neutral-900 mb-4 uppercase tracking-wider">Contact & Location</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <TextField
                        fullWidth
                        label="WhatsApp Number"
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
                        label="Email Address"
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
                        label="Pincode"
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
                            label="Taluka (Auto)"
                            name="taluka"
                            required
                            value={formData.taluka}
                            variant="filled"
                            InputProps={{ readOnly: true }}
                        />
                        <TextField
                            fullWidth
                            label="State (Auto)"
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
                <h4 className="text-sm font-bold text-neutral-900 mb-4 uppercase tracking-wider">Event Details & Contribution</h4>
                <div className="grid grid-cols-1 gap-4">

                    <TextField
                        fullWidth
                        label="Problem / Issue / Samasya"
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
                        label="Total Attendees"
                        name="attendeesCount"
                        required
                        value={formData.attendeesCount}
                        onChange={handleChange}
                        variant="outlined"
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><Users className="w-5 h-5 text-neutral-400" /></InputAdornment>
                        }}
                    >
                        <MenuItem value="1">1 Person</MenuItem>
                        <MenuItem value="2">2 People</MenuItem>
                        <MenuItem value="3">3 People</MenuItem>
                        <MenuItem value="4">4 People</MenuItem>
                        <MenuItem value="5">5 People</MenuItem>
                    </TextField>

                    {/* ONLY SHOW DONATION IF IT IS A STANDARD PAID TIER */}
                    {!isEnquiry && (
                        <div className="mt-4 p-6 border border-orange-100 bg-orange-50/50 rounded-xl">
                            <h4 className="text-sm font-bold text-orange-900 mb-2 flex items-center gap-2">
                                <Heart className="w-4 h-4 text-orange-600" />
                                Additional Contribution (Optional)
                            </h4>
                            <p className="text-xs text-orange-700 mb-4">
                                Your support helps us organize better facilities and expand our community outreach.
                            </p>
                            <TextField
                                fullWidth
                                label="Donation Amount"
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
                                '&.Mui-checked': {
                                    color: '#ea580c',
                                },
                            }}
                        />
                    }
                    label={
                        <span className="text-sm text-neutral-600">
                            I agree to the <a href="/terms" className="text-orange-600 hover:underline" target="_blank">Terms & Conditions</a>, <a href="/privacy" className="text-orange-600 hover:underline" target="_blank">Privacy Policy</a>, and <a href="/refund" className="text-orange-600 hover:underline" target="_blank">Refund Policy</a>.
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
                        fontWeight: 600
                    }}
                >
                    {loading ? "Processing Securely..." : (isEnquiry ? "Submit Enquiry via WhatsApp" : `Pay ₹${totalAmount} Securely`)}
                </Button>

                {!isEnquiry && (
                    <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 pt-3">
                        <ShieldCheck className="w-4 h-4 text-green-600" />
                        <span>Secured transaction via Razorpay</span>
                    </div>
                )}
            </div>

        </form>
    );
}