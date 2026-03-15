import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude node_modules from file watching to reduce inotify instances
  watchOptions: {
    ignored: ["**/node_modules/**", "**/.git/**"],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
