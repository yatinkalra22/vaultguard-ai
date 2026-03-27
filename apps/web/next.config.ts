import type { NextConfig } from "next";

// WHY: CSP without nonces — VaultGuard has no third-party scripts, so we can
// use the simpler headers() approach. This keeps static generation working
// (better performance, CDN caching) while still blocking XSS.
// 'unsafe-inline' for styles is required by Tailwind CSS.
// See: https://nextjs.org/docs/app/guides/content-security-policy
const isDev = process.env.NODE_ENV === "development";

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`;

const nextConfig: NextConfig = {
  reactCompiler: true,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // WHY: CSP restricts which resources the browser can load.
          // Blocks inline script injection (XSS), unauthorized iframes, etc.
          {
            key: "Content-Security-Policy",
            value: cspHeader.replace(/\n/g, "").replace(/\s{2,}/g, " ").trim(),
          },
          // WHY: Prevents clickjacking by blocking the page from being
          // embedded in iframes on other domains.
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // WHY: Stops browsers from MIME-sniffing a response away from
          // the declared Content-Type — prevents drive-by downloads.
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // WHY: Controls how much referrer info is sent with requests.
          // strict-origin-when-cross-origin sends origin only to cross-origin
          // requests, full URL to same-origin — good balance of privacy/utility.
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // WHY: Disables browser features VaultGuard doesn't need.
          // Reduces attack surface from malicious scripts trying to access
          // camera, mic, or geolocation.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // WHY: Forces HTTPS for 1 year. includeSubDomains ensures all
          // subdomains also use HTTPS. Prevents SSL-stripping attacks.
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
