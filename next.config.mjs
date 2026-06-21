/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  // node-adodb uses native modules - exclude from webpack bundling
  serverExternalPackages: ['node-adodb'],
  experimental: {
    // Allow server-side access to native binaries
  },
};

export default nextConfig;
