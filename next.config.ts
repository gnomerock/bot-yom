import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "discord.js",
    "@discordjs/rest",
    "postgres",
    "better-auth",
    "drizzle-orm",
  ],
};

export default nextConfig;
