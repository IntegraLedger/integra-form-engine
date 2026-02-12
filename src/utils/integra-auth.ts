/** IntegraAuth — client-side signing for attestations. */

import { toHex } from './crypto';

export interface AuthSession {
  method: 'api-key' | 'keypair' | 'wallet';
  userId: string;
  displayName: string;
  publicKey: string;
  algorithm: string;
}

interface InternalSession extends AuthSession {
  signingKey: CryptoKey | null;
  verifyKey?: CryptoKey;
}

export interface SignResult {
  signature: string;
  signedBy: string;
  userId: string;
  displayName: string;
  algorithm: string;
  method: string;
  timestamp: string;
}

let session: InternalSession | null = null;

export async function signInWithApiKey(
  apiKey: string,
  userId?: string | null,
  displayName?: string | null,
): Promise<AuthSession> {
  const kd = new TextEncoder().encode(apiKey);
  const sk = await crypto.subtle.importKey(
    'raw',
    kd,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const h = await crypto.subtle.digest('SHA-256', kd);
  const pk = 'hmac_' + toHex(h).slice(0, 16);
  session = {
    method: 'api-key',
    userId: userId || pk,
    displayName: displayName || 'API Key User',
    publicKey: pk,
    signingKey: sk,
    algorithm: 'HMAC-SHA256',
  };
  return getSession()!;
}

export async function signInWithKeypair(
  _passphrase: string,
): Promise<AuthSession> {
  const kp = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  const raw = await crypto.subtle.exportKey('raw', kp.publicKey);
  const pkHex = toHex(raw);
  session = {
    method: 'keypair',
    userId: 'ecdsa_' + pkHex.slice(0, 16),
    displayName: 'ECDSA ' + pkHex.slice(0, 8) + '…',
    publicKey: pkHex,
    signingKey: kp.privateKey,
    verifyKey: kp.publicKey,
    algorithm: 'ECDSA-P256-SHA256',
  };
  return getSession()!;
}

export async function signInWithWallet(): Promise<AuthSession> {
  const eth = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<string[]> } }).ethereum;
  if (!eth) throw new Error('No wallet detected');
  const accts = await eth.request({ method: 'eth_requestAccounts' });
  if (!accts?.length) throw new Error('No account');
  const addr = accts[0];
  session = {
    method: 'wallet',
    userId: addr,
    displayName: addr.slice(0, 6) + '…' + addr.slice(-4),
    publicKey: addr,
    signingKey: null,
    algorithm: 'ETH-personal_sign',
  };
  return getSession()!;
}

export async function signPayload(payload: string): Promise<SignResult> {
  if (!session) throw new Error('Not signed in');
  let sig: string;
  if (session.method === 'api-key') {
    sig = toHex(
      await crypto.subtle.sign(
        'HMAC',
        session.signingKey!,
        new TextEncoder().encode(payload),
      ),
    );
  } else if (session.method === 'keypair') {
    const s = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      session.signingKey!,
      new TextEncoder().encode(payload),
    );
    sig = toHex(s);
  } else {
    const eth = (window as unknown as { ethereum: { request: (args: { method: string; params: unknown[] }) => Promise<string> } }).ethereum;
    const msg = '0x' + toHex(new TextEncoder().encode(payload).buffer as ArrayBuffer);
    sig = await eth.request({
      method: 'personal_sign',
      params: [msg, session.userId],
    });
  }
  return {
    signature: sig,
    signedBy: session.publicKey,
    userId: session.userId,
    displayName: session.displayName,
    algorithm: session.algorithm,
    method: session.method,
    timestamp: new Date().toISOString(),
  };
}

export function buildSignablePayload(a: {
  integraId: string;
  roundTripHash: string;
  requestHash: string;
  responseHash: string;
  merkleRoot: string;
  timestamp: string;
}): string {
  return [
    'integra-attest-v1',
    a.integraId,
    a.roundTripHash,
    a.requestHash,
    a.responseHash || 'none',
    a.merkleRoot,
    a.timestamp,
  ].join('|');
}

export function isSignedIn(): boolean {
  return session !== null && session.signingKey !== null;
}

export function getSession(): AuthSession | null {
  if (!session) return null;
  const { signingKey: _sk, verifyKey: _vk, ...rest } = session;
  return rest;
}

export function signOut(): void {
  session = null;
}
