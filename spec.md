# IT Asset Tracker

## Current State
A full-stack IT Asset Tracker on ICP. Pages: Dashboard, Inventory, Assignments, History, Reports, Admin. The Inventory page has a "Back to Dashboard" button (only when navigated from Dashboard). Asset form (AssetModal) has fields: name, serial number, category, status, location, assignedUser, purchaseDate, warrantyDate, notes, photo. Backend Asset type mirrors these fields.

## Requested Changes (Diff)

### Add
- "Back to Dashboard" button on History, Reports, and Admin pages (in addition to existing one on Inventory)
- `employeeCode` field (optional text) to the Add/Edit Asset form
- `employeeCode` displayed as a column in the Inventory table
- `employeeCode` stored on the backend Asset type

### Modify
- `App.tsx`: pass `onBack` prop to History, Reports, Admin pages (already passed to Inventory)
- `HistoryPage`, `ReportsPage`, `AdminPage`: accept optional `onBack` prop and render a back button
- `AssetModal`: add Employee Code input field
- `InventoryPage`: add Employee Code column in the table and display in asset detail
- `backend/main.mo`: add `employeeCode: ?Text` to Asset, AssetInput, StoreAsset types and propagate through all CRUD functions

### Remove
- Nothing

## Implementation Plan
1. Update `main.mo` to add `employeeCode` field to all relevant types and logic
2. Update `AssetModal.tsx` to add Employee Code field in the form
3. Update `InventoryPage.tsx` to show Employee Code column
4. Update `HistoryPage.tsx`, `ReportsPage.tsx`, `AdminPage.tsx` to accept `onBack` prop and show back button
5. Update `App.tsx` to pass `onBack` to all pages
6. Validate and deploy
