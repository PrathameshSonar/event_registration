// app/scan/page.tsx
// Entry-staff QR scanner with PIN auth.
// Set SCANNER_PIN env var on Vercel; share the PIN with staff on event day.
//
// ⚠ Google Lens / camera app only VIEWS the entry pass. Only this page marks attendance.
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

type Status = 'NEW' | 'DUPLICATE' | 'NOT_PAID' | 'INVALID';
interface CheckInResult {
    status: Status;
    reg?: { first_name: string; last_name: string; salutation?: string; attendees_count: number; checked_in_count?: number; categories?: { title: string } };
    checkedInAt?: string;
    count?: number;
    reason?: string;
}
interface HistoryEntry { time: Date; result: CheckInResult; }

function beep(ok: boolean) {
    try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        gain.gain.value = 0.3;
        osc.frequency.value = ok ? 880 : 320;
        osc.type = ok ? 'sine' : 'sawtooth';
        osc.start();
        setTimeout(() => { osc.stop(); ctx.close(); }, 250);
    } catch { }
}

const CONFIG: Record<Status, { bg: string; badge: string; icon: string; label: string }> = {
    NEW:       { bg: 'bg-green-600',    badge: 'bg-green-100 text-green-700',     icon: '✓', label: 'ENTRY GRANTED' },
    DUPLICATE: { bg: 'bg-yellow-500',   badge: 'bg-yellow-100 text-yellow-700',   icon: '⚠', label: 'ALREADY CHECKED IN' },
    NOT_PAID:  { bg: 'bg-red-600',      badge: 'bg-red-100 text-red-700',         icon: '✗', label: 'PAYMENT NOT COMPLETE' },
    INVALID:   { bg: 'bg-neutral-700',  badge: 'bg-neutral-200 text-neutral-600', icon: '?', label: 'INVALID QR CODE' },
};

