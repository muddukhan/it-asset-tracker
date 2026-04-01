# Brandscapes Assets - Import Data Feature

## Current State
- Hardware Inventory (InventoryPage.tsx) has an "Add Asset" button to add single assets
- Software Inventory (SoftwareInventoryPage.tsx) has an "Add Software" button to add single software entries
- No bulk import capability exists in either inventory

## Requested Changes (Diff)

### Add
- "Import Data" button next to the existing Add Asset/Add Software button in both inventory pages
- CSV template download option so users know the expected format
- File upload dialog (accepts .csv and .xlsx/.xls files) that parses the file and bulk-inserts records
- Import preview/summary showing how many rows were found and any errors before confirming
- Hardware CSV columns: assetTag, employeeCode, employeeName (mapped to assignedUser), assetName (name), category, status, location, serialNumber, processorType, ram, storage, warrantyDate, purchaseDate, vendorName, invoiceNumber, notes
- Software CSV columns: assetTag, assignedTo, softwareName (name), vendor, purchaseDate, licenseExpiry, licenseType, licenseKey, employeeCode, employeeName, invoiceNumber, notes
- Calls addAssetWithCreds / addSoftwareWithCreds for local admin users, or addAsset / addSoftware for II users

### Modify
- InventoryPage.tsx: add Import Data button in the header toolbar (next to Add Asset)
- SoftwareInventoryPage.tsx: add Import Data button in the header toolbar (next to Add Software)

### Remove
- Nothing removed

## Implementation Plan
1. Create a reusable CSV parser utility in src/frontend/src/lib/csvImport.ts that parses CSV text into row objects
2. Create HardwareImportDialog.tsx component with: file input, CSV download template, parse preview, bulk submit using addAssetWithCreds/addAsset
3. Create SoftwareImportDialog.tsx component with: file input, CSV download template, parse preview, bulk submit using addSoftwareWithCreds/addSoftware
4. Wire Import Data button in InventoryPage.tsx header
5. Wire Import Data button in SoftwareInventoryPage.tsx header
