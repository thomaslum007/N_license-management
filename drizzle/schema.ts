import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Monitored systems table - stores configuration for each system being monitored
 * Max 20 systems per user (enforced at application level)
 */
export const monitoredSystems = mysqlTable("monitored_systems", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  url: varchar("url", { length: 2048 }).notNull(),
  status: mysqlEnum("status", ["online", "down", "unknown"]).default("unknown").notNull(),
  lastCheckedAt: timestamp("lastCheckedAt"),
  lastResponseTime: int("lastResponseTime"), // milliseconds
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MonitoredSystem = typeof monitoredSystems.$inferSelect;
export type InsertMonitoredSystem = typeof monitoredSystems.$inferInsert;

/**
 * Ping history table - stores detailed ping records for charting and analysis
 * Records are kept for 12 hours (older records can be pruned)
 */
export const pingHistory = mysqlTable("ping_history", {
  id: int("id").autoincrement().primaryKey(),
  systemId: int("systemId").notNull().references(() => monitoredSystems.id, { onDelete: "cascade" }),
  responseTime: int("responseTime").notNull(), // milliseconds, -1 if failed
  status: mysqlEnum("status", ["online", "down"]).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type PingRecord = typeof pingHistory.$inferSelect;
export type InsertPingRecord = typeof pingHistory.$inferInsert;