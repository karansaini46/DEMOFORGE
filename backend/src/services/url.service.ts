import dns from 'node:dns';
import { promisify } from 'node:util';

import ipaddr from 'ipaddr.js';

import { AppError } from '../middleware/error.middleware';

const dnsLookup = promisify(dns.lookup);

const MAX_URL_LENGTH = 2048;
const ALLOWED_PROTOCOLS = ['http:', 'https:'];
const ALLOWED_PORTS = ['', '80', '443'];

// IP ranges (per ipaddr.js .range()) that must never be reachable via a user URL.
const BLOCKED_RANGES = [
  'loopback',
  'private',
  'linkLocal',
  'uniqueLocal',
  'broadcast',
];

// Explicit host/IP denylist for cloud metadata endpoints.
const BLOCKED_HOSTS = ['169.254.169.254', 'metadata.google.internal'];

/**
 * Validates a user-supplied URL against SSRF and abuse vectors, then resolves
 * its hostname and ensures the target IP is not on a restricted network.
 * Returns a sanitized URL string (origin + pathname + search).
 */
export async function validateUrl(rawUrl: string): Promise<string> {
  // a. Length guard (before any parsing work).
  if (rawUrl.length > MAX_URL_LENGTH) {
    throw new AppError('URL too long', 400);
  }

  // b. Parse.
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new AppError('Invalid URL format', 400);
  }

  // c. Protocol allowlist.
  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    throw new AppError('Only HTTP/HTTPS allowed', 400);
  }

  // d. No embedded credentials.
  if (parsed.username || parsed.password) {
    throw new AppError('URL credentials not allowed', 400);
  }

  // e. Port allowlist (parsed.port is '' for default ports).
  if (!ALLOWED_PORTS.includes(parsed.port)) {
    throw new AppError('URL port not allowed', 400);
  }

  // Explicit hostname denylist (case-insensitive).
  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.includes(hostname)) {
    throw new AppError('URL points to restricted network', 403);
  }

  // f. Resolve hostname to an IP.
  let address: string;
  try {
    const result = await dnsLookup(parsed.hostname);
    address = result.address;
  } catch {
    throw new AppError('URL points to restricted network', 403);
  }

  // Block the metadata IP even if reached via a different hostname.
  if (BLOCKED_HOSTS.includes(address)) {
    throw new AppError('URL points to restricted network', 403);
  }

  // g. Classify the resolved IP and reject restricted ranges.
  let range: string;
  try {
    range = ipaddr.parse(address).range();
  } catch {
    throw new AppError('URL points to restricted network', 403);
  }

  if (BLOCKED_RANGES.includes(range)) {
    throw new AppError('URL points to restricted network', 403);
  }

  // h. Return a sanitized URL (drops fragment, normalizes origin).
  return `${parsed.origin}${parsed.pathname}${parsed.search}`;
}
