import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pg / drizzle-orm 仅在有 DATABASE_URL 时动态加载。
  // 保持为外部包，避免被 bundle 进 Cloudflare Workers 构建产物
  // （Workers 运行时没有 node:net，且无数据库时根本不会加载它们）。
  serverExternalPackages: ["pg", "drizzle-orm"],
};

export default nextConfig;
