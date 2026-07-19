// scripts/create-admin.mjs
//
// Create (or reset) a named admin account directly in the database.
//
// This is the ONLY way to bootstrap the first admin now that the shared
// ADMIN_PASSWORD env login has been removed — and the break-glass if you ever
// lock yourself out of every account. It talks to Supabase with the
// service-role key from .env.local; nothing here ships to the browser.
//
//   npm run create-admin
//   npm run create-admin -- --username harry --name "Harry" --role admin
//
// If --username / --password are omitted you'll be prompted (password hidden).
// Re-running with an existing username RESETS that account's password/role.

import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { createClient } from '@supabase/supabase-js';
import { hashPassword } from '../lib/passwordHash.js';

// ── Load env (.env.local, then .env) without any dependency ──────────────────
function loadEnv(file) {
    let text;
    try { text = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'); }
    catch { return; }
    for (const raw of text.split('\n')) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) continue;
        const eq = line.indexOf('=');
        if (eq === -1) continue;
        const key = line.slice(0, eq).trim();
        let val = line.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = val;
    }
}
loadEnv('.env.local');
loadEnv('.env');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
    console.error('\n✖ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    console.error('  Run `vercel env pull .env.local` first, or add them to .env.local.\n');
    process.exit(1);
}

// ── Args ─────────────────────────────────────────────────────────────────────
function arg(name) {
    const i = process.argv.indexOf(`--${name}`);
    return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, (a) => res(a.trim())));

// Prompt for a secret without echoing it to the terminal.
function askHidden(q) {
    return new Promise((res) => {
        process.stdout.write(q);
        const onData = (char) => {
            const s = char.toString();
            if (s === '\n' || s === '\r' || s === '') return; // handled by readline
            // Erase the echoed char and reprint the prompt + a mask.
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            process.stdout.write(q);
        };
        process.stdin.on('data', onData);
        rl.question('', (answer) => {
            process.stdin.removeListener('data', onData);
            process.stdout.write('\n');
            res(answer.trim());
        });
    });
}

async function main() {
    console.log('\n=== Create / reset an admin account ===\n');

    let username = arg('username');
    while (!username || !/^[a-z0-9._-]{3,32}$/.test(username)) {
        username = (await ask('Username (3–32, a-z 0-9 . _ -): ')).toLowerCase();
        if (!/^[a-z0-9._-]{3,32}$/.test(username)) console.log('  ✖ Invalid username, try again.');
    }
    username = username.toLowerCase();

    const name = arg('name') || (await ask(`Display name [${username}]: `)) || username;

    let role = (arg('role') || '').toLowerCase();
    if (role !== 'admin' && role !== 'volunteer') {
        const r = (await ask('Role (admin/volunteer) [admin]: ')).toLowerCase();
        role = r === 'volunteer' ? 'volunteer' : 'admin';
    }

    let password = arg('password');
    while (!password || password.length < 8) {
        password = await askHidden('Password (min 8 chars): ');
        if (!password || password.length < 8) console.log('  ✖ Too short (min 8), try again.');
    }

    const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

    const row = {
        username,
        name,
        role,
        password_hash: hashPassword(password),
        active: true,
        permissions: [], // admin ignores this; a volunteer created here gets none until edited in the UI
    };

    const { data, error } = await supabase
        .from('admin_users')
        .upsert(row, { onConflict: 'username' })
        .select('id, username, role')
        .single();

    rl.close();

    if (error) {
        console.error('\n✖ Failed:', error.message, '\n');
        process.exit(1);
    }
    console.log(`\n✔ Account "${data.username}" (${data.role}) is ready. Log in at /admin.\n`);
    process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
