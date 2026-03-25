# Brandscapes Assets

## Current State
Local user creation fails with "failed to add user" error. The root cause is `AccessControl.getUserRole` traps with "User is not registered" for any principal not in the roles map, including Internet Identity principals that successfully ran `bootstrapAdmin`. This trap propagates up as a generic frontend error.

## Requested Changes (Diff)

### Add
- Nothing new

### Modify
- `access-control.mo`: `getUserRole` now returns `#guest` instead of trapping for unregistered principals. All downstream functions (`hasPermission`, `isAdmin`) behave correctly with this default.

### Remove
- The `Runtime.trap("User is not registered")` call in `getUserRole` for non-anonymous unregistered users

## Implementation Plan
1. Fix `getUserRole` in `access-control.mo` to return `#guest` for unregistered users instead of trapping
2. Deploy
