// lib/passwordHash.js
// SERVER-ONLY scrypt password hashing for named admin accounts. Stored form is
// 'salt:hash' (both hex). No external dependency — Node's crypto.scrypt.
import crypto from 'crypto';

const KEYLEN = 64;

export function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(String(password), salt, KEYLEN).toString('hex');
    return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
    if (!stored || typeof stored !== 'string' || !stored.includes(':')) return false;
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    let test;
    try {
        test = crypto.scryptSync(String(password), salt, KEYLEN);
    } catch { return false; }
    const known = Buffer.from(hash, 'hex');
    if (known.length !== test.length) return false;
    return crypto.timingSafeEqual(known, test);
}
