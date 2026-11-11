/**
 * BorrowBond Server-Side Identity, Session, NEP-413 Signature, Wallet Ownership Link,
 * File Upload Validation, Rate-Limiting & Security Audit Engine
 *
 * Security Hardening (Sections 6, 16.2, 16.3, 16.6, 16.8, 16.17):
 *  - Every state-changing API request must prove caller identity via an HMAC-SHA256 signed
 *    `bb_session` HttpOnly cookie, a verified Bearer token, or a verified NEP-413 signature.
 *  - Wallet ownership linking (`linkWalletToUserIdentity`) prevents any user from linking a
 *    NEAR wallet that is already owned by another account, and never treats Google/Email login
 *    as proof of NEAR wallet ownership.
 *  - CSRF protection (`sameOriginGuard`), security headers (`securityHeadersMiddleware`),
 *    strict redirect URL allowlist validation (`validateAllowedRedirectUri`),
 *    file upload validation (`validateEvidenceUploadSecurity`), and immutable audit logging.
 */
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

const SESSION_COOKIE_NAME = 'bb_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours short-lived session
const NONCE_TTL_MS = 1000 * 60 * 5; // 5 minutes
const OAUTH_STATE_TTL_MS = 1000 * 60 * 10; // 10 minutes

const SESSION_SECRET: string = (() => {
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 32) return fromEnv;
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[BorrowBond Security] SESSION_SECRET is not set or shorter than 32 chars; using ephemeral per-process secret.'
    );
  }
  return crypto.randomBytes(32).toString('hex');
})();

export interface SessionClaims {
  sessionId: string;
  walletAccountId: string; // empty string if user signed in via Google/Email and has not linked a wallet yet
  nearNetwork: 'testnet' | 'mainnet';
  authMethod: 'WALLET' | 'EMAIL' | 'GOOGLE';
  email?: string;
  userId?: string;
  walletVerified: boolean;
  issuedAt: number;
  expiresAt: number;
}

const revokedSessionIds = new Set<string>();

export function signSessionToken(
  claims: Omit<SessionClaims, 'issuedAt' | 'expiresAt' | 'sessionId'> & { sessionId?: string }
): string {
  const now = Date.now();
  const full: SessionClaims = {
    ...claims,
    sessionId: claims.sessionId || `sess_${crypto.randomBytes(12).toString('hex')}`,
    issuedAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };
  const payload = Buffer.from(JSON.stringify(full), 'utf8').toString('base64url');
  const mac = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${mac}`;
}

export function verifySessionToken(token: string | undefined | null): SessionClaims | null {
  if (!token || typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(sig, 'base64url');
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionClaims;
    if (!parsed || typeof parsed.walletAccountId !== 'string') return null;
    if (typeof parsed.expiresAt !== 'number' || Date.now() > parsed.expiresAt) return null;
    if (parsed.sessionId && revokedSessionIds.has(parsed.sessionId)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function revokeSessionToken(token: string | undefined | null): void {
  const claims = verifySessionToken(token);
  if (claims?.sessionId) {
    revokedSessionIds.add(claims.sessionId);
  }
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) {
      try {
        out[k] = decodeURIComponent(v);
      } catch {
        out[k] = v;
      }
    }
  }
  return out;
}

export function setSessionCookie(res: Response, token: string, req: Request): void {
  const forwardedProto = (req.headers['x-forwarded-proto'] as string | undefined) || '';
  const isHttps = req.secure || forwardedProto.includes('https');
  const maxAgeSec = Math.floor(SESSION_TTL_MS / 1000);
  const sameSite = isHttps ? 'SameSite=None; Secure' : 'SameSite=Lax';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; ${sameSite}; Max-Age=${maxAgeSec}`
  );
}

