import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 仅 pg 保持外部包：它只在配置了 DATABASE_URL 时被动态加载。
  // drizzle-orm 是纯 JS，必须正常打包（Cloudflare Workers 运行时没有
  // node_modules 解析，若也设为外部包会导致模块加载失败、整站打不开）。
  serverExternalPackages: ["pg"],
};

export default nextConfig;
