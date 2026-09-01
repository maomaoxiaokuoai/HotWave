import { getDb } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  DEFAULT_PREFS,
  isClickMode,
  isFxType,
  isIntensity,
  isThemeId,
} from "@/lib/themes";

export const dynamic = "force-dynamic";

async function readSettings() {
  try {
    const db = await getDb();
    if (!db) return null;
    const rows = await db
      .select()
      .from(settings)
      .where(eq(settings.id, 1))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function GET() {
  const row = await readSettings();
  return Response.json({
    theme: row?.theme ?? DEFAULT_PREFS.theme,
    fx: row?.fx ?? DEFAULT_PREFS.fx,
    intensity: row?.intensity ?? DEFAULT_PREFS.intensity,
    clickfx: row?.clickfx ?? DEFAULT_PREFS.clickfx,
    persisted: Boolean(row),
  });
}

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    /* ignore */
  }

  const theme = isThemeId(body.theme) ? body.theme : undefined;
  const fx = isFxType(body.fx) ? body.fx : undefined;
  const intensity = isIntensity(body.intensity) ? body.intensity : undefined;
  const clickfx = isClickMode(body.clickfx) ? body.clickfx : undefined;

  if (!theme && !fx && !intensity && !clickfx) {
    return Response.json({ ok: false, message: "参数无效" }, { status: 400 });
  }

  // 无数据库时（如 Cloudflare 部署）：设置保存在浏览器 localStorage，这里直接确认
  const db = await getDb();
  if (!db) {
    return Response.json(
      { ok: true, theme, fx, intensity, clickfx, persisted: false }
    );
  }

  try {
    await db
      .insert(settings)
      .values({
        id: 1,
        theme: theme ?? DEFAULT_PREFS.theme,
        fx: fx ?? DEFAULT_PREFS.fx,
        intensity: intensity ?? DEFAULT_PREFS.intensity,
        clickfx: clickfx ?? DEFAULT_PREFS.clickfx,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: settings.id,
        set: {
          ...(theme ? { theme } : {}),
          ...(fx ? { fx } : {}),
          ...(intensity ? { intensity } : {}),
          ...(clickfx ? { clickfx } : {}),
          updatedAt: new Date(),
        },
      });
    return Response.json(
      { ok: true, theme, fx, intensity, clickfx, persisted: true }
    );
  } catch (err) {
    console.error("save settings failed:", err);
    return Response.json({ ok: false, message: "保存失败" }, { status: 500 });
  }
}