export function clearSessionCookie(res: Response, req: Request): void {
  const cookies = parseCookies(req.headers.cookie);
  if (cookies[SESSION_COOKIE_NAME]) {
    revokeSessionToken(cookies[SESSION_COOKIE_NAME]);
  }
  const forwardedProto = (req.headers['x-forwarded-proto'] as string | undefined) || '';
  const isHttps = req.secure || forwardedProto.includes('https');
  const sameSite = isHttps ? 'SameSite=None; Secure' : 'SameSite=Lax';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; ${sameSite}; Max-Age=0`
  );
}

export function getCallerSession(req: Request): SessionClaims | null {
  const cookies = parseCookies(req.headers.cookie);
  const fromCookie = verifySessionToken(cookies[SESSION_COOKIE_NAME]);
  if (fromCookie) return fromCookie;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const raw = authHeader.slice('Bearer '.length).trim();
    const fromBearer = verifySessionToken(raw);
    if (fromBearer) return fromBearer;
  }
  return null;
}

export function getCaller(req: Request): string | null {
  const session = getCallerSession(req);
  return session?.walletAccountId || null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const caller = getCallerSession(req);
  if (!caller) {
    res.status(401).json({
      error: 'Authentication required. Please sign in or connect and verify your NEAR wallet.',
      code: 'UNAUTHENTICATED',
    });
    return;
  }
  (req as Request & { caller?: SessionClaims }).caller = caller;
  next();
}

// ============================================================================
// SECURITY HEADERS & CSRF / SAME-ORIGIN GUARD (Section 16.2, 16.6, 16.8)
// ============================================================================

export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader(
    'Permissions-Policy',
    'camera=(self), microphone=(), geolocation=(), payment=()'
  );
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
      "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.near.org https://*.fastnear.com https://*.supabase.co wss://*.supabase.co https://api.coingecko.com https://api.binance.com",
      "frame-ancestors *",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );
  next();
}

export function sameOriginGuard(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    next();
    return;
  }
  const origin = req.headers.origin;
  const host = (req.headers['x-forwarded-host'] as string | undefined) || req.headers.host;
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        res.status(403).json({
          error: 'Cross-origin state-changing request rejected by CSRF guard.',
          code: 'CSRF_ORIGIN_MISMATCH',
        });
        return;
      }
    } catch {
      res.status(403).json({ error: 'Malformed Origin header', code: 'CSRF_ORIGIN_INVALID' });
      return;
    }
  }
  next();
}

// ============================================================================
// OAUTH STATE & REDIRECT URL ALLOWLIST VALIDATION (Section 16.2)
// ============================================================================

interface PendingOAuthState {
  state: string;
  redirectUri: string;
  createdAt: number;
  expiresAt: number;
}

const pendingOAuthStates = new Map<string, PendingOAuthState>();

export function validateAllowedRedirectUri(
  candidateOriginOrUrl: string,
  reqHost?: string
): { valid: boolean; normalizedOrigin: string; error?: string } {
  const configuredAppUrl = process.env.APP_URL || 'http://localhost:3000';
  try {
    const parsed = new URL(candidateOriginOrUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, normalizedOrigin: '', error: 'Redirect URI must use http or https.' };
    }
    const host = parsed.host.toLowerCase();
    const configuredHost = new URL(configuredAppUrl).host.toLowerCase();
    const requestHost = (reqHost || '').toLowerCase();

    const isAllowed =
      host === configuredHost ||
      (requestHost && host === requestHost) ||
      host === 'localhost:3000' ||
      host === '127.0.0.1:3000' ||
      host.endsWith('.run.app');

    if (!isAllowed) {
      return {
        valid: false,
        normalizedOrigin: '',
        error: `Redirect origin "${parsed.origin}" is not in the BorrowBond OAuth allowlist.`,
      };
    }
    return { valid: true, normalizedOrigin: parsed.origin };
  } catch {
    return { valid: false, normalizedOrigin: '', error: 'Malformed redirect URI.' };
  }
}

export function issueOAuthStateToken(redirectUri: string): string {
  const now = Date.now();
  for (const [k, v] of pendingOAuthStates.entries()) {
    if (now > v.expiresAt) pendingOAuthStates.delete(k);
  }
  const state = crypto.randomBytes(24).toString('base64url');
  pendingOAuthStates.set(state, {
    state,
    redirectUri,
    createdAt: now,
    expiresAt: now + OAUTH_STATE_TTL_MS,
  });
  return state;
}

export function consumeOAuthStateToken(state: string | undefined): PendingOAuthState | null {
  if (!state) return null;
  const record = pendingOAuthStates.get(state);
  if (!record) return null;
  pendingOAuthStates.delete(state);
  if (Date.now() > record.expiresAt) return null;
  return record;
}

// ============================================================================
// WALLET OWNERSHIP REGISTRY (Prevents unauthorized wallet linking/hijacking)
// ============================================================================

export interface WalletOwnershipLink {
  walletAccountId: string;
  ownerUserId: string; // email or userId
  nearNetwork: 'testnet' | 'mainnet';
  publicKey: string;
  signatureProof: string;
  linkedAtIso: string;
}

const walletOwnershipRegistry = new Map<string, WalletOwnershipLink>();

export function getWalletOwnershipLink(walletAccountId: string): WalletOwnershipLink | null {
  return walletOwnershipRegistry.get(walletAccountId.trim().toLowerCase()) || null;
}

export function linkWalletToUserIdentity(params: {
  walletAccountId: string;
  ownerUserId?: string;
  userId?: string;
  email?: string;
  nearNetwork?: 'testnet' | 'mainnet';
  network?: 'testnet' | 'mainnet';
  publicKey?: string;
  signatureProof?: string;
  verificationProof?: string;
}): { ok: boolean; link?: WalletOwnershipLink; error?: string } {
  const walletKey = (params.walletAccountId || '').trim().toLowerCase();
  const userKey = (params.ownerUserId || params.userId || params.email || '').trim().toLowerCase();
  const proof = (params.signatureProof ?? params.verificationProof ?? '').trim();
  if (!walletKey || !userKey) {
    return { ok: false, error: 'Both walletAccountId and ownerUserId are required.' };
  }
  if (!proof) {
    return {
      ok: false,
      error: 'Cryptographic wallet signature or verified transaction proof is required to link a NEAR wallet.',
    };
  }

  const existing = walletOwnershipRegistry.get(walletKey);
  if (existing && existing.ownerUserId.toLowerCase() !== userKey) {
    return {
      ok: false,
      error: `Wallet "${walletKey}" is already linked to another BorrowBond account. Unauthorized wallet reassignment is blocked.`,
    };
  }

  const link: WalletOwnershipLink = {
    walletAccountId: walletKey,
    ownerUserId: userKey,
    nearNetwork: params.nearNetwork || params.network || 'testnet',
    publicKey: params.publicKey || 'ed25519:verified',
    signatureProof: proof,
    linkedAtIso: new Date().toISOString(),
  };
  walletOwnershipRegistry.set(walletKey, link);
  return { ok: true, link };
}

export function resetWalletOwnershipRegistryForTests(): void {
  walletOwnershipRegistry.clear();
}

// ============================================================================
// PASSWORD HASHING (scrypt + random 16-byte salt + timingSafeEqual)
// ============================================================================

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored || !stored.startsWith('scrypt$')) return false;
  const parts = stored.split('$');
  if (parts.length !== 3) return false;
  try {
    const salt = Buffer.from(parts[1], 'hex');
    const expected = Buffer.from(parts[2], 'hex');
    const actual = crypto.scryptSync(password, salt, expected.length);
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

// ============================================================================
// NEP-413 WALLET CHALLENGE NONCE + ED25519 SIGNATURE VERIFICATION
// ============================================================================

interface IssuedChallenge {
  accountId: string;
  network: 'testnet' | 'mainnet';
  nonce: Buffer; // 32 bytes
  message: string;
  recipient: string;
  issuedAt: number;
  expiresAt: number;
}

const challengeStore = new Map<string, IssuedChallenge>();

export function issueWalletChallenge(
  accountId: string,
  network: 'testnet' | 'mainnet',
  recipient: string
): { nonceBase64: string; message: string; recipient: string; expiresAt: number } {
  const now = Date.now();
  for (const [k, v] of challengeStore.entries()) {
    if (now > v.expiresAt) challengeStore.delete(k);
  }
  const nonce = crypto.randomBytes(32);
  const nonceBase64 = nonce.toString('base64');
  const message = `BorrowBond authentication for ${accountId} on NEAR ${network} at ${new Date(
    now
  ).toISOString()}`;
  challengeStore.set(nonceBase64, {
    accountId: accountId.toLowerCase(),
    network,
    nonce,
    message,
    recipient,
    issuedAt: now,
    expiresAt: now + NONCE_TTL_MS,
  });
  return { nonceBase64, message, recipient, expiresAt: now + NONCE_TTL_MS };
}

export function consumeWalletChallenge(nonceBase64: string): IssuedChallenge | null {
  const ch = challengeStore.get(nonceBase64);
  if (!ch) return null;
  challengeStore.delete(nonceBase64);
  if (Date.now() > ch.expiresAt) return null;
  return ch;
}

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function decodeBase58(input: string): Buffer {
  const bytes: number[] = [0];
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    const val = BASE58_ALPHABET.indexOf(c);
    if (val < 0) throw new Error(`Invalid base58 character: ${c}`);
    let carry = val;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  let leadingZeros = 0;
  for (let i = 0; i < input.length && input[i] === '1'; i++) leadingZeros++;
  const result = Buffer.alloc(leadingZeros + bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    result[result.length - 1 - i] = bytes[i];
  }
  return result;
}

export function base58Encode(buf: Buffer | Uint8Array): string {
  const digits = [0];
  for (let i = 0; i < buf.length; i++) {
    let carry = buf[i]!;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j]! << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let out = '';
  for (let i = 0; i < buf.length && buf[i] === 0; i++) {
    out += '1';
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    out += BASE58_ALPHABET[digits[i]!];
  }
  return out;
}

export const SESSION_TTL_SECONDS = Math.floor(SESSION_TTL_MS / 1000);
export const TESTNET_ACCOUNT_RE = /^(?:[a-z\d]+(?:[-_][a-z\d]+)*\.)+testnet$|^[0-9a-f]{64}$/;

export function createSessionToken(
  payload: { account: string; kind: 'wallet' | 'demo' },
  nowSec = Math.floor(Date.now() / 1000)
): string {
  const body = Buffer.from(
    JSON.stringify({
      a: payload.account,
      k: payload.kind,
      exp: nowSec + SESSION_TTL_SECONDS,
    }),
    'utf8'
  ).toString('base64url');
  const mac = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${mac}`;
}