function nameOf(reg?: CheckInResult['reg']) {
    if (!reg) return '—';
    return [reg.salutation, reg.first_name, reg.last_name].filter(Boolean).join(' ');
}
function resultSub(r: CheckInResult) {
    const n = nameOf(r.reg);
    if (r.status === 'NEW') return `${n} · ${r.reg?.categories?.title || ''} · ${r.reg?.attendees_count} Person(s)`;
    if (r.status === 'DUPLICATE') return `${n} · Scan #${r.count}`;
    if (r.status === 'NOT_PAID') return n;
    return 'Not a valid BaglaBhairav entry pass';
}
function fmt(d: Date) {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// A stable div ID for html5-qrcode — must stay in DOM and never be re-created
const QR_READER_ID = 'bbmah-qr-reader';

export default function ScanPage() {
    const [pin, setPin] = useState('');
    const [authed, setAuthed] = useState(false);
    const [pinError, setPinError] = useState('');
    const [result, setResult] = useState<CheckInResult | null>(null);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [historySearch, setHistorySearch] = useState('');
    const [historyFilter, setHistoryFilter] = useState<'ALL' | Status>('ALL');
    const [cameraError, setCameraError] = useState('');
    const [cameraReady, setCameraReady] = useState(false);

    const lockRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const storedPinRef = useRef('');
    const scannerRef = useRef<any>(null);

    const handleResult = useCallback((res: CheckInResult) => {
        setResult(res);
        setHistory(prev => [{ time: new Date(), result: res }, ...prev].slice(0, 100));
        beep(res.status === 'NEW');
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            setResult(null);
            lockRef.current = false;
        }, 4000);
    }, []);

    const onScan = useCallback(async (text: string) => {
        if (lockRef.current) return;
        const match = text.match(/\/entry\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        if (!match) return;
        lockRef.current = true;
        try {
            const res = await fetch(`/api/checkin/${match[1]}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scannerPin: storedPinRef.current }),
            });
            handleResult(await res.json());
        } catch {
            handleResult({ status: 'INVALID', reason: 'Network error' });
        }
    }, [handleResult]);

    // Start camera — html5-qrcode handles getUserMedia internally (triggers permission dialog)
    const startCamera = useCallback(async () => {
        setCameraError('');
        setCameraReady(false);
        try {
            const { Html5Qrcode } = await import('html5-qrcode');
            // Stop any previous instance
            if (scannerRef.current) {
                await scannerRef.current.stop().catch(() => {});
                scannerRef.current = null;
            }
            const scanner = new Html5Qrcode(QR_READER_ID, { verbose: false });
            scannerRef.current = scanner;
            await scanner.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 240, height: 240 } },
                onScan,
                undefined
            );
            setCameraReady(true);
        } catch (e: any) {
            const msg = String(e?.message || e || 'Unknown error');
            // html5-qrcode throws "NotAllowedError" when permission denied
            if (msg.toLowerCase().includes('notallowed') || msg.toLowerCase().includes('permission')) {
                setCameraError("Camera permission denied. Tap the lock/camera icon in the address bar to allow camera access, then tap Try Again.");
            } else if (msg.toLowerCase().includes('notfound') || msg.toLowerCase().includes('no camera')) {
                setCameraError("No camera found on this device.");
            } else {
                setCameraError(`Camera error: ${msg}`);
            }
        }
    }, [onScan]);

    useEffect(() => {
        if (!authed) return;
        startCamera();
        return () => {
            scannerRef.current?.stop().catch(() => {});
            scannerRef.current = null;
        };
    }, [authed, startCamera]);

    const handlePin = async (e: React.FormEvent) => {
        e.preventDefault();
        setPinError('');
        const res = await fetch('/api/checkin/verify-pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin }),
        });
        if (res.ok) {
            storedPinRef.current = pin;
            setAuthed(true);
        } else {
            const data = await res.json().catch(() => ({}));
            setPinError(data.error || 'Wrong PIN');
            setPin('');
        }
    };

    const exportCSV = () => {
        const rows = [['Time', 'Status', 'Name', 'Category', 'Attendees', 'Scan#']];
        history.forEach(e => {
            const reg = e.result.reg;
            rows.push([fmt(e.time), e.result.status, nameOf(reg), reg?.categories?.title || '—', String(reg?.attendees_count ?? '—'), String(e.result.count ?? 1)]);
        });
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        a.download = `scan-history-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
    };

    // ── PIN screen ───────────────────────────────────────────────────────────
    if (!authed) {
        return (
            <main className="min-h-screen bg-neutral-900 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
                    <div className="text-center mb-6">
                        <p className="text-orange-600 font-bold text-xs uppercase tracking-widest">Entry Scanner</p>
                        <h1 className="text-2xl font-black text-neutral-900 mt-1">BaglaBhairav</h1>
                        <p className="text-sm text-neutral-500 mt-2">Enter the scanner PIN provided by the organiser</p>
                    </div>
                    <form onSubmit={handlePin} className="space-y-4">
                        <input
                            type="password"
                            inputMode="numeric"
                            value={pin}
                            onChange={e => setPin(e.target.value)}
                            placeholder="• • • • • •"
                            autoFocus
                            className="w-full text-center text-3xl font-bold tracking-widest border-2 border-neutral-200 rounded-xl py-4 focus:outline-none focus:border-orange-500"
                        />
                        {pinError && <p className="text-red-600 text-sm text-center">{pinError}</p>}
                        <button type="submit" disabled={!pin} className="w-full bg-orange-600 disabled:bg-neutral-200 disabled:text-neutral-400 text-white font-bold py-3 rounded-xl hover:bg-orange-700 transition">
                            Start Scanning
                        </button>
                    </form>
                    <p className="mt-5 text-center text-xs text-neutral-400 leading-relaxed">
                        ⚠ Use this page to mark attendance.<br />
                        Google Lens only views the pass — it does <strong>not</strong> check people in.
                    </p>
                </div>
            </main>
        );
    }

    // ── Scanner screen ───────────────────────────────────────────────────────
    const cfg = result ? CONFIG[result.status] : null;
    const admittedCount = history.filter(h => h.result.status === 'NEW').length;

    return (
        <main className="h-dvh bg-neutral-900 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-neutral-800 border-b border-neutral-700 shrink-0">
                <p className="text-white font-bold text-sm">🔍 Entry Scanner</p>
                <div className="flex items-center gap-3">
                    {history.length > 0 && (
                        <button onClick={() => setShowHistory(h => !h)} className="text-xs font-semibold px-3 py-1 rounded-full bg-neutral-700 text-neutral-300 hover:bg-neutral-600 transition">
                            {showHistory ? '📷 Camera' : `History (${history.length})`}
                        </button>
                    )}
                    <button onClick={() => { setAuthed(false); setResult(null); setHistory([]); lockRef.current = false; setCameraReady(false); setCameraError(''); }} className="text-neutral-400 text-xs hover:text-white transition">
                        Change PIN
                    </button>
                </div>
            </div>

            {/* Camera + overlay area — camera div must stay in DOM at all times for html5-qrcode */}
            <div className="flex-1 relative overflow-hidden bg-black">
                {/* The html5-qrcode container — never hidden, never conditionally rendered */}
                <div
                    id={QR_READER_ID}
                    className="w-full h-full"
                    style={{ minHeight: 0 }}
                />

                {/* Overlay: loading */}
                {!cameraReady && !cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 pointer-events-none">
                        <p className="text-neutral-400 text-sm animate-pulse">Starting camera…</p>
                    </div>
                )}

                {/* Overlay: error */}
                {cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900 p-8 text-center gap-4">
                        <span className="text-5xl">📷</span>
                        <div>
                            <p className="text-red-400 font-bold mb-2">Camera Unavailable</p>
                            <p className="text-neutral-400 text-sm leading-relaxed">{cameraError}</p>
                        </div>
                        <button onClick={startCamera} className="bg-orange-600 text-white text-sm font-bold px-6 py-2 rounded-xl hover:bg-orange-700 transition">
                            Try Again
                        </button>
                    </div>
                )}

                {/* Overlay: scan frame (shown when camera ready and not showing history) */}
                {cameraReady && !cameraError && !showHistory && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="relative w-60 h-60">
                            <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-orange-500 rounded-tl-lg" />
                            <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-orange-500 rounded-tr-lg" />
                            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-orange-500 rounded-bl-lg" />
                            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-orange-500 rounded-br-lg" />
                        </div>
                    </div>
                )}

                {/* Overlay: history panel — sits on top, camera keeps running underneath */}
                {showHistory && (
                    <div className="absolute inset-0 bg-neutral-900 z-10 flex flex-col">
                        <div className="px-4 py-2 border-b border-neutral-800 flex items-center justify-between shrink-0">
                            <p className="text-xs text-neutral-400">
                                <span className="text-green-400 font-bold">{admittedCount} in</span>
                                {' · '}
                                <span className="text-yellow-400 font-bold">{history.filter(h => h.result.status === 'DUPLICATE').length} dup</span>
                                {' · '}
                                <span className="text-red-400 font-bold">{history.filter(h => h.result.status === 'NOT_PAID').length} unpaid</span>
                                {' · '}{history.length} total
                            </p>
                            <button onClick={exportCSV} className="text-xs font-bold text-orange-400 hover:text-orange-300 transition px-2 py-1 border border-neutral-700 rounded">
                                ↓ Export CSV
                            </button>
                        </div>
                        <div className="px-4 py-2 border-b border-neutral-800 shrink-0">
                            <input
                                type="text"
                                placeholder="Search name or category…"
                                value={historySearch}
                                onChange={e => setHistorySearch(e.target.value)}
                                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-orange-500"
                            />
                        </div>
                        <div className="flex gap-2 px-4 py-2 border-b border-neutral-800 shrink-0 overflow-x-auto">
                            {(['ALL', 'NEW', 'DUPLICATE', 'NOT_PAID', 'INVALID'] as const).map(f => (
                                <button key={f} onClick={() => setHistoryFilter(f)} className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap transition ${historyFilter === f ? 'bg-orange-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}>
                                    {f === 'ALL' ? 'All' : f === 'NEW' ? '✓ Admitted' : f === 'DUPLICATE' ? '⚠ Duplicate' : f === 'NOT_PAID' ? '✗ Unpaid' : '? Invalid'}
                                </button>
                            ))}
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {(() => {
                                const q = historySearch.toLowerCase();
                                const filtered = history.filter(e => {
                                    const statusOk = historyFilter === 'ALL' || e.result.status === historyFilter;
                                    const searchOk = !q || nameOf(e.result.reg).toLowerCase().includes(q) || (e.result.reg?.categories?.title || '').toLowerCase().includes(q);
                                    return statusOk && searchOk;
                                });
                                if (!filtered.length) return <div className="flex items-center justify-center h-32 text-neutral-600 text-sm">No entries match</div>;
                                return (
                                    <ul className="divide-y divide-neutral-800">
                                        {filtered.map((entry, i) => {
                                            const c = CONFIG[entry.result.status];
                                            return (
                                                <li key={i} className="flex items-center gap-3 px-4 py-3">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${c.badge}`}>{c.icon}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white text-sm font-semibold truncate">{nameOf(entry.result.reg)}</p>
                                                        <p className="text-neutral-400 text-xs truncate">
                                                            {entry.result.reg?.categories?.title || '—'}
                                                            {entry.result.reg && ` · ${entry.result.reg.attendees_count} person(s)`}
                                                            {entry.result.status === 'DUPLICATE' && ` · Scan #${entry.result.count}`}
                                                        </p>
                                                    </div>
                                                    <span className="text-neutral-500 text-xs shrink-0">{fmt(entry.time)}</span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                );
                            })()}
                        </div>
                    </div>
                )}
            </div>

            {/* Result / status banner */}
            {cfg ? (
                <div className={`${cfg.bg} px-6 py-5 text-white text-center shrink-0`}>
                    <p className="text-4xl font-black tracking-tight leading-none">{cfg.icon} {cfg.label}</p>
                    <p className="text-base font-semibold mt-2 opacity-90">{resultSub(result!)}</p>
                </div>
            ) : (
                <div className="bg-neutral-800 px-4 py-3 text-center shrink-0 flex items-center justify-center gap-4">
                    <p className="text-neutral-400 text-sm">Point camera at participant's QR code</p>
                    {admittedCount > 0 && <span className="text-xs font-bold text-green-400">{admittedCount} admitted</span>}
                </div>
            )}
        </main>
    );
}
