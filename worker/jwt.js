// Google 登入憑證（ID token）驗證：RS256 簽章、發行者、對象、到期、email 已驗證
const b64urlToBytes = (s) => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '='));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};
const b64urlToJSON = (s) => JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));

let certCache = { keys: null, until: 0 };
async function googleKeys() {
  if (certCache.keys && Date.now() < certCache.until) return certCache.keys;
  const r = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  if (!r.ok) throw new Error('cannot fetch google certs');
  const maxAge = Number((r.headers.get('cache-control') || '').match(/max-age=(\d+)/)?.[1] || 3600);
  certCache = { keys: (await r.json()).keys, until: Date.now() + Math.min(maxAge, 21600) * 1000 };
  return certCache.keys;
}

/** 驗證 Google 登入憑證；成功回傳 { email, name }，失敗丟出錯誤。getKeys 可注入以便測試。 */
export async function verifyIdToken(token, clientId, getKeys = googleKeys, now = Date.now()) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('bad token');
  const header = b64urlToJSON(parts[0]);
  const payload = b64urlToJSON(parts[1]);
  if (header.alg !== 'RS256') throw new Error('bad alg');
  const jwk = (await getKeys()).find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('unknown key');
  const key = await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  if (!ok) throw new Error('bad signature');
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss)) throw new Error('bad issuer');
  if (payload.aud !== clientId) throw new Error('bad audience');
  if (!(payload.exp * 1000 > now)) throw new Error('expired');
  if (payload.email_verified !== true || !payload.email) throw new Error('email not verified');
  return { email: String(payload.email).toLowerCase(), name: String(payload.name || '') };
}

