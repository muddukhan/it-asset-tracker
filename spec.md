# Brandscapes Assets

## Current State
Full IT asset tracker with hardware/software inventory, admin role management, local user authentication, dashboard analytics, and CSV export. The backend had no stable variables — all state (admin assignments, local users, assets) was wiped on every deployment.

## Requested Changes (Diff)

### Add
- Stable variables for all persistent data: admin role assignment, local users, assets, software, history, counters
- Proper `preupgrade()` hook to serialize all state before upgrade
- Proper `postupgrade()` hook to restore state after upgrade (with sample data seeding only on first-ever run)

### Modify
- `getUserRole` in access-control.mo: return `#guest` for unregistered principals instead of trapping with `Runtime.trap`. This prevents crashes when checking admin status for new users.
- `bootstrapAdmin` now works reliably since `isCallerAdmin` no longer traps for unregistered users.

### Remove
- Empty `preupgrade()` stub
- Simple `postupgrade()` that only checked if initialized

## Implementation Plan
1. Update `access-control.mo`: change `getUserRole` null case to return `#guest` instead of `Runtime.trap`
2. Add 20 stable variables in `main.mo` covering all persistent data
3. Implement full `preupgrade()` that saves all map entries to stable arrays
4. Implement full `postupgrade()` that restores all data and only seeds samples on first run
