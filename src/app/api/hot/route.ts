import { aggregateHotSearches } from "@/lib/hotsearch";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const refresh = url.searchParams.get("refresh") === "1";
  try {
    const data = await aggregateHotSearches(refresh);
    return Response.json(data);
  } catch (err) {
    console.error("aggregate hot searches failed:", err);
    return Response.json(
      { error: "聚合热搜失败，请稍后重试" },
      { status: 500 }
    );
  }
}
