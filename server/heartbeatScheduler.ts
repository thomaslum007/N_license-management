/**
 * Heartbeat Scheduler
 * Manages periodic ping checks for all monitored systems
 */

import { getDb, updateSystemStatus, recordPing, cleanupOldPings } from "./db";
import { pingWithRetry } from "./heartbeat";
import { monitoredSystems } from "../drizzle/schema";

const DEFAULT_INTERVAL = 60000; // 60 seconds
const CLEANUP_INTERVAL = 3600000; // 1 hour

let schedulerInterval: NodeJS.Timeout | null = null;
let cleanupInterval: NodeJS.Timeout | null = null;
let isRunning = false;

/**
 * Run a single heartbeat cycle for all users and systems
 */
export async function runHeartbeatCycle() {
  if (isRunning) {
    console.log("[Heartbeat] Cycle already running, skipping");
    return;
  }

  isRunning = true;

  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Heartbeat] Database not available, skipping cycle");
      isRunning = false;
      return;
    }

    // Get all systems
    const allSystems = await db.select().from(monitoredSystems);

    if (!allSystems || allSystems.length === 0) {
      console.log("[Heartbeat] No systems to check");
      isRunning = false;
      return;
    }

    // Process each system
    let checkedCount = 0;
    for (const system of allSystems) {
      try {
        const result = await pingWithRetry(system.url, 1, 10000);

        // Update system status
        await updateSystemStatus(system.id, result.status, result.responseTime);

        // Record in history
        await recordPing(system.id, result.status, result.responseTime);

        checkedCount++;
        console.log(
          `[Heartbeat] Checked ${system.title} (${system.url}): ${result.status} (${result.responseTime}ms)`
        );
      } catch (error) {
        console.error(`[Heartbeat] Error checking ${system.title}:`, error);
      }
    }

    console.log(`[Heartbeat] Cycle complete: checked ${checkedCount} systems`);
  } catch (error) {
    console.error("[Heartbeat] Cycle failed:", error);
  } finally {
    isRunning = false;
  }
}

/**
 * Run cleanup of old ping records
 */
export async function runCleanup() {
  try {
    const deletedCount = await cleanupOldPings();
    console.log(`[Heartbeat] Cleanup: deleted ${deletedCount} old ping records`);
  } catch (error) {
    console.error("[Heartbeat] Cleanup failed:", error);
  }
}

/**
 * Start the heartbeat scheduler
 */
export function startHeartbeatScheduler(intervalMs: number = DEFAULT_INTERVAL) {
  if (schedulerInterval) {
    console.warn("[Heartbeat] Scheduler already running");
    return;
  }

  console.log(`[Heartbeat] Starting scheduler with ${intervalMs}ms interval`);

  // Run initial cycle immediately
  runHeartbeatCycle();

  // Schedule regular cycles
  schedulerInterval = setInterval(() => {
    runHeartbeatCycle();
  }, intervalMs);

  // Schedule cleanup
  cleanupInterval = setInterval(() => {
    runCleanup();
  }, CLEANUP_INTERVAL);
}

/**
 * Stop the heartbeat scheduler
 */
export function stopHeartbeatScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }

  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }

  console.log("[Heartbeat] Scheduler stopped");
}

/**
 * Check if scheduler is running
 */
export function isHeartbeatSchedulerRunning() {
  return schedulerInterval !== null;
}
