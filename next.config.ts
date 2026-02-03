import type { NextConfig } from "next";

const isCI = process.env.CI === 'true' || process.env.CI === '1'
const isWindows = process.platform === 'win32'
const isOneDrivePath = isWindows && process.cwd().toLowerCase().includes('\\onedrive\\')
const distDir = isOneDrivePath && !isCI ? '.next-local' : '.next'

const nextConfig: NextConfig = {
  // Windows + OneDrive commonly locks files under `.next/diagnostics` and can break `next build`.
  // When the repo is inside OneDrive, use a separate distDir to avoid stale/locked files.
  distDir,
  cleanDistDir: isCI ? true : !isOneDrivePath,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gkuiofigalygipxlssop.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'gkuiofigalygipxlssop.supabase.co',
        port: '',
        pathname: '/storage/v1/object/sign/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
