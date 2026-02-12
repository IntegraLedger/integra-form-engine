/** Client-side crypto helpers for attestation. */

export function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}

export async function sha256(data: string | Uint8Array): Promise<string> {
  const buf =
    typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const h = await crypto.subtle.digest('SHA-256', buf as unknown as ArrayBuffer);
  return toHex(h);
}

export async function hmacSha256(key: string, msg: string): Promise<string> {
  const k = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const s = await crypto.subtle.sign(
    'HMAC',
    k,
    new TextEncoder().encode(msg),
  );
  return toHex(s);
}

export function genSalt(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return toHex(b.buffer);
}

export function genUid(): string {
  return (
    'ig_' +
    Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) =>
      b.toString(16).padStart(2, '0'),
    ).join('')
  );
}

export function truncate(s: string | null | undefined, n: number): string {
  if (!s) return '—';
  s = String(s);
  return s.length > n ? s.slice(0, n) + '…' : s;
}

export async function computeMerkleRoot(
  leaves: string[],
): Promise<string> {
  let current = [...leaves];
  while (current.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < current.length; i += 2) {
      next.push(await sha256(current[i] + (current[i + 1] || current[i])));
    }
    current = next;
  }
  return current[0];
}
