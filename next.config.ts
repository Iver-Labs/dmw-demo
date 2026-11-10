import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone/server.js plus only the traced node_modules (see Dockerfile).
  output: "standalone",
  poweredByHeader: false,
  // Transformers.js loads onnxruntime-node's native binding by a computed path, which file tracing
  // can't follow. Ship only the CPU runtime for Cloud Run's linux/x64: not the CUDA/TensorRT
  // providers (~270 MB) or other platforms.
  outputFileTracingIncludes: {
    "/api/chat": [
      "./node_modules/onnxruntime-node/package.json",
      // onnxruntime-node require()s the CommonJS build; tracing only finds the ESM one.
      "./node_modules/onnxruntime-common/dist/cjs/**/*",
      "./node_modules/onnxruntime-node/dist/**/*.js",
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/x64/onnxruntime_binding.node",
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/x64/libonnxruntime.so.1",
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/x64/libonnxruntime_providers_shared.so",
    ],
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
