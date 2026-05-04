import { and, eq, gte, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, monitoredSystems, pingHistory } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Get all monitored systems for a user
 */
export async function getUserSystems(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get systems: database not available");
    return [];
  }

  try {
    return await db
      .select()
      .from(monitoredSystems)
      .where(eq(monitoredSystems.userId, userId))
      .orderBy(monitoredSystems.createdAt);
  } catch (error) {
    console.error("[Database] Failed to get user systems:", error);
    throw error;
  }
}

/**
 * Get a single system by ID and verify ownership
 */
export async function getSystemById(systemId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get system: database not available");
    return undefined;
  }

  try {
    const result = await db
      .select()
      .from(monitoredSystems)
      .where(
        and(
          eq(monitoredSystems.id, systemId),
          eq(monitoredSystems.userId, userId)
        )
      )
      .limit(1);

    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get system:", error);
    throw error;
  }
}

/**
 * Create a new monitored system
 */
export async function createSystem(
  userId: number,
  title: string,
  url: string
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create system: database not available");
    return undefined;
  }

  try {
    const result = await db.insert(monitoredSystems).values({
      userId,
      title,
      url,
      status: "unknown",
    });

    const systemId = (result as any).insertId;
    return await getSystemById(systemId, userId);
  } catch (error) {
    console.error("[Database] Failed to create system:", error);
    throw error;
  }
}

/**
 * Delete a monitored system
 */
export async function deleteSystem(systemId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete system: database not available");
    return false;
  }

  try {
    const result = await db
      .delete(monitoredSystems)
      .where(
        and(
          eq(monitoredSystems.id, systemId),
          eq(monitoredSystems.userId, userId)
        )
      );

    return (result as any).affectedRows > 0;
  } catch (error) {
    console.error("[Database] Failed to delete system:", error);
    throw error;
  }
}

/**
 * Update system status and last checked time
 */
export async function updateSystemStatus(
  systemId: number,
  status: "online" | "down",
  responseTime: number
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update system: database not available");
    return undefined;
  }

  try {
    await db
      .update(monitoredSystems)
      .set({
        status,
        lastResponseTime: responseTime,
        lastCheckedAt: new Date(),
      })
      .where(eq(monitoredSystems.id, systemId));

    return await db
      .select()
      .from(monitoredSystems)
      .where(eq(monitoredSystems.id, systemId))
      .limit(1)
      .then((r) => r[0]);
  } catch (error) {
    console.error("[Database] Failed to update system:", error);
    throw error;
  }
}

/**
 * Record a ping in history
 */
export async function recordPing(
  systemId: number,
  status: "online" | "down",
  responseTime: number
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot record ping: database not available");
    return undefined;
  }

  try {
    const result = await db.insert(pingHistory).values({
      systemId,
      status,
      responseTime,
    });

    return result;
  } catch (error) {
    console.error("[Database] Failed to record ping:", error);
    throw error;
  }
}

/**
 * Get ping history for a system in the last 12 hours
 */
export async function getPingHistory(
  systemId: number,
  hoursBack: number = 12
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get ping history: database not available");
    return [];
  }

  try {
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    return await db
      .select()
      .from(pingHistory)
      .where(
        and(
          eq(pingHistory.systemId, systemId),
          gte(pingHistory.timestamp, cutoffTime)
        )
      )
      .orderBy(pingHistory.timestamp);
  } catch (error) {
    console.error("[Database] Failed to get ping history:", error);
    throw error;
  }
}

/**
 * Clean up old ping records (older than 24 hours)
 */
export async function cleanupOldPings() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot cleanup pings: database not available");
    return 0;
  }

  try {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await db
      .delete(pingHistory)
      .where(lt(pingHistory.timestamp, cutoffTime));

    return (result as any).affectedRows || 0;
  } catch (error) {
    console.error("[Database] Failed to cleanup pings:", error);
    throw error;
  }
}

// TODO: add additional feature queries here as your schema grows.
