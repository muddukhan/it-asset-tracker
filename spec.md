# Brandscapes Assets - Local User Auth

## Current State
- Local users stored with fields: name, employeeCode, department, email, notes — no username, password, or accessLevel
- The entire app is gated behind Internet Identity; no local login flow exists
- AdminPage has Add/Edit/Delete for local users but no credentials or role assignment
- LoginPage has only the Internet Identity "Sign In" button
- App.tsx only checks `identity` from useInternetIdentity; no local session concept

## Requested Changes (Diff)

### Add
- `username`, `password` (plain text stored in backend), and `accessLevel` ("admin" | "readwrite" | "readonly") fields to local user records
- `loginLocalUser(username, password)` backend function (public, no auth required) that returns the matching user's accessLevel or null if credentials are wrong
- `setLocalUserPassword(id, password)` backend function (admin only) to update password
- Local login tab/toggle on LoginPage with username + password fields
- `localUserSession` state in App.tsx stored in localStorage (fields: username, accessLevel) — used when Internet Identity is not active
- Local user sessions grant access based on accessLevel: admin = full CRUD, readwrite = add/edit, readonly = view only

### Modify
- `LocalUser`, `LocalUserInput`, `StoreLocalUser` in backend to include `username`, `password`, `accessLevel`
- `AddLocalUserForm` in AdminPage to include username (required), password (required), and access level dropdown (Admin / Read+Write / Read Only)
- `LocalUserRow` edit form to include these same fields
- `App.tsx` auth gate to also accept a valid `localUserSession` in localStorage as a logged-in state
- `LoginPage.tsx` to show a toggle between "Internet Identity" and "Local User Login"

### Remove
- Nothing removed

## Implementation Plan
1. Regenerate Motoko backend with new LocalUser fields and loginLocalUser function
2. Update backend.d.ts types to match
3. Update AdminPage.tsx AddLocalUserForm and LocalUserRow to include username, password, accessLevel
4. Update LoginPage.tsx with local login tab
5. Update App.tsx to support localUserSession from localStorage alongside Internet Identity
