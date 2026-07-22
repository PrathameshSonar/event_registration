// app/scan/page.tsx
// Entry-staff QR scanner with per-checkpoint tracking.
//
// AUTH: the same named accounts as the admin panel. A volunteer needs the
// `checkin:scan` permission (admin always has it). The old shared SCANNER_PIN is
// gone — it couldn't be attributed to a person, couldn't be revoked for one
// volunteer, and it lived in env where rotating it meant a redeploy.
//
// Flow: sign in → checkpoint selection → camera scanning
// Each kiosk (Entry, Lunch Day 1, etc.) runs this page independently.
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

type Status = 'NEW' | 'DUPLICATE' | 'NOT_PAID' | 'INVALID';
interface Checkpoint { id: string; name: string; sort_order: number; }
interface CheckInResult {
    status: Status;
    reg?: { first_name: string; last_name: string; salutation?: string; attendees_count: number; categories?: { title: string } };
    /** Wristband for this Seva (Settings → Entry Checkpoints). Null when unmapped. */
    band?: { key: string; label: string; hex: string; text: string } | null;
    count?: number;
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
    DUPLICATE: { bg: 'bg-yellow-500',   badge: 'bg-yellow-100 text-yellow-700',   icon: '⚠', label: 'ALREADY SCANNED HERE' },
    NOT_PAID:  { bg: 'bg-red-600',      badge: 'bg-red-100 text-red-700',         icon: '✗', label: 'PAYMENT NOT COMPLETE' },
    INVALID:   { bg: 'bg-neutral-700',  badge: 'bg-neutral-200 text-neutral-600', icon: '?', label: 'INVALID QR CODE' },
};

