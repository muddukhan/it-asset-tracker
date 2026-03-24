# Brandscapes Assets - Software Inventory

## Current State
The app has Hardware Inventory, Assignments, History, Reports, and Admin pages. The backend handles IT hardware assets (laptops, servers, etc.) with CRUD, assignment history, and user roles.

## Requested Changes (Diff)

### Add
- New "Software" nav item in sidebar and top nav
- New `SoftwareInventoryPage` with a table showing: Software Name, Vendor Name, Date of Purchase, License Expiry, License Key (optional), License Type (optional), Notes
- Add/Edit modal for software items with all fields
- Delete with confirmation dialog
- Search by name or vendor
- Backend: SoftwareItem type and full CRUD (addSoftware, updateSoftware, deleteSoftware, getAllSoftware, getSoftware)
- License expiry badge (valid / expiring soon / expired) similar to warranty badge

### Modify
- App.tsx: add "software" to NavPage type, navItems array, renderPage switch
- Backend main.mo: add SoftwareItem, SoftwareInput types and CRUD functions

### Remove
- Nothing

## Implementation Plan
1. Update backend main.mo with software types and CRUD
2. Create SoftwareInventoryPage.tsx with table, add/edit modal, delete confirm
3. Update App.tsx to include Software nav item and route
