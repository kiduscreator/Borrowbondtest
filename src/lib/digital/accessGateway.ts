import type { OnChainBooking } from '../near/escrowStateMachine';

export interface DigitalCredentialRecord {
  id: string;
  bookingId: string;
  listingId: string;
  borrowerWallet: string;
  tokenSha256Hash: string;
  tokenPrefix: string; // First 10 chars e.g. bb_live_9f... for UI identification without exposing secret
  endpointPath: string;
  quotaLimit: number;
  usageCount: number;
  expiresAtIso: string;
  revoked: boolean;
  revokedReason?: string;
  createdAtIso: string;
}

export interface DigitalUsageEvent {
  id: string;
  credentialId: string;
  bookingId: string;
  timestampIso: string;
  requestPath: string;
  querySummary: string;
  statusCode: number;
  outcome: 'ALLOWED' | 'DENIED_QUOTA' | 'DENIED_EXPIRED' | 'DENIED_REVOKED' | 'DENIED_INACTIVE_BOOKING' | 'DENIED_INVALID_TOKEN';
}

export interface DigitalGatewayStore {
  credentialsById: Record<string, DigitalCredentialRecord>;
  credentialIdByHash: Record<string, string>;
  credentialIdByBooking: Record<string, string>;
  usageEvents: DigitalUsageEvent[];
}

export function createDigitalGatewayStore(): DigitalGatewayStore {
  return {
    credentialsById: {},
    credentialIdByHash: {},
    credentialIdByBooking: {},
    usageEvents: [],
  };
}

