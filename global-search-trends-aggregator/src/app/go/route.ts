import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const SAFE_URL = /^https?:\/\//i;

/**
 * 外链中转：所有外部链接先跳到本站 /go（同源），
 * 再由浏览器在新标签页里做顶层跳转到目标站。
 *
 * 原因：Google/YouTube/Hacker News 等站点返回的 X-Frame-Options / CSP
 * 防护头，会让浏览器直接阻止“从内嵌框架/代理上下文”发起的跳转
 * （ERR_BLOCKED_BY_RESPONSE），同源中转后可正常打开。
 */
export function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u") ?? "";
  // 只允许 http/https，拦截 javascript: 等危险协议
  const target = SAFE_URL.test(u) ? u : "/";
  // Location 头必须为纯 ASCII，中文等字符需百分号编码
  const location = encodeURI(target);
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
