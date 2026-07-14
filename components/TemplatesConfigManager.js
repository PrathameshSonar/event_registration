// components/TemplatesConfigManager.js
// Settings → Templates & Config. Four sections:
//   1. Email templates   — edit the subject/body of any transactional email.
//   2. WhatsApp templates — point our keys at whatever Meta approved them as.
//   3. QR entry pass      — size, margin, colours, link lifetime.
//   4. Payment gateway    — READ-ONLY status (secrets stay in env, by design).
"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Mail, MessageCircle, QrCode, CreditCard, RotateCcw, Eye, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast, confirmDialog } from "@/lib/uiStore";
import { EMAIL_TEMPLATES, EMAIL_TEMPLATE_KINDS } from "@/lib/emailTemplates";
import { DEFAULT_QR, DEFAULT_WHATSAPP_TEMPLATES } from "@/lib/appSettings";

const WA_LABELS = {
    ticketConfirmation: "Ticket confirmation",
    announcement: "Broadcast announcement",
    paymentLink: "Payment / balance link",
    waitlistOpen: "Waitlist — seat open",
};
const WA_BUILTIN = {
    ticketConfirmation: "ticket_confirmation",
    announcement: "announcement",
    paymentLink: "payment_link",
    waitlistOpen: "waitlist_open",
};

