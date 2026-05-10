import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["simple-git", "yaml"],
};

export default nextConfig;
