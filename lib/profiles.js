// lib/profiles.js  (server-only)
// Upserts the canonical user profile (keyed by E.164 phone) from an attendee
// payload and returns the profile id to stamp onto the registration.
// Only non-empty fields are written, so a sparse later registration never
// nulls out good data already on the profile.
import { normalizePhone } from './phone';

export async function upsertProfile(supabaseAdmin, attendee) {
    const phone = normalizePhone(attendee?.phone);
    if (!phone) return null;

    const data = { phone, updated_at: new Date().toISOString() };
    const fullName = `${attendee.salutation || ''} ${attendee.firstName || ''} ${attendee.lastName || ''}`.replace(/\s+/g, ' ').trim();
    if (attendee.email) data.email = String(attendee.email).toLowerCase().trim();
    if (attendee.salutation) data.salutation = attendee.salutation;
    if (attendee.firstName) data.first_name = attendee.firstName;
    if (attendee.lastName) data.last_name = attendee.lastName;
    if (fullName) data.full_name = fullName;
    if (attendee.gotra) data.gotra = attendee.gotra;
    if (attendee.gender) data.gender = attendee.gender;
    if (attendee.dob) data.date_of_birth = attendee.dob;
    if (attendee.pincode) data.pincode = attendee.pincode;
    if (attendee.taluka) data.taluka = attendee.taluka;
    if (attendee.state) data.state = attendee.state;

    try {
        const { data: prof, error } = await supabaseAdmin
            .from('profiles')
            .upsert(data, { onConflict: 'phone' })
            .select('id')
            .single();
        if (error) { console.error('Profile upsert failed:', error.message); return null; }
        return prof?.id ?? null;
    } catch (e) {
        console.error('Profile upsert exception:', e);
        return null;
    }
}
