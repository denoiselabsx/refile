/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow the ngrok tunnel host to load Next.js dev resources (HMR, JS
  // bundles). Without this, pages render but client JS is blocked, so
  // things like the /login/google redirect hang forever. Dev-only;
  // harmless in production builds.
  allowedDevOrigins: ["hangup-scholar-raven.ngrok-free.dev"],
};

export default nextConfig;
