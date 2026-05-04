/**
 * Initialization script
 * Seeds the database with example data and starts the heartbeat scheduler
 */

import { getDb, getUserSystems, createSystem, upsertUser } from "./db";
import { startHeartbeatScheduler } from "./heartbeatScheduler";
import { ENV } from "./_core/env";

const GOOGLE_EXAMPLE = {
  title: "Google",
  url: "www.google.com",
};

/**
 * Initialize the application
 */
export async function initializeApp() {
  console.log("[Init] Starting application initialization...");

  try {
    // Ensure database is available
    const db = await getDb();
    if (!db) {
      console.warn("[Init] Database not available, skipping initialization");
      return;
    }

    // Ensure owner user exists
    if (ENV.ownerOpenId) {
      console.log("[Init] Ensuring owner user exists...");
      await upsertUser({
        openId: ENV.ownerOpenId,
        name: "System Owner",
        role: "admin",
        lastSignedIn: new Date(),
      });

      // Seed Google example if owner has no systems
      try {
        const ownerSystems = await getUserSystems(1); // Owner is typically user ID 1
        if (ownerSystems.length === 0) {
          console.log("[Init] Seeding Google example system...");
          await createSystem(1, GOOGLE_EXAMPLE.title, GOOGLE_EXAMPLE.url);
          console.log("[Init] Google example system created");
        }
      } catch (error) {
        console.warn("[Init] Failed to seed Google example:", error);
      }
    }

    // Start heartbeat scheduler
    console.log("[Init] Starting heartbeat scheduler...");
    startHeartbeatScheduler(60000); // Check every 60 seconds

    console.log("[Init] Application initialization complete");
  } catch (error) {
    console.error("[Init] Initialization failed:", error);
    throw error;
  }
}

/**
 * Graceful shutdown
 */
export async function shutdownApp() {
  console.log("[Shutdown] Starting graceful shutdown...");

  const { stopHeartbeatScheduler } = await import("./heartbeatScheduler");
  stopHeartbeatScheduler();

  console.log("[Shutdown] Shutdown complete");
}
