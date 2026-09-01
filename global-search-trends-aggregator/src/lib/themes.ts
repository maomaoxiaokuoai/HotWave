import type { IconName } from "@/components/icons";

export const THEME_IDS = [
  "frost",
  "midnight",
  "cyber",
  "sakura",
  "retro",
  "xmas",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

/** 天气特效类型 */
export const FX_TYPES = ["none", "snow", "rain", "storm"] as const;

export type FXType = (typeof FX_TYPES)[number];

/** 特效强度 */
export const INTENSITIES = ["light", "medium", "heavy"] as const;

export type Intensity = (typeof INTENSITIES)[number];

export interface ThemeDef {
  id: ThemeId;
  name: string;
  icon: IconName;
  desc: string;
}

export const THEMES: ThemeDef[] = [
  { id: "frost", name: "冰蓝极简", icon: "snowflake", desc: "清爽浅色" },
  { id: "midnight", name: "深夜暗黑", icon: "moon", desc: "静谧深蓝" },
  { id: "cyber", name: "赛博霓虹", icon: "zap", desc: "霓虹电光" },
  { id: "sakura", name: "樱花暖春", icon: "flower", desc: "粉嫩温柔" },
  { id: "retro", name: "复古报纸", icon: "newspaper", desc: "泛黄纸张" },
  { id: "xmas", name: "圣诞冬夜", icon: "tree", desc: "红绿金冬" },
];

export interface FxDef {
  id: FXType;
  label: string;
  icon: IconName;
  desc: string;
}

export const FX_DEFS: FxDef[] = [
  { id: "none", label: "无特效", icon: "sun", desc: "关闭天气特效" },
  { id: "snow", label: "雪花", icon: "snowflake", desc: "雪花飘落" },
  { id: "rain", label: "下雨", icon: "rain", desc: "雨丝下落" },
  { id: "storm", label: "雷暴", icon: "storm", desc: "暴雨+闪电" },
];

export const INTENSITY_LABELS: Record<Intensity, string> = {
  light: "小",
  medium: "中",
  heavy: "大",
};

/** 这些特效支持强度调节（雷暴强度同时控制雨量与闪电频率） */
export const FX_WITH_INTENSITY: FXType[] = ["snow", "rain", "storm"];

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
