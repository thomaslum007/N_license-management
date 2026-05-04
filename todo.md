# System Status Monitor - TODO

## Database & Schema
- [x] Create `monitored_systems` table (id, title, url, status, lastCheckedAt, createdAt, updatedAt)
- [x] Create `ping_history` table (id, systemId, responseTime, status, timestamp)
- [x] Generate and apply database migrations

## Backend Core Engine
- [x] Build ping/heartbeat utility function (HTTP HEAD/GET request with timeout)
- [x] Build database query helpers for systems and ping history
- [x] Implement periodic heartbeat scheduler (configurable interval)
- [x] Add system CRUD procedures (create, read, update, delete)
- [x] Add ping history retrieval procedure (last 12 hours)
- [x] Add pre-seeding logic for Google example entry
- [x] Improved heartbeat with GET fallback when HEAD fails
- [ ] Write vitest tests for heartbeat engine and procedures

## Backend API Routes
- [x] Create tRPC procedure: `systems.list` (get all monitored systems)
- [x] Create tRPC procedure: `systems.create` (add new system, max 20 limit)
- [x] Create tRPC procedure: `systems.delete` (remove system)
- [x] Create tRPC procedure: `systems.getHistory` (12-hour ping history)
- [x] Create tRPC procedure: `systems.manualPing` (trigger immediate check)

## Frontend Cyberpunk UI
- [x] Design cyberpunk color palette and typography (neon pink, cyan, black)
- [x] Create global cyberpunk CSS theme in index.css (glow effects, HUD elements)
- [x] Build StatusBadge component (green/red with glow, last-checked timestamp)
- [x] Build StatusBadge with neutral styling for unknown status
- [x] Build SystemCard component (title, URL, status badge, last response time)
- [x] Build AddSystemForm component (title input, URL input, validation)
- [x] Build SystemsList component (grid/list of systems, max 20 display)
- [x] Build PingChart component (Recharts 12-hour history visualization)

## Frontend Dashboard
- [x] Create MonitoringDashboard page with cyberpunk layout
- [x] Integrate systems list with real-time status updates
- [x] Integrate add/remove system forms
- [x] Integrate ping history charts per system
- [x] Add loading states and error handling
- [x] Add empty state messaging
- [x] Show AddSystemForm in empty state for first system

## Integration & Polish
- [x] Verify modular code structure (no hardcoded paths, reusable components)
- [x] TypeScript compilation clean
- [ ] Test heartbeat scheduler with multiple systems
- [ ] Test 12-hour chart data aggregation and display
- [ ] Verify max 20 systems limit enforcement
- [ ] Performance optimization (query indexes, chart rendering)
- [ ] Cross-browser testing (Chrome, Firefox, Safari)

## GitHub & Delivery
- [x] Create checkpoint before GitHub commit
- [ ] Push code to GitHub repository
- [ ] Create comprehensive README with integration guide
- [ ] Document API procedures and database schema
- [ ] Provide example usage for platform integration