const Status = ({ ok, children, warn }) => (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${ok ? "text-green-700" : warn ? "text-amber-700" : "text-rose-700"}`}>
        {ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : warn ? <AlertTriangle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
        {children}
    </span>
);

export default function TemplatesConfigManager() {
    const [tab, setTab] = useState("email");
    const [emailTpl, setEmailTpl] = useState({});      // overrides only
    const [wa, setWa] = useState(DEFAULT_WHATSAPP_TEMPLATES);
    const [qr, setQr] = useState(DEFAULT_QR);
    const [gateway, setGateway] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [kind, setKind] = useState(EMAIL_TEMPLATE_KINDS[0]);
    const [preview, setPreview] = useState(false);

    const load = useCallback(async () => {
        try {
            const [sRes, gRes] = await Promise.all([
                fetch("/api/admin/app-settings"),
                fetch("/api/admin/gateway-status"),
            ]);
            const s = await sRes.json().catch(() => ({}));
            if (sRes.ok) {
                setEmailTpl(s.email_templates || {});
                setWa({ ...DEFAULT_WHATSAPP_TEMPLATES, ...(s.whatsapp_templates || {}) });
                setQr({ ...DEFAULT_QR, ...(s.qr || {}) });
            }
            const g = await gRes.json().catch(() => ({}));
            if (gRes.ok) setGateway(g);
        } catch { /* keep defaults */ }
        setLoading(false);
    }, []);

    useEffect(() => {
        const t = setTimeout(load, 0);
        return () => clearTimeout(t);
    }, [load]);

    const save = async () => {
        setSaving(true);
        const res = await fetch("/api/admin/app-settings", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email_templates: emailTpl, whatsapp_templates: wa, qr }),
        });
        const d = await res.json().catch(() => ({}));
        setSaving(false);
        if (!res.ok) { toast.error(d.error || "Could not save."); return; }
        setDirty(false);
        toast.success("Saved.");
    };

    // The current template = the admin's override if there is one, else the default.
    const def = EMAIL_TEMPLATES[kind];
    const override = emailTpl[kind];
    const customised = !!(override && (override.subject || override.html?.trim()));
    const subject = override?.subject ?? def.subject;
    const html = override?.html ?? def.html;

    const editTpl = (field, v) => {
        setEmailTpl((p) => ({
            ...p,
            [kind]: { subject: p[kind]?.subject ?? def.subject, html: p[kind]?.html ?? def.html, [field]: v },
        }));
        setDirty(true);
    };

    // Reset = DELETE the override, so the built-in default renders again. That's why
    // defaults are never stored: "reset" can't drift from what the code actually sends.
    const resetTpl = async () => {
        if (!(await confirmDialog({
            title: "Reset to default",
            message: `Discard your custom "${def.label}" email and go back to the built-in one?`,
            danger: true, confirmLabel: "Reset",
        }))) return;
        setEmailTpl((p) => { const n = { ...p }; delete n[kind]; return n; });
        setDirty(true);
    };

    const input = "w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600";
    const TABS = [
        { k: "email", label: "Email templates", icon: Mail },
        { k: "whatsapp", label: "WhatsApp", icon: MessageCircle },
        { k: "qr", label: "QR pass", icon: QrCode },
        { k: "gateway", label: "Payment gateway", icon: CreditCard },
    ];

    if (loading) return <p className="text-neutral-400 text-sm py-8">Loading…</p>;

    return (
        <div className="max-w-3xl space-y-6">
            <div>
                <h2 className="text-2xl font-bold mb-1 text-neutral-900">Templates &amp; Config</h2>
                <p className="text-sm text-neutral-500">What your automated messages say, and how the gateway is wired.</p>
            </div>

            <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl overflow-x-auto">
                {TABS.map((t) => {
                    const Icon = t.icon;
                    return (
                        <button key={t.k} onClick={() => setTab(t.k)}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg whitespace-nowrap transition ${tab === t.k ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}>
                            <Icon className="w-4 h-4" /> {t.label}
                        </button>
                    );
                })}
            </div>

            {/* ── EMAIL TEMPLATES ─────────────────────────────────────────── */}
            {tab === "email" && (
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-2 items-end">
                        <div className="flex-1 min-w-[220px]">
                            <label className="block text-xs font-semibold text-neutral-600 mb-1">Template</label>
                            <select value={kind} onChange={(e) => { setKind(e.target.value); setPreview(false); }} className={`${input} bg-white cursor-pointer`}>
                                {EMAIL_TEMPLATE_KINDS.map((k) => (
                                    <option key={k} value={k}>
                                        {EMAIL_TEMPLATES[k].label}{emailTpl[k] ? " • customised" : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button onClick={() => setPreview((v) => !v)} className="inline-flex items-center gap-1.5 px-3 py-2 border border-neutral-300 rounded-lg text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition">
                            <Eye className="w-4 h-4" /> {preview ? "Edit" : "Preview"}
                        </button>
                        {customised && (
                            <button onClick={resetTpl} className="inline-flex items-center gap-1.5 px-3 py-2 border border-neutral-300 rounded-lg text-sm font-semibold text-neutral-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition">
                                <RotateCcw className="w-4 h-4" /> Reset
                            </button>
                        )}
                    </div>

                    <p className="text-xs text-neutral-500">{def.description}</p>

                    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3">
                        <p className="text-xs font-semibold text-neutral-600 mb-1.5">Available variables — click to copy</p>
                        <div className="flex flex-wrap gap-1.5">
                            {def.vars.map((v) => (
                                <button
                                    key={v}
                                    onClick={() => { navigator.clipboard?.writeText(`{{${v}}}`); toast.info(`Copied {{${v}}}`); }}
                                    className="font-mono text-[11px] bg-white border border-neutral-200 rounded px-1.5 py-0.5 text-orange-700 hover:border-orange-300 transition"
                                >
                                    {`{{${v}}}`}
                                </button>
                            ))}
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-2">
                            Values are HTML-escaped automatically. <code>{"{{#if x}}…{{/if}}"}</code> includes a block only when <code>x</code> has a value.
                        </p>
                    </div>

                    {preview ? (
                        <div className="border border-neutral-200 rounded-xl overflow-hidden">
                            <div className="bg-neutral-100 px-4 py-2 text-xs font-semibold text-neutral-600 border-b border-neutral-200">
                                Subject: {subject}
                            </div>
                            {/* The template's own markup, with {{vars}} left visible so you can
                                see exactly where each value lands. */}
                            <iframe
                                title="Email preview"
                                srcDoc={html}
                                className="w-full h-[480px] bg-white"
                                sandbox=""
                            />
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-xs font-semibold text-neutral-600 mb-1">Subject</label>
                                <input className={input} value={subject} onChange={(e) => editTpl("subject", e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-neutral-600 mb-1">Body (HTML)</label>
                                <textarea
                                    className={`${input} font-mono text-xs leading-relaxed`}
                                    rows={16}
                                    value={html}
                                    onChange={(e) => editTpl("html", e.target.value)}
                                    spellCheck={false}
                                />
                                <p className="text-xs text-neutral-400 mt-1">
                                    {def.wrap
                                        ? "This body is placed inside the branded email frame (dark header + white card)."
                                        : "This template is the complete email — it carries its own layout."}
                                </p>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── WHATSAPP ────────────────────────────────────────────────── */}
            {tab === "whatsapp" && (
                <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 leading-relaxed">
                        <strong>WhatsApp message bodies live in Meta, not here.</strong> Meta requires every business-initiated
                        message to use a template they&rsquo;ve pre-approved, so the wording is edited (and re-approved) in the
                        Meta Business Manager. What you set here is the <strong>name</strong> we ask Meta for — so if a template
                        gets approved under a different name, you can point at it without a code change or redeploy.
                    </div>

                    {Object.keys(WA_LABELS).map((k) => (
                        <div key={k}>
                            <label className="block text-xs font-semibold text-neutral-600 mb-1">{WA_LABELS[k]}</label>
                            <input
                                className={`${input} font-mono`}
                                value={wa[k] || ""}
                                onChange={(e) => { setWa((p) => ({ ...p, [k]: e.target.value })); setDirty(true); }}
                                placeholder={WA_BUILTIN[k]}
                            />
                            <p className="text-[11px] text-neutral-400 mt-1">Leave empty to use <code>{WA_BUILTIN[k]}</code>.</p>
                        </div>
                    ))}

                    <div>
                        <label className="block text-xs font-semibold text-neutral-600 mb-1">Template language code</label>
                        <input
                            className={`${input} font-mono w-40`}
                            value={wa.lang || ""}
                            onChange={(e) => { setWa((p) => ({ ...p, lang: e.target.value })); setDirty(true); }}
                            placeholder="en"
                        />
                        <p className="text-[11px] text-neutral-400 mt-1">Must match the language your templates were approved in (e.g. <code>en</code>, <code>en_US</code>).</p>
                    </div>
                </div>
            )}

            {/* ── QR ──────────────────────────────────────────────────────── */}
            {tab === "qr" && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-neutral-600 mb-1">Emailed QR size (px)</label>
                            <input type="number" min={120} max={1000} className={input} value={qr.size} onChange={(e) => { setQr((p) => ({ ...p, size: e.target.value })); setDirty(true); }} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-neutral-600 mb-1">Downloaded QR size (px)</label>
                            <input type="number" min={120} max={2000} className={input} value={qr.download_size} onChange={(e) => { setQr((p) => ({ ...p, download_size: e.target.value })); setDirty(true); }} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-neutral-600 mb-1">Quiet zone (margin)</label>
                            <input type="number" min={0} max={10} className={input} value={qr.margin} onChange={(e) => { setQr((p) => ({ ...p, margin: e.target.value })); setDirty(true); }} />
                            <p className="text-[11px] text-neutral-400 mt-1">White border around the code. Below 2, some scanners struggle.</p>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-neutral-600 mb-1">WhatsApp image link lifetime (days)</label>
                            <input type="number" min={1} max={365} className={input} value={qr.link_expiry_days} onChange={(e) => { setQr((p) => ({ ...p, link_expiry_days: e.target.value })); setDirty(true); }} />
                            <p className="text-[11px] text-neutral-400 mt-1">How long the QR image stays reachable. Set it past your event date.</p>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-neutral-600 mb-1">Foreground</label>
                            <div className="flex gap-2 items-center">
                                <input type="color" value={qr.dark} onChange={(e) => { setQr((p) => ({ ...p, dark: e.target.value })); setDirty(true); }} className="w-11 h-10 rounded-lg border border-neutral-200 cursor-pointer bg-white p-1" />
                                <input className={input} value={qr.dark} onChange={(e) => { setQr((p) => ({ ...p, dark: e.target.value })); setDirty(true); }} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-neutral-600 mb-1">Background</label>
                            <div className="flex gap-2 items-center">
                                <input type="color" value={qr.light} onChange={(e) => { setQr((p) => ({ ...p, light: e.target.value })); setDirty(true); }} className="w-11 h-10 rounded-lg border border-neutral-200 cursor-pointer bg-white p-1" />
                                <input className={input} value={qr.light} onChange={(e) => { setQr((p) => ({ ...p, light: e.target.value })); setDirty(true); }} />
                            </div>
                        </div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                        ⚠️ Keep a strong dark-on-light contrast. A low-contrast or inverted QR looks smart and then fails to scan at the gate,
                        which you&rsquo;d only discover with a queue in front of you.
                    </div>
                </div>
            )}

            {/* ── GATEWAY (read-only) ─────────────────────────────────────── */}
            {tab === "gateway" && gateway && (
                <div className="space-y-4">
                    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-xs text-neutral-600 leading-relaxed">
                        <strong>Read-only by design.</strong> API keys and webhook secrets stay in environment variables.
                        Storing a live payment secret in a database row that an admin panel can read and write would be a real
                        security downgrade — change them in Vercel, not here.
                    </div>

                    <div className="border border-neutral-200 rounded-xl divide-y divide-neutral-100">
                        <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
                            <div>
                                <p className="text-sm font-semibold text-neutral-900">Razorpay</p>
                                <p className="text-xs text-neutral-400 font-mono">{gateway.razorpay.keyId || "not set"}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                {gateway.razorpay.mode === "live" && <span className="text-[11px] font-bold bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">LIVE MODE</span>}
                                {gateway.razorpay.mode === "test" && <span className="text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full">TEST MODE</span>}
                                <Status ok={gateway.razorpay.configured}>{gateway.razorpay.configured ? "Configured" : "Not configured"}</Status>
                            </div>
                        </div>

                        <div className="p-4">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <p className="text-sm font-semibold text-neutral-900">Webhook</p>
                                <Status ok={gateway.webhook.secretSet}>{gateway.webhook.secretSet ? "Secret set" : "Secret missing"}</Status>
                            </div>
                            <p className="text-xs text-neutral-400 font-mono break-all mt-1">{gateway.webhook.url}</p>
                            <p className="text-xs text-neutral-500 mt-2">
                                Must subscribe to: {gateway.webhook.requiredEvents.map((e) => <code key={e} className="mr-1.5 bg-neutral-100 px-1 rounded">{e}</code>)}
                            </p>
                            <p className="text-[11px] text-amber-700 mt-1.5">
                                ⚠️ Without <code>payment_link.paid</code>, balance payments are collected but the registration stays stuck on &ldquo;Advance Paid&rdquo;.
                            </p>
                        </div>

                        <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
                            <div>
                                <p className="text-sm font-semibold text-neutral-900">Email</p>
                                <p className="text-xs text-neutral-400 font-mono break-all">{gateway.email.from}</p>
                            </div>
                            <Status ok={gateway.email.configured}>{gateway.email.configured ? "Configured" : "Not configured"}</Status>
                        </div>

                        <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
                            <p className="text-sm font-semibold text-neutral-900">WhatsApp</p>
                            <Status ok={gateway.whatsapp.configured} warn={!gateway.whatsapp.configured}>
                                {gateway.whatsapp.configured ? "Configured" : "Not configured (optional)"}
                            </Status>
                        </div>

                        <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
                            <div>
                                <p className="text-sm font-semibold text-neutral-900">Reconciliation cron</p>
                                <p className="text-xs text-neutral-400">Heals payments whose webhook was missed.</p>
                            </div>
                            <Status ok={gateway.cron.secretSet}>{gateway.cron.secretSet ? "Secret set" : "CRON_SECRET missing — cron will 401"}</Status>
                        </div>
                    </div>
                </div>
            )}

            {tab !== "gateway" && (
                <div className="flex items-center gap-3 pt-2 border-t border-neutral-200">
                    <button
                        onClick={save}
                        disabled={!dirty || saving}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition ${dirty ? "bg-orange-600 text-white hover:bg-orange-700" : "bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200"}`}
                    >
                        <Save className="w-4 h-4" /> {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
                    </button>
                    {dirty && <span className="text-xs text-neutral-400">Unsaved changes</span>}
                </div>
            )}
        </div>
    );
}