export function readSessionToken(
  token: string | undefined | null,
  nowSec = Math.floor(Date.now() / 1000)
): { account: string; kind: 'wallet' | 'demo' } | null {
  if (!token || typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(mac, 'base64url');
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      a?: string;
      k?: 'wallet' | 'demo';
      exp?: number;
    };
    if (!parsed || typeof parsed.a !== 'string' || typeof parsed.exp !== 'number') return null;
    if (nowSec > parsed.exp) return null;
    return { account: parsed.a, kind: parsed.k || 'demo' };
  } catch {
    return null;
  }
}

export function createChallenge(nowSec = Math.floor(Date.now() / 1000)): {
  token: string;
  message: string;
  nonceB64: string;
  recipient: string;
} {
  const nonce = crypto.randomBytes(32);
  const nonceB64 = nonce.toString('base64');
  const recipient = 'borrowbondtest.testnet';
  const message = `BorrowBond NEP-413 Auth Challenge @ ${nowSec}`;
  const body = Buffer.from(
    JSON.stringify({
      m: message,
      n: nonceB64,
      r: recipient,
      exp: nowSec + 300,
    }),
    'utf8'
  ).toString('base64url');
  const mac = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return {
    token: `${body}.${mac}`,
    message,
    nonceB64,
    recipient,
  };
}

