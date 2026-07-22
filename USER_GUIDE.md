# BaglaBhairav Mahotsav — User Guide

> Two guides in one file.
> **Part 1** is for **visitors and devotees** using the public website.
> **Part 2** is for **admins and volunteers** running the event from the admin panel.
>
> Technical detail (schema, routes, code) lives in [`PROJECT_REFERENCE.md`](PROJECT_REFERENCE.md). Testing lives in [`TEST_PLAN.md`](TEST_PLAN.md).
>
> Last updated: 2026-07-22.

---

# Part 1 — Public user guide (for devotees)

## 1.1 What this website lets you do

| I want to… | Go to |
|---|---|
| Learn about the Mahotsav | **About** / **Event** |
| See the programme, timings, venue and facilities | **Event** |
| Register for a Seva and pay | **Registration** → pick a Seva |
| Ask a question before committing | **Registration** → a Seva with **Enquire Now**, or **Contact** |
| Offer a donation / Seva contribution | **Donate** |
| Watch the live stream | **Live** (a red bar appears site-wide when we're live) |
| Find my entry pass again | **Registration** page → *Already registered?* → or go to `/my-pass` |
| See photos | **Gallery** |
| Read announcements | **News** |
| Get answers | **FAQ** |
| Reach us | **Contact** |
| Give feedback after the event | `/feedback` |
| Read the rules | **Terms**, **Privacy**, **Refund policy** |

**Languages.** Use the globe icon in the top bar to switch between **English, हिंदी and मराठी**. Your choice is remembered as you move around the site.

---

## 1.2 Registering for a Seva — step by step

### Step 0 — Choose your Seva
Go to **Registration**. Each Seva card shows:
- the contribution amount (*per Yajmaan, one-time*),
- what's included,
- a **⭐ Most Chosen** ribbon on the most popular one,
- an availability bar and **"only N left"** when seats are limited,
- **Full** when it's sold out — you can join the **waitlist** instead.

Tap **Choose this Seva**.

> If you see **"Registrations closed"**, registration for this event has ended (or has not opened yet). You can still browse everything — use **Contact** to reach us.

### Step 1 — The Declaration (Samanti Patra)
You'll first see the declaration. **Scroll to the bottom** to read all of it, then fill in:
- Your **name**
- Your **date of birth**
- Your **mobile number**

Tick **"I have read & I accept"** and press **Continue**. A record of your acceptance (with the exact text and the date/time) is kept for our records.

### Step 2 — Your details
Your name, DOB and mobile carry over. Fill in the rest:

| Field | Notes |
|---|---|
| **First & last name** | Always required |
| **Mobile** | Indian 10-digit, starting 6–9. `+91`, `0` or `91` prefixes are fine — we clean them up |
| **Email** | Always required — your confirmation and entry pass go here |
| **Pincode** | 6 digits |
| Salutation, gotra, gender, taluka, state, "your samasya" | Shown if the organisers have enabled them for this Seva |
| Any extra questions | Set by the organisers for this Seva |
| **Total attendees** | How many people are coming on this registration. There's a per-Seva limit (usually 5) |
| **Attendee names** | Name each person coming |

**Age limits.** Some Sevas are restricted by age. If your date of birth falls outside the allowed range, you'll be told clearly and can't proceed with that Seva.

### Step 3 — How you'd like to pay

**Choose your payment plan** (only if this Seva allows part payment):

| Option | What happens |
|---|---|
| **Pay full** | You pay the whole amount now |
| **Pay advance** | You pay a percentage now (commonly 25%); we send you a secure link for the balance |

> **Important about donations and advance payment.** If you choose **Pay advance**, you cannot add a donation to this registration — the advance is a percentage of the Seva fee only. Instead, use the **"Offer Seva separately →"** link to make your contribution straight away on the **Donate** page. This is deliberate: it stops your donation from sitting unpaid in a later balance.

**Add a donation (optional)** — on a full payment you may add any amount on top of the Seva fee. The order summary itemises it: `Seva fee + Donation = Total`.

**Choose your payment method:**

| Method | How it works |
|---|---|
| **Online (card / UPI / netbanking / EMI)** | Instant. Razorpay opens; pay; you're confirmed immediately |
| **Bank transfer** | You transfer to the shown account, enter the **UTR/reference**, and **upload proof**. Verified by our team |
| **Cheque** | Enter the cheque number and **upload a photo**. Confirmed once the cheque clears |
| **Cash** | Enter the receipt number. Verified by our team |
| **Demand draft** | Enter the DD number. Verified by our team |

The offline methods only appear if the organisers have enabled them.

Tick the **Terms & Conditions** box. The Pay button stays disabled until everything required is filled in — if something's missing, the page scrolls you to it and highlights it.

### Step 4 — Paying

**Online:** you'll see *"Opening secure payment gateway…"*, then the Razorpay window.
- If you close it without paying, you'll see **"Payment cancelled — try again"**. Nothing is charged and you can retry.
- If your internet drops, you'll get an error and can retry — you are never left on a frozen loading screen.
- Please don't tap Pay twice — one tap is enough.

**Offline:** you'll see **"Submitted for verification"**. Your registration is *not confirmed yet* — our team checks your proof and confirms, usually within a day or two. You'll get an email either way.

### Step 5 — After paying

**Online, paid in full:**
1. A success screen with all your details — you can **Download Receipt** (a PNG image).
2. A **Registration Confirmed** email + WhatsApp message.
3. Later, your **QR entry pass** by email and WhatsApp, when the organisers send passes out.

**Online, advance paid:**
1. Confirmation of your advance.
2. A **secure payment link** for the balance, by email and WhatsApp.
3. Your **entry pass is issued only after the balance is paid in full.**

**Offline:**
1. "Under verification" email.
2. Once approved → **Registration Confirmed** + your entry pass.
3. If rejected (unclear proof, amount mismatch) → an email explaining why, and you can resubmit.

---

## 1.3 Your entry pass and getting in

- Your pass arrives as a **QR code** by email and WhatsApp, plus a link to **your own pass page**.
- Open the link on your phone at the gate — the QR is shown large and scannable.
- At the gate, a volunteer scans it. They'll see your Seva name and hand you a **wristband** in the colour for that Seva.
- **You'll be given one wristband per attendee** on your registration.
- You may be scanned again at other checkpoints inside — that's normal.
- If you're scanned twice at the same point, staff see a "already scanned" notice. Not a problem, just a check.

**A pass only works if the registration is fully paid.** Advance-only, pending, rejected, cancelled or refunded registrations show as **not valid** at the gate.

### Lost your pass?
Go to **`/my-pass`** (or *Already registered?* on the Registration page), enter your mobile number, and press send.

> For your safety, we **never show** the pass on screen and never send it to whoever types the number. We re-send it to the **email and WhatsApp already on your registration**. If you no longer have access to those, contact us.

You'll always see the same "check your email/WhatsApp" message whether or not a registration exists — this stops strangers from probing for your details. There's a limit of 5 lookups per number per hour.

---

## 1.4 Donating (Seva contribution)

Go to **Donate**.

1. Accept the declaration if prompted.
2. Pick a **Seva category** card (Annadaan, Deep Daan, …) which sets a suggested amount and message — or enter your **own amount** (₹1 to ₹10,00,000).
3. Enter your name, or tick **Give anonymously**.
   - **Anonymous means your name is never stored** — not merely hidden. Your contact details are still optional but kept, so we can email you a receipt.
4. Add an optional message.
5. Pay. A **receipt** is emailed to you.

Donations here are separate from a registration. If you'd like to sponsor at a larger scale, use the sponsorship note on that page to reach us — sponsorships are arranged directly, not through checkout.

---

## 1.5 Waitlist

If a Seva is full, join the **waitlist** with your name and mobile. If a seat frees up (someone cancels), our team contacts people in the order they joined. Joining twice with the same number won't create a duplicate.

---

## 1.6 Other things you can do

| Action | Where | Notes |
|---|---|---|
| **Get a reminder** before the event | Home page reminder form | Leave your contact |
| **Add to calendar** | Home page | Downloads a calendar entry |
| **Share** the event | Home page share buttons | — |
| **Watch live** | The red bar appears when we're streaming; or open **Live** | Works while you're on any page |
| **Send us a message** | **Contact** form | Name, email and message required |
| **Give feedback** | `/feedback` | 1–5 stars plus an optional comment; you can stay anonymous |
| **See past events** | **Previous Events** | Archived Mahayagyas |
| **Download the brochure / parking map / programme** | **Event** page → Downloads | If published |

---

## 1.7 Money — please read

- **Registration fees are non-refundable.** See the **Refund policy** page.
- If your registration is **cancelled** by the organisers, that **does not automatically return your money**. Any refund is a separate, deliberate decision — the cancellation email says so plainly.
- Paying the balance link late is fine; your pass is issued as soon as the payment is received.
- If your online payment succeeded but nothing arrived, wait a few minutes (our system re-checks payments automatically), then use **`/my-pass`** or contact us.

---

## 1.8 Public troubleshooting

| Problem | What to do |
|---|---|
| "A checkout is already in progress for this email and category" | You started a payment less than 3 minutes ago. Finish it, or wait 3 minutes |
| "Only N seat(s) left" / "Registrations are full" | Reduce your attendee count, choose another Seva, or join the waitlist |
| "Registrations are now closed" | Registration for this event has ended. Contact us |
| Age message on a Seva | That Seva has an age restriction — pick a different one |
| Payment cancelled | You closed the payment window. Just try again |
| Paid but no email | Check spam. Wait a few minutes. Then use `/my-pass`, or contact us |
| QR image not visible in the email | Open the **pass link** in the same email instead |
| Balance link doesn't open | Ask us to re-send it, or to send you the link directly |
| Offline payment still "under verification" | Verification is manual — allow a day or two |
| Offline payment rejected | The email explains why; resubmit with a clearer proof or correct amount |
| Wrong details on my registration | Contact us — an admin can correct your name, contact and answers |

---
---

# Part 2 — Admin & volunteer guide

## 2.1 Getting in

Go to **`/admin`** and sign in with your **username and password**.

- Accounts are **named people** — there is no shared password. Everything you do is logged against your account.
- Your session lasts **8 hours**.
- Forgot everything / locked out? An account can only be recreated from the server with `npm run create-admin`. **⚠️ If every admin account is lost, nobody can log in.** Always keep at least two admin accounts.

### Roles
| Role | Access |
|---|---|
| **Admin** | Everything, always |
| **Volunteer** | Exactly the permissions an admin ticks |

### The 12 permissions
| Permission | Grants |
|---|---|
| `dashboard:view` | The Dashboard tab (numbers only — no personal data) |
| `registrations:view` | See registrations (this is the real personal-data boundary) |
| `registrations:manage` | Add / edit registrations and change status |
| `qr:send` | Send QR entry passes |
| `export:data` | Exports and receipts |
| `payments:verify` | Verify offline payments, sync payments, adjust donations |
| `payments:refund` | Refund and reverse payments |
| `reminders:send` | Send payment reminders and re-send messages |
| `enquiries:manage` | The enquiry pipeline |
| `scanlog:view` | The scan log |
| `audit:view` | The audit log and the message log |
| `settings:manage` | All event settings and content |

Any permission that lets you *act* on registrations automatically grants *viewing* them.

**Cancelling a registration is admin-only** — no volunteer permission grants it, not even `registrations:manage`.

---

## 2.2 The six tabs

| Tab | Purpose |
|---|---|
| **Dashboard** | The health of the event at a glance |
| **Registrations** | The ledger — every paid/pending/offline registration and every action on it |
| **Enquiries** | The leads pipeline — people who asked instead of paying |
| **Scan Log** | Who has entered, at which checkpoint |
| **Settings** | Everything you configure: content, Sevas, payments, messages, users |
| **Audit** | Every change made by every admin |

The header has a **Refresh** button, an **"Updated HH:MM:SS"** stamp, and an **Auto ON/OFF** chip. With Auto on, the registrations list quietly refreshes every 30 seconds so new sign-ups appear without reloading. It pauses while you have a record open.

---

## 2.3 Dashboard

### The tiles
| Tile | Meaning |
|---|---|
| **Today's Registrations** | Sign-ups since local midnight, with "N paid · ₹X" underneath |
| **Confirmed Attendees** | Total people across paid registrations |
| **Total Revenue** | Money actually collected (Paid only) |
| **Total Registrations** | All registrations |
| **Payments to Verify** | Offline submissions waiting on you — click through to the queue |
| **Seva Raised** | Standalone donations from `/donate` — click through to Settings → Donations |
| **Checked In** | Unique people scanned, as a % of paid — click through to the Scan Log |

> **Two different "donations".** The **donation add-on** inside a registration appears in *Sales by Category*. The **Seva Raised** tile and chart mean the standalone `/donate` contributions. They're different numbers by design.

All dashboard figures are **global** — they ignore whatever filter you've set on the Registrations tab.

### Data Health (admin only)
A list of data problems, each with severity and examples. The Dashboard tab badges the count of **ERROR**-level issues so they find you.

| Issue | What it means | What to do |
|---|---|---|
| **Paid with ₹0 recorded** | A row is marked Paid but no money is recorded | Bad legacy data — clean it up deliberately; completion should always go through a money path |
| **Paid but short** | `amount_paid` is less than the total | Investigate; reconcile or refund |
| **Advance without a balance link** | Someone owes money but has no link | Use **Copy link** or **Re-send balance link** |
| **Same phone twice in a tier** | Possible duplicate registration | Check with the person; cancel one if genuine |
| **Delivery failures** | An email or WhatsApp failed | Retry from the row's ⚠ or the Message Log |
| **Unsent QRs** | Paid people without passes | Bulk **Send QR** |
| **Stale offline queue** | Offline submissions older than 2 days | Verify them |
| **Oversold tier** | Seats held exceed capacity | Usually a manual add — decide whether to accommodate or move people |

### Launch Check
14 go-live checks: Razorpay keys, webhook secret, session secret, at least one admin account, email key, email sender, WhatsApp, scanner PIN, site URL, an active event, at least one payable tier, checkpoints, and the two private storage buckets. **All should be green before you go live.**

### Analytics
14-day trends for registrations, revenue and Seva; payment conversion; the enquiry funnel; tier fill; a Sales-by-Category table; and per-Seva sales/enquiry chips.

---

## 2.4 Registrations — the ledger

### Finding a record
- **Search** by name, gotra or phone.
- **Filter** by date range, event and Seva.
- **Section tabs** are saved views with live counts:
  Master List · 🔎 To Verify · 🧾 Cheque Pending · ◐ Advance Paid · ✔ Paid · ⏳ Pending · ⚠ Amount Mismatch · ⛔ Rejected · ✖ Failed · 🚫 Cancelled · ⏪ Refunded.

Each row shows the person, Seva, attendees, amount (with a **Seva ₹A + Donation ₹B** split when there's a donation), payment mode, status, **when they registered**, and whether their QR has been sent.

### What each status means
| Status | Meaning | Holds a seat? | Pass? |
|---|---|---|---|
| ⏳ **Pending** | Checkout started, no money yet | No | No |
| ✔ **Paid** | Fully paid | **Yes** | **Yes** |
| ◐ **Advance Paid** | Part payment received, balance due | **Yes** | No |
| ⚠ **Amount Mismatch** | Less money arrived than expected | No | No |
| 🔎 **To Verify** | Offline payment submitted, awaiting your check | No | No |
| 🧾 **Cheque Pending** | Cheque in hand, not yet cleared | No | No |
| ⛔ **Rejected** | Offline proof rejected; they can resubmit | No | No |
| ✖ **Failed** | Payment failed or cheque bounced | No | No |
| ⏪ **Refunded** | Money returned | No | No |
| 🚫 **Cancelled** | Cancelled by an admin (money untouched) | No | No |
| 💬 **Enquired** / 📞 **Contacted** / ⌛ **Payment Link Sent** / ⊘ **Closed** | Enquiry pipeline — see the Enquiries tab | No | No |

> **Only Paid and Advance Paid hold a seat.** Nothing else does.

### Row actions
| Button | When it appears | What it does |
|---|---|---|
| **View** | Always | Opens the full record |
| **⬇ QR** | Paid only | Downloads that person's QR PNG |
| **↻ Sync payment** | Advance Paid, Amount Mismatch | Re-checks that record against Razorpay and updates it if money is there |
| **Copy** | Advance Paid | Copies the balance link **without messaging the customer** — for pasting into a chat yourself |
| **₹ Re-send balance link** | Advance Paid | **Sends** the balance link again by email + WhatsApp (reminder wording) |
| **Reconcile** | Amount Mismatch | Re-runs approval with the real amount — complete it, or convert it to an advance |
| **Verify / Reject / Cheque / Record ₹** | Offline states | See §2.5 |
| **⚠ retry** | A failed delivery | Re-sends **only the channel that failed** |

### Changing status by hand
The status dropdown deliberately **cannot** set **Paid**, **Refunded**, **Amount Mismatch** or **Cancelled**.

> **Why:** flipping a row to "Paid" from a dropdown would record ₹0 while making the pass valid and holding a seat. Completion must go through a path that records money — a Razorpay capture, an offline **Approve**, or a walk-in **Record ₹**. Refunds go through the **Refund** button; cancellation through **Cancel registration**.

### The detail modal
Everything about one person: profile, payment, custom answers, attendee names, **registered on**, their **activity timeline** (including every message we sent and whether it landed), and any **standalone donations** they've made (matched by phone or email).

From here you can **Edit details**, **Resend confirmation**, **Adjust donation**, **Refund**, **Cancel registration**, and **Copy** or **Sync** the balance link.

### Toolbar
| Button | What it does |
|---|---|
| **Sync all** | Re-checks **every** open registration (pending / advance / mismatch / awaiting payment) against Razorpay in one go, over the past 365 days, and reports checked / completed / advance / mismatch |
| **Add Registration** | Create a registration by hand (walk-in, VIP, phone booking) |
| **Broadcast** | Message everyone in the current filter |
| **Export** | CSV · Excel · Receipts PDF · Financial statement — always over the **filtered** set |

### Adding a registration manually
Use this for walk-ins and VIPs.

> **This deliberately ignores capacity** — you can always seat someone on a sold-out Seva. But it is **not silent**: the system writes a loud `capacity.oversold` audit entry and the modal tells you *"This tier is now oversold — 12 of 10 seats held."* Public registration is still capped.

### Bulk: sending QR passes
Select rows → **Send QR**. The bar shows a breakdown: how many are Paid, how many are new, how many already have their pass, how many aren't Paid.

- Only **Paid** rows receive a pass. Others are skipped and reported.
- By default only **unsent** rows get one. Tick **"Resend to already-sent"** to override.
- Each row then shows **"✓ QR sent \<date\>"**.

---

## 2.5 Verifying offline payments

Work the **🔎 To Verify** and **🧾 Cheque Pending** tabs.

### Bank transfer / cash / DD
1. Click **View proof** — opens the uploaded file through a short-lived secure link.
2. Check the amount and reference against your bank statement.
3. Then:

| Action | Use when | Result |
|---|---|---|
| **Approve** (full amount) | Money matches the total | ✔ Paid, confirmation sent, QR-eligible |
| **Approve** (short, marked *part payment*) | They intentionally paid an advance | ◐ Advance Paid, balance kept due, **no pass yet** |
| **Approve** (short, not a part payment) | Money is unexpectedly short | ⚠ Amount Mismatch |
| **Reject** (reason required) | Proof unclear, wrong amount, not received | ⛔ Rejected, they're emailed to resubmit |

> If the amount is short, the system **asks you**: is this a part payment or a genuine mismatch? A row already on a part-payment plan is detected automatically.

### Cheques — two steps
1. **Cheque in hand** → 🧾 Cheque Pending.
2. When the bank confirms: **Cleared** → ✔ Paid (confirmation + pass) — or **Bounced** → ✖ Failed (seat released).

### Cash at the desk (walk-in)
On a Pending, Rejected or enquiry row, click **Record ₹**: choose the method, enter the amount received and a reference.
- Full amount → ✔ Paid.
- Short + confirmed as part payment → ◐ Advance Paid.
- Short, unconfirmed → ⚠ Amount Mismatch.
- On a **price-less enquiry**, the amount you record **defines** the total.

### Fixing a stuck Amount Mismatch
Click **Reconcile** (row or modal). It re-runs approval pre-filled with what was actually recorded. You either **complete** it (full amount) or **convert it to an advance** with the balance still due. Amount Mismatch is never a dead end.

### Undoing an offline payment
On a completed offline row, use **Reverse** in the detail modal → ⏪ Refunded, seat released.

---

## 2.6 Money operations — the three you must not confuse

| Action | What it does to the money | Who can do it |
|---|---|---|
| **Cancel registration** | **Nothing.** The payment record stays exactly as it is | **Admin only** |
| **Refund** (online) | Actually returns money via Razorpay | `payments:refund` |
| **Reverse** (offline) | Marks an offline payment as returned | `payments:refund` |

### Cancelling
1. Open the record → **Cancel registration**.
2. **A reason is mandatory.** It's stored on the row, written to the audit log, and sent to the registrant.
3. The result: status 🚫 Cancelled, the **seat is released**, and the **entry pass stops working**.
4. **The money is untouched** — `amount_paid`, `amount_due` and the payment references are all left exactly as they were, so your books still balance. If money genuinely has to go back, do a separate **Refund** or **Reverse**.
5. You cannot cancel a row that has already ended (cancelled, refunded, failed, closed).
6. On success you're shown that Seva's **waitlist** — a seat just freed, so go notify the next person in Settings → Waitlist.

### Adjusting a donation
People often add a donation at checkout and then ask the desk to drop it. Open the record → **Adjust donation**.

- The Seva fee is taken **from the row**, never from the Seva's current price — so a later price change can't silently re-bill anyone.
- It **refuses to create an overpayment**: if you reduce below what's already collected, you're told to use **Refund** instead.
- Any stored **balance link is cancelled on Razorpay** and cleared, because it was priced at the old amount. If the cancellation fails (e.g. the link was already paid), you get an explicit warning to void it in the Razorpay dashboard yourself.
- If the reduced total is already covered, the row **completes** and the confirmation goes out.

### Re-sending confirmations
- **Resend confirmation** in the modal → deliberately re-sends **both** channels.
- The **⚠ retry** on a row → re-sends **only the channel that failed**. Use this one when WhatsApp failed but the email landed — it won't send a second email.

---

## 2.7 Enquiries — the leads pipeline

Kept separate from the ledger on purpose. Tabs: **New · Contacted · Payment Link Sent · Closed/Lost · All Open**.

**Where enquiries come from:** a Seva marked *Enquiry Only*, or a paid Seva with *Allow Enquiry* (which shows both "Pay" and "Enquire Now"). Enquiries **hold no seat**.

### Working a lead
1. **Notes** — add as many timestamped notes as you like. The **first note on a New lead automatically moves it to Contacted.**
2. **Request Payment** — sets the total to the **Seva's fixed price** and sends a Razorpay payment link by email + WhatsApp. Status → ⌛ Payment Link Sent.
   > You never type an amount. It's always the tier's price.
3. When they pay, **the same record** completes automatically and the entry pass becomes available. If the webhook is missed, the nightly reconcile or **Sync all** picks it up.
4. **Close** (asks for a reason) → ⊘ Closed/Lost. **Reopen** puts it back to Contacted.

---

## 2.8 Entry day — passes, scanning, wristbands

### Before the day
1. **Settings → Entry Checkpoints** — create every gate/checkpoint you'll scan at (Main Gate, Hall, Prasad counter…). Only active ones appear on the scanner.
2. **Wristband colours** — in the same panel, assign a colour to each Seva from the fixed palette (red, blue, green, yellow, orange, purple, pink, gold, white, black).
   > A fixed palette, not a colour picker — volunteers have to match these by eye under a tent.
3. **Send QR passes** to everyone Paid (Registrations → select → Send QR). Check the Health panel for "unsent QRs".
4. Make sure **`SCANNER_PIN`** is set and share it with gate staff.

### Scanning
1. Staff open **`/scan`** on any phone → enter the **PIN** → pick their **checkpoint** → the camera opens.
2. Each device works independently; run as many as you like.
3. Results:

| Result | Meaning | Action |
|---|---|---|
| **NEW** (green) | Valid, first scan here | Let them in; hand over wristbands in the shown colour, **one per attendee** |
| **DUPLICATE** | Already scanned at this checkpoint | Check it's the same group; they've been through |
| **NOT_PAID** | Not fully paid, or cancelled/refunded | Send to the desk |
| **INVALID** | Not one of our passes | Send to the desk |

The result screen leads with the **Seva name in large type** and a **block in the wristband colour**.

4. If a devotee opens their QR with a plain phone camera, they land on the **verification page** which shows the same thing plus **"Bands to give = N"**.
5. No camera? An admin can do a **manual check-in** from the Scan Log.

### Scan Log
See who's entered, at which checkpoint, and when. The Dashboard's **Checked In** tile counts unique people, as a percentage of Paid.

---

## 2.9 Settings — panel by panel

Use the **search box** at the top of the Settings sidebar — type "upi", "wristband", "rbac", "brochure" and it finds the right panel.

### Website Content
| Panel | Use it to |
|---|---|
| **Event Setup** | Title, descriptions, date/time, venue, map, hero image, start/end dates, the "by the numbers" stats strip, venue facility cards. Create events, **set the active one**, delete (needs your password) |
| **Home Page Content** | Programme/schedule, guests & artists (★ marks a featured guest who becomes the Leadership hero), highlight cards (filed as Highlights / Pillars / Blessings / About), FAQ, News & Announcements, Testimonials, countdown, **Registration open/closed toggle**, **Live Stream** |
| **Page Headers** | The hero banner for each inner page |
| **Media Gallery** | The public photo/video gallery |
| **Media Library** | Every uploaded file — browse, reuse, publish flags, delete |

**Going live with a stream:** paste the URL and save it *first*, then hit **🔴 Go live**. They're two separate saves so going live can never also commit half-typed edits. **A live toggle with no URL is treated as not live** — the panel won't let you. Once live, a player appears high on the homepage and a red bar appears on *every* page, including for people already sitting on the registration form.

**Stopping registrations:** flip **Registration open/closed**. Every "Register" button disappears site-wide, Seva cards become details-only, and the server refuses any registration attempt. The event stays fully browsable. Registration also closes automatically once the event's end date has passed.

**News:** the **eye** button drafts or pulls an item without deleting it. Only published items reach the public site, and the section hides itself entirely when there are none.

**Media library rules worth knowing:**
- **Images are always public** — they can't render otherwise.
- **Private documents** (contracts, sponsor decks, invoices) go to a genuinely private store with **no public URL at all** — reachable only through a short-lived link from the admin panel.
- Uploaded images are automatically **shrunk and converted to WebP** — a 15 MB photo becomes a few hundred KB. You don't have to think about it.
- **Deleting a file that's still in use returns an error listing exactly where it's used.** You can force it if you're sure.
- Documents can be flagged **Downloadable** (appear in the Event page's Downloads) or **Attach to ticket** (ride along on every confirmation email — **keep these under 5 MB**, they go to everyone).

### Sevas & Registration
| Panel | Use it to |
|---|---|
| **Sevas & Tiers** | Create Sevas: price, descriptions, image, colour theme, capacity, max attendees per registration, age limits, and the flags below |
| **Form Fields** | Choose which questions each Seva asks |
| **Declaration** | The Samanti Patra text (per language) and whether it's required |
| **Consent Records** | Every acceptance — searchable, exportable, printable per person |
| **Waitlist** | People waiting on full Sevas, oldest first |
| **Entry Checkpoints** | Gates + wristband colours |

**Seva flags:**
| Flag | Effect |
|---|---|
| **Full** | Blocks new registrations on that Seva |
| **Enquiry only** | No payment at all — only "Enquire Now" |
| **Allow enquiry** | Shows *both* Pay and Enquire Now on a paid Seva |
| **Show availability** | Displays the progress bar and "only N left" |
| **Show EMI badge** | Displays the EMI badge |
| **Allow part payment** | Offers the advance option; set **advance %** (of the Seva fee only) |
| **Most Chosen** | Orange ring + ribbon on the card (hidden if the Seva is full) |
| **Max capacity** | Total seats. Only Paid + Advance Paid count against it |
| **Max attendees per registration** | Default 5, hard ceiling 20 |
| **Min / max age** | Both blank = open to all. Checked from the date of birth |

**Form Fields:** first name, last name, phone and email are **always on and always required** — payment, tickets and passes depend on them. Everything else you can show/hide/require/reorder per Seva, and you can add your own custom questions (text, number, date, dropdown, long text) and switch them on per Seva. **Remember to press Save** — this panel does not auto-save.

### Payments & Donations
| Panel | Use it to |
|---|---|
| **Payment Details** | Bank account, IFSC, UPI, payee name, instructions, and **which offline methods are enabled** |
| **Donations** | Every `/donate` contribution, with a paid/anonymous/pending breakdown and CSV export |
| **Donation Presets** | The Seva cards on the donate page (icon, title, description, amount) |
| **Sponsors** | Record sponsorship deals (name, tier, amount, logo, contact, notes) with a total-committed tile |

> Sponsorships are arranged **offline and recorded here**. There is deliberately no public sponsor form and no checkout for them, and **sponsors are not shown on the public site**.

### Messages & Contact
| Panel | Use it to |
|---|---|
| **Contact & Social** | The single place for phone, email, address, Instagram, Facebook, YouTube. Feeds the footer, the Contact page and the floating WhatsApp button |
| **Contact Messages** | Inbox for the public contact form — read/unread, reply by email, delete |
| **Feedback** | Post-event ratings and comments |
| **Templates & Config** | Email templates, WhatsApp template names, QR appearance, gateway status |
| **Message Log** | Every email and WhatsApp we sent, and whether it landed |

**Email templates.** All transactional emails are editable. Your edit wins over the shipped default; **"Reset to default" deletes your version** so the default can never drift from what the code actually sends. Syntax is deliberately tiny:
- `{{name}}` inserts a value **safely escaped** — this is what stops a registrant named `<script>` from breaking the email. Never change a person-supplied value to the raw form.
- `{{{qrImage}}}` inserts raw content — only for things we generate ourselves.
- `{{#if reason}}…{{/if}}` includes a block only when that value exists.

Use **"Send this template as a test"** to mail yourself the version you're editing (unsaved changes included) with realistic sample data before saving.

> **Balance link** and **balance reminder** are separate templates on purpose. The first says "thanks, your advance is received"; the second is your later chase. Don't make them say the same thing.

**WhatsApp templates.** Meta requires pre-approved templates, so the *wording lives in Meta* — only the template **names** are set here. If a template gets re-approved under a new name, change it here; no redeploy needed.

**QR settings.** Size, download size, margin, colours, link lifetime. ⚠️ **Low-contrast or inverted colours produce a QR that looks fine and fails to scan at the gate.** Test any change with a real phone before the event.

**Gateway status** is **read-only by design**: it tells you whether Razorpay is configured and whether you're on **test or live** keys, whether the webhook secret and cron secret are set, and whether email/WhatsApp are working. The key is masked and the secret is never shown. Payment keys stay in the server environment — putting a live payment secret in a database row an admin panel can read would be a real security downgrade.

**Message Log** answers the question you'll ask constantly: *did they actually get it?* Filter by channel, type and status; search by recipient; **Re-send** any message. A re-send replays the **stored** message, so a retry can't quietly send different content (a stale price, an old link) from what failed — and it writes a **new** log row so the history shows both the failure and the retry.

### System
| Panel | Use it to |
|---|---|
| **Admin Users** | Create admins and volunteers, tick permissions, reset passwords, deactivate |
| **Branding & SEO** | Site name, logo, brand colour, and the social-share title/description/image |

**Branding:** pick one colour and the whole site re-themes — the exact colour you pick lands on the buttons, and lighter/darker shades are derived for backgrounds and hovers. Changes appear immediately.

---

## 2.10 Audit log

Every change by every admin: who, what, which record, when, from what IP. Filter by entity, action or free text. **Reads and logins are not logged** — only changes.

Action names read as `<thing>.<what happened>`: `registration.status_change`, `payment.approve`, `registration.cancel`, `qr.send`, `balance.reconcile`, `capacity.oversold`, `event.create`, `category.delete`, `reconcile.cron`.

Logging never blocks an action — if the log fails, your action still succeeds.

---

## 2.11 How money actually reaches the system (so you can trust the ledger)

You don't need the internals, but you do need to know the three layers, because they explain nearly every "why is this row like that?" question:

1. **Razorpay tells us immediately.** When a payment is captured or a payment link is paid, Razorpay notifies us and the registration updates within seconds.
2. **We check the amount.** If **less** money arrived than expected, the row is flagged **Amount Mismatch**, no pass is issued, and it waits for a human. If *more* arrived (which happens legitimately when the customer bears the gateway fee), it's accepted.
3. **We re-check everything on a schedule.** A nightly job re-examines every pending / advance / mismatch / awaiting-payment row against Razorpay and heals anything the notification missed. You can trigger the same thing yourself with **Sync all**, or per row with **↻ Sync payment**.

**This is why you should never "mark someone Paid" by hand.** Use Sync, Approve, or Record ₹ — all three record real money.

> Offline payments have no Razorpay order, so the sync jobs deliberately skip them. They're confirmed by you, not by a gateway.

---

## 2.12 Common admin tasks — quick recipes

| Task | Recipe |
|---|---|
| **Someone paid but wasn't confirmed** | Registrations → find them → **↻ Sync payment**. If that doesn't do it, **Sync all**. Still stuck → check Gateway status and the Razorpay dashboard |
| **Someone lost their pass** | Tell them to use `/my-pass`, or open their record → **⬇ QR** and send it yourself |
| **Balance link never arrived** | Advance Paid row → **Copy** (silent) and paste it into WhatsApp yourself, or **₹** to re-send officially |
| **Someone wants their donation removed** | Open the record → **Adjust donation** → set 0 |
| **Someone wants to cancel** | Open the record → **Cancel registration** with a reason. Then decide separately whether to refund |
| **Seat freed up** | The cancel screen shows the waitlist → Settings → Waitlist → notify the next person |
| **Walk-in at the desk** | **Add Registration** → then **Record ₹** with the cash amount and receipt number |
| **A cheque cleared** | Cheque Pending tab → **Cleared** |
| **A cheque bounced** | Cheque Pending tab → **Bounced** |
| **An offline proof is unreadable** | **Reject** with a clear reason — they'll be emailed to resubmit |
| **A Seva sold out** | Settings → Sevas & Tiers → tick **Full** (or let capacity do it). Waitlist opens automatically |
| **Stop all registrations** | Home Page Content → **Registration open/closed** → closed |
| **Publish an announcement** | Home Page Content → News → add → publish with the eye toggle |
| **Go live** | Home Page Content → Live Stream → paste URL → save → **🔴 Go live** |
| **Email isn't arriving** | Settings → Templates & Config → Gateway → **Send test email**, then check the Message Log for the provider's error |
| **A WhatsApp keeps failing** | Message Log → read the error. Usually an unapproved template name or an expired token |
| **Give a volunteer access** | Settings → Admin Users → create → tick only what they need |
| **Prepare for entry day** | Checkpoints → wristband colours → Send QR to all Paid → check Health has no unsent QRs → test one scan end-to-end |

---

## 2.13 Admin rules of thumb

1. **Never mark someone Paid by hand.** Money must be recorded through Sync, Approve or Record ₹. The dropdown deliberately won't let you.
2. **Cancel is not a refund.** Two separate, deliberate actions.
3. **A reason is always worth writing.** Cancellations and rejections put your reason in front of the customer.
4. **Check Data Health every morning during the event.** It's the fastest way to find people who paid but never got a pass.
5. **Run Sync all before entry day.** It catches every payment a missed notification would otherwise have stranded.
6. **Send QR passes early**, and re-check the "unsent QRs" health item afterwards.
7. **Test a QR at the gate before the day** — especially after changing QR colours.
8. **Keep at least two admin accounts.** Losing them all means nobody can log in.
9. **Manual adds override capacity on purpose** — and are recorded loudly. Check the oversold warning before promising a seat.
10. **Anything you change is logged against your name.** That's a feature.
</content>
</invoke>
