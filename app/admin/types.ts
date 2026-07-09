// app/admin/types.ts
// Shared admin domain types (extracted from page.tsx so the page + the row
// editors + future admin components all reference one definition).

export type Role = 'admin' | 'volunteer';

export type PaymentStatus =
    | 'pending' | 'completed' | 'failed' | 'refunded' | 'enquired' | 'contacted'
    | 'amount_mismatch' | 'advance_paid' | 'awaiting_payment' | 'closed'
    | 'payment_review' | 'cheque_received' | 'payment_rejected';

export interface Registration {
    id: string; created_at: string;
    payment_status: PaymentStatus;
    full_name: string | null;
    first_name: string; last_name: string; salutation: string; gender: string;
    date_of_birth: string; phone: string; email: string; pincode: string;
    taluka: string; state: string; problem_samasya: string; attendees_count: number;
    donation_amount: number; total_amount: number; razorpay_payment_id: string | null;
    attendees: { name: string }[] | null;
    gotra: string; category_id: string | null;
    categories: { title: string } | null;
    custom_fields: Record<string, string> | null;
    amount_paid: number; amount_due: number;
    payment_plan: string | null; balance_link_url: string | null;
    ticket_email_status: string | null; ticket_wa_status: string | null;
    qr_sent_at: string | null;
    payment_method: string | null; offline_reference: string | null; offline_proof_path: string | null;
    verified_by: string | null; verified_at: string | null;
}

export interface Category {
    id: string; title: string; price: number;
    description: string;
    detailed_description: string;
    media_url: string; is_full: boolean;
    is_enquiry_only: boolean;
    max_capacity: number;
    show_availability: boolean;
    max_attendees_per_reg: number;
    event_id: string | null;
    show_emi_badge: boolean;
    allow_part_payment: boolean;
    advance_percent: number;
    allow_enquiry: boolean;
    min_age: number | null;
    max_age: number | null;
    translations: Record<string, Record<string, string>> | null;
}

export interface EventItem {
    id: string; title: string;
    short_description: string;
    long_description: string;
    date_time: string | null;
    venue: string | null;
    map_url: string | null;
    is_active: boolean;
    show_in_archive: boolean;
    start_at: string | null;
    contact_phone: string | null;
    hero_image_url: string | null;
    instagram_url: string | null;
    facebook_url: string | null;
    youtube_url: string | null;
    travel_info: string | null;
    translations: Record<string, Record<string, string>> | null;
}

export interface MediaItem {
    id: string; media_type: 'image' | 'youtube'; url: string; caption: string;
    event_id: string; events?: { title: string };
}