function nameOf(reg?: CheckInResult['reg']) {
    if (!reg) return '—';
    return [reg.salutation, reg.first_name, reg.last_name].filter(Boolean).join(' ');
}
function fmt(d: Date) {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const QR_READER_ID = 'bbmah-qr-reader';

/** Does this session hold the gate-scanning permission? Admin always does. */
function canScan(s: { role?: string; permissions?: string[] } | null) {
    if (!s) return false;
    return s.role === 'admin' || (s.permissions || []).includes('checkin:scan');
}

export default function ScanPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [authed, setAuthed] = useState(false);
    const [who, setWho] = useState('');
    const [loginError, setLoginError] = useState('');
    const [signingIn, setSigningIn] = useState(false);
    // null = still checking the cookie on mount; avoids flashing the login form
    // at a volunteer who is already signed in.
    const [sessionChecked, setSessionChecked] = useState(false);

    const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
    const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null);
    const [loadingCheckpoints, setLoadingCheckpoints] = useState(false);

    const [result, setResult] = useState<CheckInResult | null>(null);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [historySearch, setHistorySearch] = useState('');
    const [historyFilter, setHistoryFilter] = useState<'ALL' | Status>('ALL');
    const [cameraError, setCameraError] = useState('');
    const [cameraReady, setCameraReady] = useState(false);

    const lockRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scannerRef = useRef<any>(null);

    const loadCheckpoints = useCallback(async () => {
        setLoadingCheckpoints(true);
        try {
            const cpRes = await fetch('/api/checkpoints');
            const cpData = await cpRes.json().catch(() => ({ checkpoints: [] }));
            setCheckpoints(cpData.checkpoints || []);
        } catch {
            setCheckpoints([]);
        }
        setLoadingCheckpoints(false);
    }, []);

    // Rehydrate from the httpOnly session cookie so a mid-event page refresh (or
    // a phone locking itself) doesn't force the volunteer to sign in again.
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/admin/session');
                if (res.ok) {
                    const s = await res.json();
                    if (canScan(s)) {
                        setAuthed(true);
                        setWho(s.name || s.role || '');
                        await loadCheckpoints();
                    }
                }
            } catch { /* stay on the login screen */ }
            setSessionChecked(true);
        })();
    }, [loadCheckpoints]);

    const signOut = useCallback(async () => {
        try { await fetch('/api/admin/logout', { method: 'POST' }); } catch { /* ignore */ }
        scannerRef.current?.stop().catch(() => {});
        scannerRef.current = null;
        setAuthed(false); setWho(''); setSelectedCheckpoint(null);
        setCheckpoints([]); setHistory([]); setResult(null);
        setUsername(''); setPassword('');
    }, []);

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
        if (lockRef.current || !selectedCheckpoint) return;
        const match = text.match(/\/entry\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        if (!match) return;
        lockRef.current = true;
        try {
            const res = await fetch(`/api/checkin/${match[1]}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ checkpointId: selectedCheckpoint.id }),
            });
            // The 8h session expired mid-shift (or access was revoked) — drop back
            // to the login screen rather than silently reporting INVALID scans.
            if (res.status === 401 || res.status === 403) {
                lockRef.current = false;
                await signOut();
                setLoginError('Your session ended. Please sign in again.');
                return;
            }
            handleResult(await res.json());
        } catch {
            handleResult({ status: 'INVALID' });
        }
    }, [handleResult, selectedCheckpoint, signOut]);

    const startCamera = useCallback(async () => {
        setCameraError('');
        setCameraReady(false);
        try {
            const { Html5Qrcode } = await import('html5-qrcode');
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
            const msg = String(e?.message || e || '');
            if (msg.toLowerCase().includes('notallowed') || msg.toLowerCase().includes('permission')) {
                setCameraError('Camera permission denied. Tap the camera icon in your address bar to allow access, then tap Try Again.');
            } else if (msg.toLowerCase().includes('notfound') || msg.toLowerCase().includes('no camera')) {
                setCameraError('No camera found on this device.');
            } else {
                setCameraError(`Camera error: ${msg || 'Unknown error'}`);
            }
        }
    }, [onScan]);

    // Start camera only after checkpoint is selected.
    useEffect(() => {
        if (!authed || !selectedCheckpoint) return;
        startCamera();
        return () => {
            scannerRef.current?.stop().catch(() => {});
            scannerRef.current = null;
        };
    }, [authed, selectedCheckpoint, startCamera]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        setSigningIn(true);
        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setLoginError(data.error || 'Incorrect username or password.');
                setPassword('');
                return;
            }
            // Signed in, but this account isn't allowed to admit people. Say so
            // plainly instead of failing later on the first scan — and end the
            // session so the scanner kiosk isn't left holding a live cookie.
            if (!canScan(data)) {
                await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
                setLoginError('This account cannot scan entry passes. Ask an admin to enable “Scan entry passes at the gate”.');
                setPassword('');
                return;
            }
            setAuthed(true);
            setWho(data.name || data.role || '');
            setPassword('');
            await loadCheckpoints();
        } catch {
            setLoginError('Network error. Check the connection and try again.');
        } finally {
            setSigningIn(false);
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
        a.download = `scan-${selectedCheckpoint?.name.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
    };

    // ── Sign-in screen ───────────────────────────────────────────────────────
    if (!authed) {
        if (!sessionChecked) {
            return (
                <main className="min-h-screen bg-neutral-900 flex items-center justify-center p-6">
                    <p className="text-neutral-400 text-sm animate-pulse">Checking your session…</p>
                </main>
            );
        }
        return (
            <main className="min-h-screen bg-neutral-900 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
                    <div className="text-center mb-6">
                        <p className="text-orange-600 font-bold text-xs uppercase tracking-widest">Entry Scanner</p>
                        <h1 className="text-2xl font-black text-neutral-900 mt-1">BaglaBhairav</h1>
                        <p className="text-sm text-neutral-500 mt-2">Sign in with your own account</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-3">
                        <input
                            type="text"
                            autoCapitalize="none"
                            autoCorrect="off"
                            autoComplete="username"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="Username"
                            autoFocus
                            className="w-full border-2 border-neutral-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-orange-500"
                        />
                        <input
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Password"
                            className="w-full border-2 border-neutral-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-orange-500"
                        />
                        {loginError && <p className="text-red-600 text-sm text-center leading-snug">{loginError}</p>}
                        <button type="submit" disabled={!username || !password || signingIn} className="w-full bg-orange-600 disabled:bg-neutral-200 disabled:text-neutral-400 text-white font-bold py-3 rounded-xl hover:bg-orange-700 transition">
                            {signingIn ? 'Signing in…' : 'Sign in'}
                        </button>
                    </form>
                    <p className="mt-5 text-center text-xs text-neutral-400 leading-relaxed">
                        Google Lens only views — it does <strong>not</strong> check people in.
                    </p>
                </div>
            </main>
        );
    }

    // ── Checkpoint selection ─────────────────────────────────────────────────
    if (!selectedCheckpoint) {
        return (
            <main className="min-h-screen bg-neutral-900 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
                    <div className="text-center mb-6">
                        <p className="text-orange-600 font-bold text-xs uppercase tracking-widest">Select Your Station</p>
                        <h1 className="text-xl font-black text-neutral-900 mt-1">Which checkpoint are you scanning for?</h1>
                        <p className="text-sm text-neutral-500 mt-2">Each kiosk scans for one checkpoint. History is per-checkpoint.</p>
                    </div>
                    {loadingCheckpoints ? (
                        <p className="text-center text-neutral-400 py-8 animate-pulse">Loading…</p>
                    ) : checkpoints.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-neutral-500 text-sm">No checkpoints configured yet.</p>
                            <p className="text-neutral-400 text-xs mt-2">Ask admin to add checkpoints in Settings → Entry Checkpoints.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {checkpoints.map(cp => (
                                <button
                                    key={cp.id}
                                    onClick={() => setSelectedCheckpoint(cp)}
                                    className="w-full text-left px-5 py-4 border-2 border-neutral-200 rounded-xl font-bold text-neutral-900 hover:border-orange-500 hover:bg-orange-50 transition flex items-center justify-between"
                                >
                                    {cp.name}
                                    <span className="text-orange-500 text-lg">→</span>
                                </button>
                            ))}
                        </div>
                    )}
                    <button onClick={signOut} className="mt-6 w-full text-xs text-neutral-400 hover:text-neutral-600 transition">
                        {who ? `Signed in as ${who} — sign out` : 'Sign out'}
                    </button>
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
                <div>
                    <p className="text-white font-bold text-sm">📍 {selectedCheckpoint.name}</p>
                    <p className="text-neutral-400 text-xs">Entry Scanner</p>
                </div>
                <div className="flex items-center gap-3">
                    {history.length > 0 && (
                        <button onClick={() => setShowHistory(h => !h)} className="text-xs font-semibold px-3 py-1 rounded-full bg-neutral-700 text-neutral-300 hover:bg-neutral-600 transition">
                            {showHistory ? '📷 Camera' : `History (${history.length})`}
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setSelectedCheckpoint(null);
                            setCameraReady(false);
                            setCameraError('');
                            setResult(null);
                            setHistory([]);
                            lockRef.current = false;
                            scannerRef.current?.stop().catch(() => {});
                            scannerRef.current = null;
                        }}
                        className="text-neutral-400 text-xs hover:text-white transition"
                    >
                        Change
                    </button>
                </div>
            </div>

            {/* Camera + overlay — div must always stay in DOM so html5-qrcode can measure it */}
            <div className="flex-1 relative overflow-hidden bg-black">
                <div id={QR_READER_ID} className="w-full h-full" style={{ minHeight: 0 }} />

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

                {/* Overlay: scan frame corners */}
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

                {/* Overlay: history panel — camera keeps running underneath */}
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
                                ↓ CSV
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
                                    {f === 'ALL' ? 'All' : f === 'NEW' ? '✓ In' : f === 'DUPLICATE' ? '⚠ Dup' : f === 'NOT_PAID' ? '✗ Unpaid' : '? Invalid'}
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
                                                            {entry.result.status === 'DUPLICATE' && ` · Scan #${entry.result.count} here`}
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
                <div className={`${cfg.bg} px-6 py-4 text-white text-center shrink-0`}>
                    <p className="text-2xl font-black tracking-tight leading-none">{cfg.icon} {cfg.label}</p>

                    {/* Seva + wristband: the two things a gate volunteer acts on, so
                        they're the biggest thing on screen after the verdict. */}
                    {result?.reg && (
                        <p className="text-3xl font-black leading-tight mt-2 break-words">{result.reg.categories?.title || '—'}</p>
                    )}
                    {result?.band && (
                        <div
                            className="mt-2 inline-flex items-center gap-2.5 rounded-xl px-4 py-2 ring-2 ring-white/40"
                            style={{ backgroundColor: result.band.hex, color: result.band.text }}
                        >
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-75">Band</span>
                            <span className="text-xl font-black leading-none">{result.band.label}</span>
                        </div>
                    )}

                    <p className="text-sm font-semibold mt-2 opacity-90">
                        {nameOf(result?.reg)}
                        {result?.reg && ` · ${result.reg.attendees_count} person(s)`}
                        {result?.status === 'DUPLICATE' && ` · Scan #${result.count} here`}
                    </p>
                </div>
            ) : (
                <div className="bg-neutral-800 px-4 py-3 text-center shrink-0 flex items-center justify-center gap-4">
                    <p className="text-neutral-400 text-sm">Point camera at participant QR</p>
                    {admittedCount > 0 && <span className="text-xs font-bold text-green-400">{admittedCount} admitted</span>}
                </div>
            )}
        </main>
    );
}
