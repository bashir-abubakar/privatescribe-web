/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { webpackBuildWorker: true },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "microphone=(self)" }
        ]
      },
      {
        source: "/(manifest.json|worklets/:path*|models/:path*|assets/:path*|icons/:path*)",
        headers: [{ key: "Cross-Origin-Resource-Policy", value: "same-origin" }]
      }
    ];
  },

  webpack(config, { isServer }) {
    // Prefer browser conditions so @xenova/transformers picks web backends
    config.resolve.conditionNames = [
      "browser",
      "import",
      "module",
      "default",
      ...(config.resolve.conditionNames || [])
    ];

    // Do NOT bundle onnxruntime-node (native .node binary)
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "onnxruntime-node": false,
      // hard-disable a few Node-only modules that some deps probe for
      fs: false,
      path: false,
      crypto: false
    };

    // (Optional) also mark it external on the server bundle just in case
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push("onnxruntime-node");
    }

    return config;
  }
};

export default nextConfig;
