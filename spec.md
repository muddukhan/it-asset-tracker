# Brandscapes Assets

## Current State
IT asset tracker. Asset fields: name, serialNumber, category, status, location, assignedUser, employeeCode, purchaseDate, warrantyDate, notes, photoId. Dashboard: KPI cards (Total, Assigned, In Repair, Available), quick filters, warranty alerts, category breakdown. Retired status in enum but no dashboard card.

## Requested Changes (Diff)

### Add
- processorType, ram, storage optional string fields to Asset/AssetInput
- Processor Type, RAM, Storage inputs in AssetModal
- Retired stat card on Dashboard
- Config details shown in Dashboard

### Modify
- AssetModal: add hardware config fields
- AssetDetailModal: show config fields in details
- DashboardPage: Retired stat card + config info in asset rows

### Remove
- Nothing

## Implementation Plan
1. Regenerate backend with new fields
2. Update AssetModal, AssetDetailModal, DashboardPage