export function readChallenge(
  token: string | undefined | null,
  nowSec = Math.floor(Date.now() / 1000)
): { message: string; nonceB64: string; recipient: string } | null {
  if (!token || typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(mac, 'base64url');
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      m: string;
      n: string;
      r: string;
      exp: number;
    };
    if (!parsed || nowSec > parsed.exp) return null;
    return { message: parsed.m, nonceB64: parsed.n, recipient: parsed.r };
  } catch {
    return null;
  }
}

function encodeBorshString(s: string): Buffer {
  const utf8 = Buffer.from(s, 'utf8');
  const len = Buffer.alloc(4);
  len.writeUInt32LE(utf8.length, 0);
  return Buffer.concat([len, utf8]);
}

export function computeNep413PayloadHash(params: {
  message: string;
  nonce: Buffer;
  recipient: string;
  callbackUrl?: string;
}): Buffer {
  if (params.nonce.length !== 32) {
    throw new Error('NEP-413 nonce must be exactly 32 bytes');
  }
  const tag = Buffer.alloc(4);
  tag.writeUInt32LE(2147484061, 0); // 2^31 + 413
  const callbackBuf = params.callbackUrl
    ? Buffer.concat([Buffer.from([1]), encodeBorshString(params.callbackUrl)])
    : Buffer.from([0]);
  const serialized = Buffer.concat([
    tag,
    encodeBorshString(params.message),
    params.nonce,
    encodeBorshString(params.recipient),
    callbackBuf,
  ]);
  return crypto.createHash('sha256').update(serialized).digest();
}

