import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Emit page/index.html so FastAPI static serving finds each route.
  trailingSlash: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
