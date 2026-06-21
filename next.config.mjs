/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  experimental: {
    // Allow server-side access to native binaries
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
};

export default nextConfig;
