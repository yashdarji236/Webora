/**
 * SSRF-Safe URL Validation Service
 * Protects against SSRF, DNS rebinding, private network probing, and cloud metadata access.
 */

import dns from "node:dns/promises";
import net from "node:net";

/**
 * Check if an IP address is private, loopback, or cloud-internal
 * @param {string} ip
 * @returns {boolean}
 */
export function isPrivateOrReservedIP(ip) {
  if (!ip) return true;

  // IPv4 Checks
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4) return true;

    // 0.0.0.0/8 (Broadcast)
    if (parts[0] === 0) return true;

    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;

    // 10.0.0.0/8 (Private)
    if (parts[0] === 10) return true;

    // 172.16.0.0/12 (Private: 172.16.x.x - 172.31.x.x)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

    // 192.168.0.0/16 (Private)
    if (parts[0] === 192 && parts[1] === 168) return true;

    // 169.254.0.0/16 (Link-local & Cloud Metadata: 169.254.169.254)
    if (parts[0] === 169 && parts[1] === 254) return true;

    // 224.0.0.0/4 (Multicast)
    if (parts[0] >= 224 && parts[0] <= 239) return true;

    // 240.0.0.0/4 (Reserved)
    if (parts[0] >= 240) return true;

    // 255.255.255.255 (Broadcast)
    if (ip === "255.255.255.255") return true;

    return false;
  }

  // IPv6 Checks
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    // ::1 (Loopback)
    if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") return true;
    // :: (Unspecified)
    if (lower === "::") return true;
    // fe80::/10 (Link-local)
    if (lower.startsWith("fe80:") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true;
    // fc00::/7 & fd00::/8 (Unique local)
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    // IPv4-mapped IPv6 (::ffff:192.168.1.1)
    if (lower.includes("::ffff:")) {
      const ipv4Part = lower.split("::ffff:")[1];
      if (net.isIPv4(ipv4Part)) {
        return isPrivateOrReservedIP(ipv4Part);
      }
    }
    return false;
  }

  return true;
}

/**
 * Validate that a URL is safe to fetch (valid syntax, HTTP/HTTPS, public DNS)
 * @param {string} inputUrl
 * @returns {Promise<{ valid: boolean, sanitizedUrl?: string, error?: string }>}
 */
export async function validateUrlSafety(inputUrl) {
  if (!inputUrl || typeof inputUrl !== "string") {
    return { valid: false, error: "Website URL must be a non-empty string." };
  }

  let parsed;
  try {
    const formatted = inputUrl.trim().startsWith("http://") || inputUrl.trim().startsWith("https://")
      ? inputUrl.trim()
      : `https://${inputUrl.trim()}`;
    parsed = new URL(formatted);
  } catch {
    return { valid: false, error: `Invalid URL format: "${inputUrl}".` };
  }

  // Protocol check: Only allow HTTP and HTTPS
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, error: `Forbidden protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost and internal names
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    return { valid: false, error: `Access to local network host "${hostname}" is restricted.` };
  }

  // If hostname is directly an IP
  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIP(hostname)) {
      return { valid: false, error: `Access to private or reserved IP address "${hostname}" is blocked.` };
    }
  } else {
    // Perform DNS lookup to inspect resolved address
    try {
      const records = await dns.lookup(hostname, { all: true });
      if (!records || records.length === 0) {
        return { valid: false, error: `Domain "${hostname}" could not be resolved in DNS.` };
      }

      for (const record of records) {
        if (isPrivateOrReservedIP(record.address)) {
          return {
            valid: false,
            error: `Domain "${hostname}" resolved to private or internal IP (${record.address}). Request blocked.`,
          };
        }
      }
    } catch (dnsErr) {
      return { valid: false, error: `DNS resolution failed for "${hostname}": ${dnsErr.message}` };
    }
  }

  return {
    valid: true,
    sanitizedUrl: parsed.origin + parsed.pathname,
    origin: parsed.origin,
    hostname,
  };
}