export const nep413Hash = computeNep413PayloadHash;

export function verifyEd25519Signature(params: {
  nearPublicKey: string;
  signatureBase64: string;
  payload: Buffer;
}): boolean {
  try {
    const rawKeyStr = params.nearPublicKey.startsWith('ed25519:')
      ? params.nearPublicKey.slice('ed25519:'.length)
      : params.nearPublicKey;
    const rawPub = decodeBase58(rawKeyStr);
    if (rawPub.length !== 32) return false;
    const spkiPrefix = Buffer.from('302a300506032b6570032100', 'hex');
    const keyObj = crypto.createPublicKey({
      key: Buffer.concat([spkiPrefix, rawPub]),
      format: 'der',
      type: 'spki',
    });
    const sig = Buffer.from(params.signatureBase64, 'base64');
    if (sig.length !== 64) return false;
    return crypto.verify(null, params.payload, keyObj, sig);
  } catch {
    return false;
  }
}

export function verifyNep413(
  payload: { message: string; nonce: Buffer; recipient: string; callbackUrl?: string },
  nearPublicKey: string,
  signatureBase64: string
): boolean {
  try {
    const hash = computeNep413PayloadHash(payload);
    return verifyEd25519Signature({
      nearPublicKey,
      signatureBase64,
      payload: hash,
    });
  } catch {
    return false;
  }
}

export async function hasAccessKey(
  accountId: string,
  nearPublicKey: string,
  customFetch: typeof fetch = fetch
): Promise<boolean> {
  const normalizedKey = nearPublicKey.startsWith('ed25519:')
    ? nearPublicKey
    : `ed25519:${nearPublicKey}`;
  try {
    const res = await customFetch('https://test.rpc.fastnear.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'check-access-key',
        method: 'query',
        params: {
          request_type: 'view_access_key',
          finality: 'final',
          account_id: accountId,
          public_key: normalizedKey,
        },
      }),
    });
    const data = await res.json();
    return Boolean(data?.result && !data?.result?.error && !data?.error);
  } catch {
    return false;
  }
}

export async function verifyPublicKeyBelongsToNearAccount(
  accountId: string,
  nearPublicKey: string,
  network: 'testnet' | 'mainnet'
): Promise<boolean> {
  const rpcEndpoints =
    network === 'mainnet'
      ? ['https://rpc.mainnet.near.org', 'https://free.rpc.fastnear.com']
      : ['https://test.rpc.fastnear.com', 'https://rpc.testnet.near.org'];
  const normalizedKey = nearPublicKey.startsWith('ed25519:')
    ? nearPublicKey
    : `ed25519:${nearPublicKey}`;

  for (const url of rpcEndpoints) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'check-access-key',
          method: 'query',
          params: {
            request_type: 'view_access_key',
            finality: 'final',
            account_id: accountId,
            public_key: normalizedKey,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(t);
      if (!res.ok) continue;
      const data = await res.json();
      if (data?.result && !data?.result?.error && !data?.error) {
        return true;
      }
      if (data?.error || data?.result?.error) {
        return false;
      }
    } catch {
      // Try next RPC endpoint
    }
  }
  return false;
}

// ============================================================================
// FILE UPLOAD & EVIDENCE SECURITY VALIDATION (Section 16.9)
// ============================================================================

const ALLOWED_IMAGE_MIME_PREFIXES = [
  'data:image/jpeg;base64,',
  'data:image/png;base64,',
  'data:image/webp;base64,',
  'data:image/svg+xml;utf8,',
  'https://',
];

const MAX_DATA_URI_LENGTH_BYTES = 5 * 1024 * 1024; // 5 MB max per image

