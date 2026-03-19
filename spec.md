# IT Asset Tracker

## Current State
The app has an Admin panel with a "Make Me Admin" button, but it fails for non-admins because `assignCallerUserRole` in MixinAuthorization requires the caller to already be an admin. There is no bootstrap mechanism. User management only shows assets-by-assignee, with no ability to list registered users or see their current roles.

## Requested Changes (Diff)

### Add
- `bootstrapAdmin()` backend function: allows any caller to become admin, but ONLY if no admins currently exist (one-time bootstrap)
- `getAllUsersWithRoles()` backend function: admin-only, returns list of all users and their current roles
- User management section in Admin page: shows a table of all registered users with their principal IDs, display names, and current roles
- Role assignment UI enhancements: clearly label access levels (Full Access = Admin, Standard Access = User, View Only = Guest)

### Modify
- "Make Me Admin" button: call `bootstrapAdmin` instead of `assignCallerUserRole` so it actually works for unauthenticated first-time users
- Admin panel layout: add a dedicated Users tab or section with the user list table

### Remove
- Nothing removed

## Implementation Plan
1. Add `bootstrapAdmin()` public function in backend: checks if admin set is empty, then assigns caller as admin
2. Add `getAllUsersWithRoles()` query in backend: returns array of {principal, role} for all known users
3. Update `backend.d.ts` bindings after regeneration
4. In `useQueries.ts`, add `useBootstrapAdmin` mutation and `useGetAllUsersWithRoles` query
5. Update `AdminPage.tsx`: wire "Make Me Admin" to `bootstrapAdmin`, add Users section with table showing principal, role badge, and change-role dropdown
6. Display roles with clear labels: Admin (Full Access), User (Standard Access), Guest (View Only)
