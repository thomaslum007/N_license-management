# System Status Monitor - Modular Integration Guide

A production-ready, self-contained system uptime monitoring module with cyberpunk aesthetics. Designed to be merged cleanly into existing platforms without conflicts.

## Features

- **Real-time Monitoring**: Monitor up to 20 systems with automatic heartbeat checks every 60 seconds
- **Dual Protocol Ping**: HTTP HEAD with automatic GET fallback for maximum compatibility
- **Status Tracking**: Online/down status with last-checked timestamps and response times
- **12-Hour History**: Full ping history with Recharts visualization
- **Cyberpunk UI**: Deep black backgrounds with neon pink and cyan accents, HUD-style elements
- **Modular Architecture**: Self-contained code structure designed for platform integration
- **Database Persistence**: Full system configurations and ping history stored in database
- **Pre-loaded Example**: Google (www.google.com) comes pre-configured for immediate testing

## Architecture Overview

### Database Schema

**monitored_systems** table:
- `id`: Primary key (auto-increment)
- `userId`: Foreign key to users table
- `title`: System name (max 255 chars)
- `url`: System URL (max 2048 chars)
- `status`: Enum (online, down, unknown)
- `lastCheckedAt`: Last ping timestamp
- `lastResponseTime`: Response time in milliseconds
- `createdAt`, `updatedAt`: Timestamps

**ping_history** table:
- `id`: Primary key (auto-increment)
- `systemId`: Foreign key to monitored_systems
- `responseTime`: Response time in milliseconds
- `status`: Enum (online, down)
- `timestamp`: Ping timestamp (indexed for 12-hour queries)

### Backend Architecture

```
server/
├── heartbeat.ts          # Ping engine (HEAD + GET fallback, retry logic)
├── heartbeatScheduler.ts # Periodic heartbeat runner (60s interval)
├── init.ts               # App initialization (seeding, scheduler startup)
├── db.ts                 # Database query helpers
└── routers.ts            # tRPC procedures (systems.*, auth.*)
```

### Frontend Architecture

```
client/src/
├── pages/
│   ├── MonitoringDashboard.tsx  # Main dashboard page
│   └── Home.tsx                  # Landing page with feature overview
├── components/
│   ├── StatusBadge.tsx          # Status indicator with timestamp
│   ├── SystemCard.tsx           # System details card
│   ├── AddSystemForm.tsx        # Add/edit system form
│   └── PingChart.tsx            # 12-hour ping history chart (Recharts)
└── index.css                     # Cyberpunk theme (neon pink/cyan, glow effects)
```

## API Procedures (tRPC)

### systems.list
```typescript
trpc.systems.list.useQuery()
// Returns: MonitoredSystem[]
```

### systems.create
```typescript
trpc.systems.create.useMutation()
// Input: { title: string, url: string }
// Returns: MonitoredSystem
// Validates: URL format, max 20 systems limit
```

### systems.delete
```typescript
trpc.systems.delete.useMutation()
// Input: { systemId: number }
// Returns: { success: boolean }
// Validates: System ownership
```

### systems.getHistory
```typescript
trpc.systems.getHistory.useQuery({ systemId: number })
// Returns: PingRecord[] (last 12 hours)
// Validates: System ownership
```

### systems.manualPing
```typescript
trpc.systems.manualPing.useMutation()
// Input: { systemId: number }
// Returns: { status: "online" | "down", responseTime: number, error?: string }
// Validates: System ownership
```

## Integration Steps

### 1. Copy Module Files

```bash
# Copy backend files
cp -r system-status-monitor/server/heartbeat.ts <your-project>/server/
cp -r system-status-monitor/server/heartbeatScheduler.ts <your-project>/server/
cp -r system-status-monitor/server/init.ts <your-project>/server/

# Copy frontend components
cp -r system-status-monitor/client/src/components/StatusBadge.tsx <your-project>/client/src/components/
cp -r system-status-monitor/client/src/components/SystemCard.tsx <your-project>/client/src/components/
cp -r system-status-monitor/client/src/components/AddSystemForm.tsx <your-project>/client/src/components/
cp -r system-status-monitor/client/src/components/PingChart.tsx <your-project>/client/src/components/

# Copy pages
cp -r system-status-monitor/client/src/pages/MonitoringDashboard.tsx <your-project>/client/src/pages/
```

### 2. Update Database Schema

Add the following tables to your `drizzle/schema.ts`:

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

