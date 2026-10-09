/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["nodemailer"],
    // The poster route reads the Anton font from disk.
    outputFileTracingIncludes: { "/api/poster/[id]": ["./assets/**"] },
  },
};
export default nextConfig;
