import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/** 用户偏好设置（单行：id = 1） */
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  theme: text("theme").notNull().default("frost"),
  /** 天气特效类型：none / snow / rain / storm */
  fx: text("fx").notNull().default("snow"),
  /** 特效强度：light / medium / heavy */
  intensity: text("intensity").notNull().default("light"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** 热搜聚合缓存 */
export const hotCache = pgTable("hot_cache", {
  key: text("key").primaryKey(),
  payload: text("payload").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