export const pingHistory = mysqlTable("ping_history", {
  id: int("id").autoincrement().primaryKey(),
  systemId: int("systemId").notNull().references(() => monitoredSystems.id, { onDelete: "cascade" }),
  responseTime: int("responseTime").notNull(),
  status: mysqlEnum("status", ["online", "down"]).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});
```

### 3. Add Database Helpers

Copy all query helper functions from `system-status-monitor/server/db.ts` to your `server/db.ts`.

### 4. Add tRPC Procedures

Copy the `systems` router from `system-status-monitor/server/routers.ts` to your `server/routers.ts`:

```typescript
systems: router({
  list: protectedProcedure.query(async ({ ctx }) => { ... }),
  create: protectedProcedure.input(...).mutation(async ({ ctx, input }) => { ... }),
  delete: protectedProcedure.input(...).mutation(async ({ ctx, input }) => { ... }),
  getHistory: protectedProcedure.input(...).query(async ({ ctx, input }) => { ... }),
  manualPing: protectedProcedure.input(...).mutation(async ({ ctx, input }) => { ... }),
}),
```

### 5. Initialize App

Update your `server/_core/index.ts` to call initialization:

```typescript
import { initializeApp, shutdownApp } from "../init";

async function startServer() {
  // Initialize app (database, heartbeat scheduler, etc.)
  await initializeApp();

  // Graceful shutdown handlers
  process.on("SIGTERM", async () => {
    await shutdownApp();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    await shutdownApp();
    process.exit(0);
  });

  // ... rest of server setup
}
```

### 6. Update Frontend Routes

Add the monitoring dashboard route to your `client/src/App.tsx`:

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

### 7. Apply Cyberpunk Theme (Optional)

Merge the cyberpunk CSS from `system-status-monitor/client/src/index.css` into your global styles. Key additions:

- Neon pink (`oklch(0.7 0.25 280)`) and cyan (`oklch(0.65 0.25 180)`) color variables
- Glow animations (`neon-glow`, `box-glow`)
- HUD corner bracket styles
- Deep black background (`oklch(0.05 0 0)`)

### 8. Run Migrations

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

## Configuration

### Heartbeat Interval

Edit `server/heartbeatScheduler.ts` to change the ping interval:

```typescript
const DEFAULT_INTERVAL = 60000; // 60 seconds (default)
```

### Ping Timeout

Edit `server/heartbeat.ts` to change the timeout:

```typescript
const DEFAULT_TIMEOUT = 10000; // 10 seconds (default)
```

### Max Systems Limit

Edit `server/routers.ts` in the `systems.create` procedure:

```typescript
if (existingSystems.length >= 20) { // Change 20 to your limit
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Maximum 20 monitored systems allowed",
  });
}
```

## Pre-loaded Example

The module automatically seeds a Google example system (www.google.com) for the owner user on first initialization. This provides immediate testing capability.

To customize or disable:
- Edit `server/init.ts` and modify the `GOOGLE_EXAMPLE` constant
- Or remove the seeding logic entirely if not needed

## Performance Considerations

1. **Ping History Cleanup**: Old ping records (>24 hours) are automatically cleaned up every hour
2. **Query Optimization**: Add indexes to `ping_history.timestamp` and `monitored_systems.userId` for faster queries
3. **Chart Sampling**: The 12-hour chart automatically samples data points if >60 records exist
4. **Refetch Interval**: Dashboard refetches system list every 30 seconds (configurable in `MonitoringDashboard.tsx`)

## Security Notes

- All procedures use `protectedProcedure` - authentication required
- System ownership is verified on all operations (userId check)
- URL validation prevents malformed inputs
- Max 20 systems limit prevents resource exhaustion
- Automatic cleanup prevents unbounded database growth

## Troubleshooting

### Systems not pinging
- Check server logs for heartbeat scheduler errors
- Verify database connectivity
- Ensure URLs are valid and reachable

### Chart not showing data
- Wait 60+ seconds for first heartbeat cycle
- Check browser console for fetch errors
- Verify ping history table has records

### Empty state not showing form
- Ensure `AddSystemForm` component is rendered in empty state
- Check that `systems.length === 0` condition is true

## License & Attribution

This module is designed as a self-contained, reusable component for platform integration. It follows modular best practices to minimize conflicts with existing codebases.

## Support

For integration issues, refer to the API procedures documentation above or check the component prop interfaces in the source files.
