import type { IconName } from "@/components/ui/icons";

export const THEME_IDS = [
  "frost",
  "cyber",
  "sakura",
  "retro",
  "aurora",
  "mono",
  "glass",
  "glitch",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

/** 天气特效类型 */
export const FX_TYPES = ["none", "snow", "rain", "storm", "hearts"] as const;

export type FXType = (typeof FX_TYPES)[number];

/** 特效强度 */
export const INTENSITIES = ["light", "medium", "heavy"] as const;

export type Intensity = (typeof INTENSITIES)[number];

/** 鼠标点击特效 */
export const CLICK_MODES = ["none", "hearts", "stars", "snowflakes", "mixed"] as const;

export type ClickMode = (typeof CLICK_MODES)[number];

export interface ThemeDef {
  id: ThemeId;
  name: string;
  icon: IconName;
  desc: string;
}

export const THEMES: ThemeDef[] = [
  { id: "frost", name: "冰蓝极简", icon: "snowflake", desc: "清爽浅色" },
  { id: "cyber", name: "赛博霓虹", icon: "zap", desc: "霓虹电光" },
  { id: "sakura", name: "樱花暖春", icon: "flower", desc: "粉嫩温柔" },
  { id: "retro", name: "复古报纸", icon: "newspaper", desc: "泛黄纸张" },
  { id: "aurora", name: "极光幻境", icon: "aurora", desc: "翠绿极光" },
  { id: "mono", name: "黑白高定", icon: "sparkle", desc: "极简黑白" },
  { id: "glass", name: "液态玻璃", icon: "droplet", desc: "苹果质感玻璃" },
  { id: "glitch", name: "崩坏错误", icon: "zap", desc: "故障艺术" },
];

export interface FxDef {
  id: FXType;
  label: string;
  icon: IconName;
  desc: string;
}

export const FX_DEFS: FxDef[] = [
  { id: "none", label: "无特效", icon: "sun", desc: "关闭天气特效" },
  { id: "snow", label: "大雪", icon: "snowflake", desc: "大雪花飘落" },
  { id: "rain", label: "下雨", icon: "rain", desc: "雨丝下落" },
  { id: "storm", label: "雷暴", icon: "storm", desc: "暴雨+闪电" },
  { id: "hearts", label: "爱心雨", icon: "heart", desc: "爱心飘落" },
];

export interface ClickDef {
  id: ClickMode;
  label: string;
  icon: IconName;
  desc: string;
}

export const CLICK_DEFS: ClickDef[] = [
  { id: "none", label: "无", icon: "sun", desc: "关闭点击特效" },
  { id: "hearts", label: "爱心", icon: "heart", desc: "点击迸发爱心" },
  { id: "stars", label: "星星", icon: "star", desc: "点击迸发星星" },
  { id: "snowflakes", label: "雪花", icon: "snowflake", desc: "点击迸发雪花" },
  { id: "mixed", label: "随机", icon: "sparkle", desc: "爱心/星星/雪花混合" },
];

export const INTENSITY_LABELS: Record<Intensity, string> = {
  light: "小",
  medium: "中",
  heavy: "大",
};

/**
 * 站点默认偏好（首次访问 / 服务端无持久化数据时的配置）：
 * 冰蓝极简 · 大雪 · 小 · 点击爱心（地区筛选为纯前端状态，默认"全部"）
 */
export const DEFAULT_PREFS = {
  theme: "frost" as ThemeId,
  fx: "snow" as FXType,
  intensity: "light" as Intensity,
  clickfx: "hearts" as ClickMode,
};

/** 这些特效支持强度调节（雷暴强度同时控制雨量与闪电频率） */
export const FX_WITH_INTENSITY: FXType[] = ["snow", "rain", "storm", "hearts"];

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === "string" && (THEME_IDS as readonly string[]).includes(v);
}

export function isFxType(v: unknown): v is FXType {
  return typeof v === "string" && (FX_TYPES as readonly string[]).includes(v);
}

export function isIntensity(v: unknown): v is Intensity {
  return (
    typeof v === "string" && (INTENSITIES as readonly string[]).includes(v)
  );
}

export function isClickMode(v: unknown): v is ClickMode {
  return typeof v === "string" && (CLICK_MODES as readonly string[]).includes(v);
}