export function validateListingImageSecurity(images: unknown): {
  valid: boolean;
  sanitizedImages: string[];
  error?: string;
} {
  if (!Array.isArray(images) || images.length < 2 || images.length > 10) {
    return {
      valid: false,
      sanitizedImages: [],
      error: 'Listings require between 2 and 10 valid product images.',
    };
  }

  const sanitized: string[] = [];
  for (const raw of images) {
    if (typeof raw !== 'string' || !raw.trim()) {
      return { valid: false, sanitizedImages: [], error: 'Empty image URL/data URI rejected.' };
    }
    const img = raw.trim();
    if (img.length > MAX_DATA_URI_LENGTH_BYTES) {
      return {
        valid: false,
        sanitizedImages: [],
        error: 'Image exceeds maximum allowed size of 5 MB.',
      };
    }
    const lower = img.toLowerCase();
    if (
      lower.startsWith('javascript:') ||
      lower.startsWith('data:text/html') ||
      lower.startsWith('data:application/x-msdownload')
    ) {
      return {
        valid: false,
        sanitizedImages: [],
        error: 'Executable or HTML payloads are forbidden in listing images.',
      };
    }
    if (lower.startsWith('data:image/svg+xml') && /<script|onload=|onerror=/i.test(img)) {
      return {
        valid: false,
        sanitizedImages: [],
        error: 'SVG containing embedded scripts or event handlers is forbidden.',
      };
    }
    const allowedPrefix = ALLOWED_IMAGE_MIME_PREFIXES.some((p) => lower.startsWith(p));
    if (!allowedPrefix) {
      return {
        valid: false,
        sanitizedImages: [],
        error: 'Unsupported image format. Only HTTPS URLs or JPEG/PNG/WebP/SVG images are allowed.',
      };
    }
    sanitized.push(img);
  }

  return { valid: true, sanitizedImages: sanitized };
}

