// Shared OAuth helpers used across Builder UI and React Vault

export interface OAuthInfoLike {
  authorizationURL?: string;
  requestTokenURL?: string;
  userAuthorizationURL?: string;
  accessTokenURL?: string;
  tokenURL?: string;
}

// Attempts to extract a provider/service name from a URL's hostname
export function extractPlatformFromUrl(url?: string): string {
  if (!url) return 'unknown';
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    // Quick checks for common providers
    if (hostname.includes('google')) return 'Google';
    if (hostname.includes('linkedin')) return 'LinkedIn';
    if (hostname.includes('twitter') || hostname.includes('x.com')) return 'Twitter/X';

    // Generic extraction: capture first significant label
    const generic = hostname.match(
      /(?:^|\.)?([a-z0-9-]+)\.(?:com|net|org|io|co|app|ai|dev|cloud|us|tv)(?:$|\.)/i,
    );
    if (generic && generic[1]) {
      const label = generic[1].toLowerCase();
      if (!['www', 'api', 'auth', 'oauth', 'accounts', 'login', 'app'].includes(label)) {
        return label.charAt(0).toUpperCase() + label.slice(1);
      }
    }

    // Fallback: consider the left-most label if meaningful
    const parts = hostname.split('.');
    if (parts.length > 1) {
      const first = parts[0];
      if (!['www', 'api', 'auth', 'oauth', 'accounts', 'login', 'app'].includes(first)) {
        return first.charAt(0).toUpperCase() + first.slice(1);
      }
    }
    return 'unknown';
  } catch {
    return 'invalid_url';
  }
}

// Derives a provider/service name by checking typical OAuth URLs
export function deriveServiceFromOauthInfo(oauthInfo?: Partial<OAuthInfoLike>): string {
  if (!oauthInfo) return '';
  const urls = [
    oauthInfo.authorizationURL,
    oauthInfo.requestTokenURL,
    oauthInfo.userAuthorizationURL,
    oauthInfo.accessTokenURL,
    oauthInfo.tokenURL,
  ];
  for (const u of urls) {
    const platform = extractPlatformFromUrl(u);
    if (platform && platform !== 'unknown' && platform !== 'invalid_url') return platform;
  }
  return '';
}


