import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    cpus: 1,
    webpackBuildWorker: false,
    workerThreads: false,
  },
  outputFileTracingRoot: process.cwd(),
  outputFileTracingExcludes: {
    "*": [
      ".next/**",
      "build-attempt.log",
      "dev-server*.log",
      "node_modules/playwright/**",
      "node_modules/@playwright/**",
      "node_modules/typescript/**",
      "node_modules/@types/**",
    ],
  },
};

export default nextConfig;