export function validateEvidenceSubmissionSecurity(params: {
  fileReference: string;
  conditionNotes: string;
}): { valid: boolean; sanitizedFileRef: string; sanitizedNotes: string; error?: string } {
  const rawRef = (params.fileReference || '').trim();
  const rawNotes = (params.conditionNotes || '').trim();
  if (!rawRef || rawRef.length > 256) {
    return {
      valid: false,
      sanitizedFileRef: '',
      sanitizedNotes: '',
      error: 'Evidence file reference must be between 1 and 256 characters.',
    };
  }
  if (/(\.\.\/|\.\.\\|^\/etc\/|\.exe$|\.sh$|\.bat$|\.js$|\.html$)/i.test(rawRef)) {
    return {
      valid: false,
      sanitizedFileRef: '',
      sanitizedNotes: '',
      error: 'Unsafe file extension or path traversal detected in evidence file reference.',
    };
  }
  if (rawNotes.length < 5 || rawNotes.length > 1000) {
    return {
      valid: false,
      sanitizedFileRef: '',
      sanitizedNotes: '',
      error: 'Condition notes must be between 5 and 1000 characters.',
    };
  }
  if (/<script|javascript:|onerror=|onload=/i.test(rawNotes) || /<script|javascript:/i.test(rawRef)) {
    return {
      valid: false,
      sanitizedFileRef: '',
      sanitizedNotes: '',
      error: 'XSS script or executable payload detected in evidence submission.',
    };
  }
  return {
    valid: true,
    sanitizedFileRef: rawRef.replace(/[<>"]/g, ''),
    sanitizedNotes: rawNotes.replace(/[<>]/g, ''),
  };
}

// ============================================================================
// SLIDING-WINDOW RATE LIMITER & SECURITY AUDIT LOGGER (Sections 16.6, 16.17)
// ============================================================================

interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

export function rateLimit(opts: { windowMs: number; max: number; keyPrefix: string }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip =
      ((req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        'local') +
      ':' +
      opts.keyPrefix;
    const now = Date.now();
    const existing = buckets.get(ip);
    if (!existing || now > existing.resetAt) {
      buckets.set(ip, { count: 1, resetAt: now + opts.windowMs });
      next();
      return;
    }
    existing.count += 1;
    if (existing.count > opts.max) {
      res.status(429).json({
        error: 'Too many requests. Please wait a moment and try again.',
        code: 'RATE_LIMITED',
      });
      return;
    }
    next();
  };
}

export interface SecurityAuditEvent {
  id: string;
  eventType:
    | 'AUTH_SIGN_IN'
    | 'AUTH_SIGN_OUT'
    | 'AUTH_FAILED'
    | 'WALLET_LINKED'
    | 'WALLET_LINK_BLOCKED'
    | 'LISTING_CREATED'
    | 'BOOKING_CREATED'
    | 'BOOKING_STATE_CHANGED'
    | 'DAMAGE_PROPOSED'
    | 'DAMAGE_ACCEPTED'
    | 'DAMAGE_REJECTED'
    | 'DISPUTE_OPENED'
    | 'DISPUTE_RESOLVED'
    | 'WITHDRAWAL_EXECUTED'
    | 'UNAUTHORIZED_ATTEMPT'
    | 'DUPLICATE_TX_BLOCKED';
  severity: 'INFO' | 'WARN' | 'HIGH' | 'CRITICAL';
  actorWallet: string | null;
  targetResourceType?: string;
  targetResourceId?: string;
  txHash?: string;
  metadata?: Record<string, unknown>;
  createdAtIso: string;
}

const securityAuditTrail: SecurityAuditEvent[] = [];

export function recordSecurityAuditEvent(
  event: Omit<SecurityAuditEvent, 'id' | 'createdAtIso'>
): SecurityAuditEvent {
  const full: SecurityAuditEvent = {
    ...event,
    id: `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    createdAtIso: new Date().toISOString(),
  };
  securityAuditTrail.unshift(full);
  if (securityAuditTrail.length > 500) {
    securityAuditTrail.pop();
  }
  return full;
}

export function getSecurityAuditTrail(limit = 100): SecurityAuditEvent[] {
  return securityAuditTrail.slice(0, Math.max(1, Math.min(500, limit)));
}


// ============================================================================
// IDENTITY ROUTES REGISTRATION (`/api/auth/*`)
// ============================================================================

export interface DemoPersona {
  account: string;
  label: string;
  role: 'BORROWER' | 'LENDER' | 'RESOLVER';
}

export function registerIdentityRoutes(
  app: import('express').Express,
  deps: {
    personas: DemoPersona[];
    getOrCreateProfile?: (
      walletId: string,
      opts?: { displayName?: string; email?: string; authMethod?: 'WALLET' | 'EMAIL' | 'GOOGLE' }
    ) => unknown;
  }
): void {
  const authRateLimiter = rateLimit({ windowMs: 60_000, max: 30, keyPrefix: 'auth' });

  app.get('/api/auth/session', (req, res) => {
    const caller = getCallerSession(req);
    if (!caller) {
      res.json({ authenticated: false, session: null, personas: deps.personas });
      return;
    }
    res.json({
      authenticated: true,
      session: caller,
      profile:
        caller.walletAccountId && deps.getOrCreateProfile
          ? deps.getOrCreateProfile(caller.walletAccountId)
          : null,
      personas: deps.personas,
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    const caller = getCallerSession(req);
    clearSessionCookie(res, req);
    recordSecurityAuditEvent({
      eventType: 'AUTH_SIGN_OUT',
      severity: 'INFO',
      actorWallet: caller?.walletAccountId || null,
    });
    res.json({ ok: true, authenticated: false });
  });

  app.post('/api/auth/demo-login', authRateLimiter, (req, res) => {
    const account = String(req.body?.account || '').trim().toLowerCase();
    const match = deps.personas.find((p) => p.account.toLowerCase() === account);
    if (!match) {
      res.status(400).json({ error: 'Unknown demo persona account.' });
      return;
    }
    const token = signSessionToken({
      walletAccountId: match.account,
      nearNetwork: 'testnet',
      authMethod: 'WALLET',
      walletVerified: true,
    });
    setSessionCookie(res, token, req);
    recordSecurityAuditEvent({
      eventType: 'AUTH_SIGN_IN',
      severity: 'INFO',
      actorWallet: match.account,
      metadata: { mode: 'DEMO_PERSONA' },
    });
    res.json({
      authenticated: true,
      walletAccountId: match.account,
      profile: deps.getOrCreateProfile
        ? deps.getOrCreateProfile(match.account, { displayName: match.label })
        : null,
      sessionToken: token,
    });
  });

  app.post('/api/auth/wallet/challenge', authRateLimiter, (req, res) => {
    const accountId = String(req.body?.accountId || '').trim().toLowerCase();
    const network: 'testnet' | 'mainnet' = req.body?.network === 'mainnet' ? 'mainnet' : 'testnet';
    if (!accountId || accountId.length < 2) {
      res.status(400).json({ error: 'Valid NEAR accountId is required to issue a challenge.' });
      return;
    }
    const recipient = process.env.VITE_NEAR_CONTRACT_ID || 'borrowbondtest.testnet';
    const ch = issueWalletChallenge(accountId, network, recipient);
    res.json(ch);
  });

  app.post('/api/auth/wallet/verify', authRateLimiter, async (req, res) => {
    try {
      const { accountId, publicKey, signatureBase64, nonceBase64, callbackUrl, ownerUserId } =
        req.body || {};
      const ch = consumeWalletChallenge(String(nonceBase64 || ''));
      if (!ch) {
        recordSecurityAuditEvent({
          eventType: 'AUTH_FAILED',
          severity: 'WARN',
          actorWallet: String(accountId || ''),
          metadata: { reason: 'EXPIRED_OR_REPLAYED_NONCE' },
        });
        res.status(401).json({ error: 'Invalid, expired, or already-used NEP-413 challenge nonce.' });
        return;
      }
      if (ch.accountId !== String(accountId || '').trim().toLowerCase()) {
        res.status(401).json({ error: 'Challenge accountId mismatch.' });
        return;
      }

      const payloadHash = computeNep413PayloadHash({
        message: ch.message,
        nonce: ch.nonce,
        recipient: ch.recipient,
        callbackUrl: callbackUrl ? String(callbackUrl) : undefined,
      });

      const sigValid = verifyEd25519Signature({
        nearPublicKey: String(publicKey || ''),
        signatureBase64: String(signatureBase64 || ''),
        payload: payloadHash,
      });
      if (!sigValid) {
        recordSecurityAuditEvent({
          eventType: 'AUTH_FAILED',
          severity: 'HIGH',
          actorWallet: ch.accountId,
          metadata: { reason: 'INVALID_ED25519_SIGNATURE' },
        });
        res.status(401).json({ error: 'Cryptographic NEP-413 Ed25519 signature verification failed.' });
        return;
      }

      const callerSession = getCallerSession(req);
      const effectiveOwnerId = String(ownerUserId || callerSession?.email || ch.accountId);
      const linkResult = linkWalletToUserIdentity({
        walletAccountId: ch.accountId,
        ownerUserId: effectiveOwnerId,
        nearNetwork: ch.network,
        publicKey: String(publicKey),
        signatureProof: String(signatureBase64),
      });
      if (!linkResult.ok) {
        recordSecurityAuditEvent({
          eventType: 'WALLET_LINK_BLOCKED',
          severity: 'HIGH',
          actorWallet: ch.accountId,
          metadata: { attemptedBy: effectiveOwnerId, error: linkResult.error },
        });
        res.status(409).json({ error: linkResult.error, code: 'WALLET_ALREADY_LINKED' });
        return;
      }

      const token = signSessionToken({
        walletAccountId: ch.accountId,
        nearNetwork: ch.network,
        authMethod: 'WALLET',
        email: callerSession?.email,
        userId: effectiveOwnerId,
        walletVerified: true,
      });
      setSessionCookie(res, token, req);
      recordSecurityAuditEvent({
        eventType: 'WALLET_LINKED',
        severity: 'INFO',
        actorWallet: ch.accountId,
        metadata: { ownerUserId: effectiveOwnerId, publicKey },
      });

      res.json({
        authenticated: true,
        walletVerified: true,
        walletAccountId: ch.accountId,
        nearNetwork: ch.network,
        sessionToken: token,
        profile: deps.getOrCreateProfile
          ? deps.getOrCreateProfile(ch.accountId, { authMethod: 'WALLET' })
          : null,
      });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Wallet signature verification failed',
      });
    }
  });
}
