# System Status Monitor - Complete Integration Guide

## Quick Start

This is a **production-ready, modular system uptime monitoring tool** designed to be integrated into existing platforms without conflicts. It includes a cyberpunk-themed dashboard, real-time heartbeat checks, and 12-hour ping history visualization.

### What You Get

✅ **Backend**: Heartbeat engine with HEAD/GET fallback, periodic scheduler (60s), database persistence  
✅ **Frontend**: Cyberpunk dashboard with real-time status, charts, add/remove systems  
✅ **Database**: Two tables (monitored_systems, ping_history) with automatic cleanup  
✅ **API**: 5 tRPC procedures for complete system management  
✅ **Pre-loaded**: Google (www.google.com) example for immediate testing  
✅ **Limits**: Max 20 systems, automatic 24-hour history cleanup  

---

## Step-by-Step Integration

### Phase 1: Database Setup

**1.1 Add Tables to Schema**

Add this to your `drizzle/schema.ts`:

```typescript
import { int, mysqlEnum, mysqlTable, varchar, timestamp } from "drizzle-orm/mysql-core";

export const monitoredSystems = mysqlTable("monitored_systems", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  url: varchar("url", { length: 2048 }).notNull(),
  status: mysqlEnum("status", ["online", "down", "unknown"]).default("unknown").notNull(),
  lastCheckedAt: timestamp("lastCheckedAt"),
  lastResponseTime: int("lastResponseTime"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MonitoredSystem = typeof monitoredSystems.$inferSelect;
export type InsertMonitoredSystem = typeof monitoredSystems.$inferInsert;

export const pingHistory = mysqlTable("ping_history", {
  id: int("id").autoincrement().primaryKey(),
  systemId: int("systemId").notNull().references(() => monitoredSystems.id, { onDelete: "cascade" }),
  responseTime: int("responseTime").notNull(),
  status: mysqlEnum("status", ["online", "down"]).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type PingRecord = typeof pingHistory.$inferSelect;
export type InsertPingRecord = typeof pingHistory.$inferInsert;
```

**1.2 Generate & Apply Migration**

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

---

### Phase 2: Backend Integration

**2.1 Copy Backend Files**

```bash
cp system-status-monitor/server/heartbeat.ts <your-project>/server/
cp system-status-monitor/server/heartbeatScheduler.ts <your-project>/server/
cp system-status-monitor/server/init.ts <your-project>/server/
```

**2.2 Add Database Helpers to `server/db.ts`**

Copy all query helper functions from the module's `server/db.ts`:
- `getUserSystems(userId: number)`
- `getSystemById(systemId: number, userId: number)`
- `createSystem(userId: number, title: string, url: string)`
- `deleteSystem(systemId: number, userId: number)`
- `updateSystemStatus(systemId: number, status, responseTime)`
- `recordPing(systemId: number, status, responseTime)`
- `getPingHistory(systemId: number, hoursBack?: number)`
- `cleanupOldPings()`

Also add imports:
```typescript
import { and, eq, gte, lt } from "drizzle-orm";
import { monitoredSystems, pingHistory } from "../drizzle/schema";
```

**2.3 Add tRPC Procedures to `server/routers.ts`**

Add this router to your `appRouter`:

```typescript
systems: router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const { getUserSystems } = await import("./db");
    return await getUserSystems(ctx.user.id);
  }),

  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(255),
      url: z.string().min(1).max(2048),
    }))
    .mutation(async ({ ctx, input }) => {
      const { getUserSystems, createSystem } = await import("./db");
      const { isValidUrl } = await import("./heartbeat");

      if (!isValidUrl(input.url)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid URL format" });
      }

      const existingSystems = await getUserSystems(ctx.user.id);
      if (existingSystems.length >= 20) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Maximum 20 monitored systems allowed" });
      }

      return await createSystem(ctx.user.id, input.title, input.url);
    }),

  delete: protectedProcedure
    .input(z.object({ systemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { deleteSystem } = await import("./db");
      const success = await deleteSystem(input.systemId, ctx.user.id);
      if (!success) {
        throw new TRPCError({ code: "NOT_FOUND", message: "System not found" });
      }
      return { success: true };
    }),

  getHistory: protectedProcedure
    .input(z.object({ systemId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { getSystemById, getPingHistory } = await import("./db");
      const system = await getSystemById(input.systemId, ctx.user.id);
      if (!system) {
        throw new TRPCError({ code: "NOT_FOUND", message: "System not found" });
      }
      return await getPingHistory(input.systemId);
    }),

  manualPing: protectedProcedure
    .input(z.object({ systemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { getSystemById, updateSystemStatus, recordPing } = await import("./db");
      const { pingWithRetry } = await import("./heartbeat");

      const system = await getSystemById(input.systemId, ctx.user.id);
      if (!system) {
        throw new TRPCError({ code: "NOT_FOUND", message: "System not found" });
      }

      const result = await pingWithRetry(system.url, 1, 10000);
      await updateSystemStatus(system.id, result.status, result.responseTime);
      await recordPing(system.id, result.status, result.responseTime);

      return {
        status: result.status,
        responseTime: result.responseTime,
        error: result.error,
      };
    }),
}),
```

**2.4 Initialize App in `server/_core/index.ts`**

Add at the start of `startServer()`:

