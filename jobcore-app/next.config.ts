import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma", "@prisma/adapter-neon", "@neondatabase/serverless", "resend", "stripe"],
};

export default nextConfig;
