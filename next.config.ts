import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { tsconfigPath: "tsconfig.vercel.json" },
  // Only the Next.js/Vercel build uses the HTTP connection to D1.
  webpack(config, { webpack }) {
    config.plugins.push(
      new webpack.DefinePlugin({
        "process.env.JLCG_DATABASE_DRIVER": JSON.stringify("d1-http"),
      }),
    );
    // The local vinext build resolves this module inside Cloudflare Workers.
    // Vercel uses the HTTP driver and never executes the Workers-only import.
    config.externals.push({
      "cloudflare:workers": "commonjs cloudflare:workers",
    });
    return config;
  },
};

export default nextConfig;