```typescript
async function startServer() {
  // Initialize app (database, heartbeat scheduler, etc.)
  const { initializeApp, shutdownApp } = await import("../init");
  await initializeApp();

  // Graceful shutdown handlers
  process.on("SIGTERM", async () => {
    console.log("[Server] SIGTERM received, shutting down...");
    await shutdownApp();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("[Server] SIGINT received, shutting down...");
    await shutdownApp();
    process.exit(0);
  });

  // ... rest of server setup
}
```

---

### Phase 3: Frontend Integration

**3.1 Copy Components**

```bash
cp system-status-monitor/client/src/components/StatusBadge.tsx <your-project>/client/src/components/
cp system-status-monitor/client/src/components/SystemCard.tsx <your-project>/client/src/components/
cp system-status-monitor/client/src/components/AddSystemForm.tsx <your-project>/client/src/components/
cp system-status-monitor/client/src/components/PingChart.tsx <your-project>/client/src/components/
```

**3.2 Copy Dashboard Page**

```bash
cp system-status-monitor/client/src/pages/MonitoringDashboard.tsx <your-project>/client/src/pages/
```

**3.3 Add Route in `client/src/App.tsx`**

```typescript
import MonitoringDashboard from "./pages/MonitoringDashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/monitor" component={MonitoringDashboard} />
      {/* other routes */}
    </Switch>
  );
}
```

**3.4 Optional: Apply Cyberpunk Theme**

Merge cyberpunk CSS from `system-status-monitor/client/src/index.css` into your `client/src/index.css`:

```css
/* Add to :root */
--accent: oklch(0.7 0.25 280);  /* Neon Pink */
--muted: oklch(0.65 0.25 180);  /* Neon Cyan */
--background: oklch(0.05 0 0);  /* Deep Black */

/* Add animations */
@keyframes neon-glow {
  0%, 100% { text-shadow: 0 0 10px rgb(219 39 119 / 0.8); }
  50% { text-shadow: 0 0 20px rgb(219 39 119 / 1); }
}

/* Add utility classes */
.text-neon-pink { color: rgb(219 39 119); animation: neon-glow 2s infinite; }
.text-neon-cyan { color: rgb(34 211 238); }
.border-glow { border: 1px solid rgb(219 39 119); box-shadow: 0 0 10px rgb(219 39 119 / 0.5); }
```

---

## Configuration

### Heartbeat Interval
Edit `server/heartbeatScheduler.ts`:
```typescript
const DEFAULT_INTERVAL = 60000; // Change to desired milliseconds
```

### Ping Timeout
Edit `server/heartbeat.ts`:
```typescript
const DEFAULT_TIMEOUT = 10000; // Change to desired milliseconds
```

### Max Systems Limit
Edit `server/routers.ts` in `systems.create`:
```typescript
if (existingSystems.length >= 20) { // Change 20 to your limit
```

### Disable Pre-loaded Example
Edit `server/init.ts` and comment out or remove the seeding logic.

---

## API Reference

### `systems.list`
```typescript
const systems = await trpc.systems.list.useQuery();
// Returns: MonitoredSystem[]
```

### `systems.create`
```typescript
const newSystem = await trpc.systems.create.useMutation({
  onSuccess: (system) => console.log("Created:", system),
}).mutateAsync({ title: "My API", url: "https://api.example.com" });
// Input: { title: string, url: string }
// Returns: MonitoredSystem
```

### `systems.delete`
```typescript
await trpc.systems.delete.useMutation().mutateAsync({ systemId: 1 });
// Input: { systemId: number }
// Returns: { success: boolean }
```

### `systems.getHistory`
```typescript
const history = await trpc.systems.getHistory.useQuery({ systemId: 1 });
// Returns: PingRecord[] (last 12 hours)
```

### `systems.manualPing`
```typescript
const result = await trpc.systems.manualPing.useMutation().mutateAsync({ systemId: 1 });
// Returns: { status: "online" | "down", responseTime: number, error?: string }
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Systems not pinging | Check server logs for `[Heartbeat]` messages; verify database connectivity |
| Chart shows no data | Wait 60+ seconds for first heartbeat; check browser console for errors |
| Empty state not showing form | Ensure `AddSystemForm` is rendered when `systems.length === 0` |
| Max 20 limit not enforced | Verify `systems.create` procedure checks `existingSystems.length >= 20` |
| Google example not seeding | Check `server/init.ts` and verify owner user exists in database |

---

## Performance Tips

1. **Add Database Indexes**: Index `ping_history.timestamp` and `monitored_systems.userId` for faster queries
2. **Chart Sampling**: Dashboard automatically samples data if >60 points (configurable in `PingChart.tsx`)
3. **Refetch Interval**: Adjust dashboard refetch interval in `MonitoringDashboard.tsx` (default 30s)
4. **Cleanup Schedule**: Automatic cleanup runs hourly; adjust in `heartbeatScheduler.ts`

---

## Security Checklist

✅ All procedures use `protectedProcedure` (authentication required)  
✅ System ownership verified on all operations (userId check)  
✅ URL validation prevents malformed inputs  
✅ Max 20 systems limit prevents resource exhaustion  
✅ Automatic cleanup prevents unbounded database growth  
✅ No hardcoded secrets or credentials  

---

## Support & Next Steps

1. **Test locally** before deploying to production
2. **Monitor logs** for heartbeat scheduler errors
3. **Adjust intervals** based on your monitoring needs
4. **Customize styling** to match your platform's design
5. **Add authentication checks** if needed beyond standard `protectedProcedure`

For detailed architecture information, see `MODULE_README.md`.