function generateRandomHex(byteLength = 18): string {
  const bytes = new Uint8Array(byteLength);
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Pure synchronous 256-bit cryptographic digest (isomorphic across Node.js and Browser)
export function hashTemporaryToken(rawToken: string, salt = 'borrowbond-gateway-v1'): string {
  const input = `${salt}:${rawToken}`;
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const rotr = (n: number, x: number) => (x >>> n) | (x << (32 - n));
  const bytes = new TextEncoder().encode(input);
  const bitLen = bytes.length * 8;
  const padLen = ((bytes.length + 8) >>> 6) + 1;
  const words = new Uint32Array(padLen * 16);
  for (let i = 0; i < bytes.length; i++) {
    words[i >>> 2] |= bytes[i] << (24 - (i & 3) * 8);
  }
  words[bytes.length >>> 2] |= 0x80 << (24 - (bytes.length & 3) * 8);
  words[words.length - 1] = bitLen;

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const W = new Uint32Array(64);

  for (let i = 0; i < words.length; i += 16) {
    for (let t = 0; t < 16; t++) W[t] = words[i + t];
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(7, W[t - 15]) ^ rotr(18, W[t - 15]) ^ (W[t - 15] >>> 3);
      const s1 = rotr(17, W[t - 2]) ^ rotr(19, W[t - 2]) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((v) => v.toString(16).padStart(8, '0'))
    .join('');
}

export interface IssueCredentialInput {
  booking: OnChainBooking;
  callerWallet: string;
  quotaLimit: number;
  durationHours: number;
  endpointPath?: string;
  nowIso?: string;
  DeterministicTokenOverride?: string;
}

export function issueTemporaryCredential(
  store: DigitalGatewayStore,
  input: IssueCredentialInput
): { rawTokenOnce: string; credential: DigitalCredentialRecord } {
  const { booking, callerWallet, quotaLimit, durationHours } = input;

  if (booking.resourceType !== 'DIGITAL') {
    throw new Error('Credentials can only be issued for DIGITAL resource bookings');
  }
  if (booking.borrower !== callerWallet) {
    throw new Error('Unauthorized: Only the booking borrower can receive temporary credentials');
  }
  if (booking.status !== 'ACTIVE') {
    throw new Error(
      `Booking must be verified as ACTIVE on-chain before issuing credentials (current status: ${booking.status})`
    );
  }
  if (quotaLimit <= 0) {
    throw new Error('Usage quota limit must be positive');
  }

  const existingId = store.credentialIdByBooking[booking.bookingId];
  if (existingId && store.credentialsById[existingId]) {
    // Revoke previous credential if re-issued
    const prev = store.credentialsById[existingId];
    prev.revoked = true;
    prev.revokedReason = 'Superseded by newly rotated credential';
  }

  const now = input.nowIso ? new Date(input.nowIso) : new Date();
  const expiresAt = new Date(now.getTime() + durationHours * 3600 * 1000);

  const randomHex = generateRandomHex(18);
  const rawTokenOnce = input.DeterministicTokenOverride ?? `bb_temp_${booking.bookingId.replace(/[^a-zA-Z0-9]/g, '').slice(-6)}_${randomHex}`;
  const tokenHash = hashTemporaryToken(rawTokenOnce);

  const credentialId = `cred-${booking.bookingId}-${Date.now()}`;
  const credential: DigitalCredentialRecord = {
    id: credentialId,
    bookingId: booking.bookingId,
    listingId: booking.listingId,
    borrowerWallet: callerWallet,
    tokenSha256Hash: tokenHash,
    tokenPrefix: `${rawTokenOnce.slice(0, 14)}...`,
    endpointPath: input.endpointPath ?? '/api/demo-resource/weather',
    quotaLimit,
    usageCount: 0,
    expiresAtIso: expiresAt.toISOString(),
    revoked: false,
    createdAtIso: now.toISOString(),
  };

  store.credentialsById[credentialId] = credential;
  store.credentialIdByHash[tokenHash] = credentialId;
  store.credentialIdByBooking[booking.bookingId] = credentialId;

  return { rawTokenOnce, credential };
}

export function revokeCredential(
  store: DigitalGatewayStore,
  credentialId: string,
  callerWallet: string,
  lenderWallet: string,
  reason = 'Revoked by authorized party'
): DigitalCredentialRecord {
  const cred = store.credentialsById[credentialId];
  if (!cred) {
    throw new Error('Credential not found');
  }
  if (callerWallet !== cred.borrowerWallet && callerWallet !== lenderWallet) {
    throw new Error('Unauthorized: Only borrower or provider can revoke this credential');
  }
  cred.revoked = true;
  cred.revokedReason = reason;
  return cred;
}

export interface ExecuteDemoApiCallInput {
  rawToken: string;
  bookingsById: Record<string, OnChainBooking>;
  queryCity?: string;
  nowIso?: string;
}

export interface ExecuteDemoApiCallResult {
  allowed: boolean;
  statusCode: number;
  error?: string;
  remainingQuota?: number;
  expiresAtIso?: string;
  data?: {
    provider: string;
    station: string;
    city: string;
    timestampIso: string;
    temperatureC: number;
    humidityPct: number;
    windKph: number;
    pressureHpa: number;
    condition: string;
    forecast24h: string;
  };
}

const CITY_TELEMETRY: Record<string, { tempC: number; humidity: number; wind: number; pressure: number; cond: string; station: string }> = {
  'zurich': { tempC: 14.2, humidity: 62, wind: 11.4, pressure: 1016, cond: 'Clear Alpine Air', station: 'MET-ZRH-04' },
  'san francisco': { tempC: 16.8, humidity: 74, wind: 19.2, pressure: 1014, cond: 'Coastal Marine Layer', station: 'MET-SFO-09' },
  'tokyo': { tempC: 21.5, humidity: 58, wind: 14.0, pressure: 1018, cond: 'High Visibility', station: 'MET-HND-02' },
  'london': { tempC: 13.1, humidity: 79, wind: 16.5, pressure: 1009, cond: 'Scattered Stratocumulus', station: 'MET-LHR-11' },
  'singapore': { tempC: 29.4, humidity: 82, wind: 9.8, pressure: 1010, cond: 'Tropical Convection', station: 'MET-SIN-01' },
};

export function executeControlledDemoApiRequest(
  store: DigitalGatewayStore,
  input: ExecuteDemoApiCallInput
): ExecuteDemoApiCallResult {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const cleanToken = (input.rawToken ?? '').trim();

  if (!cleanToken) {
    return {
      allowed: false,
      statusCode: 401,
      error: 'Missing temporary API credential token in Authorization header.',
    };
  }

  const tokenHash = hashTemporaryToken(cleanToken);
  const credId = store.credentialIdByHash[tokenHash];
  const cred = credId ? store.credentialsById[credId] : undefined;

  if (!cred) {
    return {
      allowed: false,
      statusCode: 401,
      error: 'Invalid or unrecognized temporary API credential.',
    };
  }

  const booking = input.bookingsById[cred.bookingId];
  if (!booking || booking.status !== 'ACTIVE') {
    store.usageEvents.unshift({
      id: `use-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      credentialId: cred.id,
      bookingId: cred.bookingId,
      timestampIso: nowIso,
      requestPath: cred.endpointPath,
      querySummary: `city=${input.queryCity ?? 'zurich'}`,
      statusCode: 403,
      outcome: 'DENIED_INACTIVE_BOOKING',
    });
    return {
      allowed: false,
      statusCode: 403,
      error: `Access denied: Associated on-chain booking (${cred.bookingId}) is no longer ACTIVE (status: ${booking?.status ?? 'UNKNOWN'}).`,
    };
  }

  if (cred.revoked) {
    store.usageEvents.unshift({
      id: `use-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      credentialId: cred.id,
      bookingId: cred.bookingId,
      timestampIso: nowIso,
      requestPath: cred.endpointPath,
      querySummary: `city=${input.queryCity ?? 'zurich'}`,
      statusCode: 403,
      outcome: 'DENIED_REVOKED',
    });
    return {
      allowed: false,
      statusCode: 403,
      error: `Access denied: Temporary credential has been revoked (${cred.revokedReason ?? 'Revoked'}).`,
    };
  }

  if (new Date(nowIso).getTime() >= new Date(cred.expiresAtIso).getTime()) {
    cred.revoked = true;
    cred.revokedReason = 'Rental duration expired';
    store.usageEvents.unshift({
      id: `use-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      credentialId: cred.id,
      bookingId: cred.bookingId,
      timestampIso: nowIso,
      requestPath: cred.endpointPath,
      querySummary: `city=${input.queryCity ?? 'zurich'}`,
      statusCode: 403,
      outcome: 'DENIED_EXPIRED',
    });
    return {
      allowed: false,
      statusCode: 403,
      error: `Access denied: Rental credential expired at ${cred.expiresAtIso}.`,
      remainingQuota: Math.max(0, cred.quotaLimit - cred.usageCount),
      expiresAtIso: cred.expiresAtIso,
    };
  }

  if (cred.usageCount >= cred.quotaLimit) {
    store.usageEvents.unshift({
      id: `use-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      credentialId: cred.id,
      bookingId: cred.bookingId,
      timestampIso: nowIso,
      requestPath: cred.endpointPath,
      querySummary: `city=${input.queryCity ?? 'zurich'}`,
      statusCode: 429,
      outcome: 'DENIED_QUOTA',
    });
    return {
      allowed: false,
      statusCode: 429,
      error: `Usage quota exhausted (${cred.usageCount}/${cred.quotaLimit} requests used). Renew or complete agreement.`,
      remainingQuota: 0,
      expiresAtIso: cred.expiresAtIso,
    };
  }

  // Enforce usage increment
  cred.usageCount += 1;
  const remainingQuota = cred.quotaLimit - cred.usageCount;

  const cityKey = (input.queryCity ?? 'zurich').toLowerCase().trim();
  const baseTelemetry = CITY_TELEMETRY[cityKey] ?? CITY_TELEMETRY['zurich'];

  store.usageEvents.unshift({
    id: `use-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    credentialId: cred.id,
    bookingId: cred.bookingId,
    timestampIso: nowIso,
    requestPath: cred.endpointPath,
    querySummary: `city=${input.queryCity ?? 'Zurich'}`,
    statusCode: 200,
    outcome: 'ALLOWED',
  });

  return {
    allowed: true,
    statusCode: 200,
    remainingQuota,
    expiresAtIso: cred.expiresAtIso,
    data: {
      provider: 'BorrowBond Controlled Demo Weather & Atmospheric Telemetry Gateway',
      station: baseTelemetry.station,
      city: input.queryCity ?? 'Zurich',
      timestampIso: nowIso,
      temperatureC: baseTelemetry.tempC,
      humidityPct: baseTelemetry.humidity,
      windKph: baseTelemetry.wind,
      pressureHpa: baseTelemetry.pressure,
      condition: baseTelemetry.cond,
      forecast24h: 'Stable barometric trend; telemetry verified via BorrowBond gateway.',
    },
  };
}
