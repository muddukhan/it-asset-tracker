const ASSETS_KEY = "brandscapes_assets";
const SOFTWARE_KEY = "brandscapes_software";
const ASSET_ID_KEY = "brandscapes_next_asset_id";
const SOFTWARE_ID_KEY = "brandscapes_next_software_id";
const SEEDED_KEY = "brandscapes_seeded";

export type LocalAsset = {
  id: number;
  name: string;
  serialNumber: string;
  category: string;
  status: string;
  location: string;
  assignedUser?: string;
  employeeCode?: string;
  purchaseDate?: string;
  warrantyDate?: string;
  notes?: string;
  processorType?: string;
  ram?: string;
  storage?: string;
  assetTag?: string;
  vendorName?: string;
  invoiceNumber?: string;
  photoDataUrl?: string;
  retired?: boolean;
  createdAt: number;
};

export type LocalAssetInput = Omit<LocalAsset, "id" | "createdAt">;

export type LocalSoftware = {
  id: number;
  name: string;
  vendor: string;
  purchaseDate?: string;
  licenseExpiry?: string;
  licenseKey?: string;
  licenseType?: string;
  notes?: string;
  assignedTo?: string;
  assetTag?: string;
  invoiceNumber?: string;
  invoiceFile?: string;
  invoiceFileName?: string;
  createdAt: number;
};

export type LocalSoftwareInput = Omit<LocalSoftware, "id" | "createdAt">;

function readAssets(): LocalAsset[] {
  try {
    return JSON.parse(localStorage.getItem(ASSETS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeAssets(assets: LocalAsset[]): void {
  localStorage.setItem(ASSETS_KEY, JSON.stringify(assets));
}

function readSoftware(): LocalSoftware[] {
  try {
    return JSON.parse(localStorage.getItem(SOFTWARE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeSoftware(sw: LocalSoftware[]): void {
  localStorage.setItem(SOFTWARE_KEY, JSON.stringify(sw));
}

function nextAssetId(): number {
  const n = Number(localStorage.getItem(ASSET_ID_KEY) ?? "1");
  localStorage.setItem(ASSET_ID_KEY, String(n + 1));
  return n;
}

function nextSoftwareId(): number {
  const n = Number(localStorage.getItem(SOFTWARE_ID_KEY) ?? "1");
  localStorage.setItem(SOFTWARE_ID_KEY, String(n + 1));
  return n;
}

function seed(): void {
  if (localStorage.getItem(SEEDED_KEY)) return;
  const now = Date.now();
  const assets: LocalAsset[] = [
    {
      id: nextAssetId(),
      name: "Dell XPS 15 Laptop",
      serialNumber: "DXP-2024-001",
      category: "Laptop",
      status: "Assigned",
      location: "Mumbai Office",
      assignedUser: "Rahul Sharma",
      employeeCode: "EMP001",
      purchaseDate: "2023-06-15",
      warrantyDate: "2026-06-15",
      assetTag: "HW-001",
      vendorName: "Dell Technologies",
      processorType: "Intel Core i7-13700H",
      ram: "32GB DDR5",
      storage: "1TB NVMe SSD",
      notes: "Primary development machine",
      createdAt: now,
    },
    {
      id: nextAssetId(),
      name: "HP ProDesk 400 Desktop",
      serialNumber: "HPD-2023-044",
      category: "Desktop",
      status: "Available",
      location: "Delhi Office",
      purchaseDate: "2023-01-10",
      warrantyDate: "2026-01-10",
      assetTag: "HW-002",
      vendorName: "HP India",
      processorType: "Intel Core i5-12500",
      ram: "16GB DDR4",
      storage: "512GB SSD",
      createdAt: now - 1000,
    },
    {
      id: nextAssetId(),
      name: "Cisco IP Phone 8841",
      serialNumber: "CSC-IP-2022-007",
      category: "Phone",
      status: "Assigned",
      location: "Reception",
      assignedUser: "Front Desk",
      employeeCode: "EMP002",
      purchaseDate: "2022-03-20",
      warrantyDate: "2025-03-20",
      assetTag: "HW-003",
      vendorName: "Cisco Systems",
      notes: "Reception phone — do not relocate",
      createdAt: now - 2000,
    },
  ];
  writeAssets(assets);

  const software: LocalSoftware[] = [
    {
      id: nextSoftwareId(),
      name: "Microsoft Office 365",
      vendor: "Microsoft",
      purchaseDate: "2024-01-01",
      licenseExpiry: "2025-01-01",
      licenseType: "Annual Subscription",
      licenseKey: "XXXXX-OFFICE365-ANNUAL",
      assignedTo: "Rahul Sharma",
      assetTag: "SW-001",
      invoiceNumber: "INV-2024-0010",
      notes: "Covers 5 seats",
      createdAt: now,
    },
    {
      id: nextSoftwareId(),
      name: "Adobe Creative Cloud",
      vendor: "Adobe Systems",
      purchaseDate: "2024-03-15",
      licenseExpiry: "2026-03-15",
      licenseType: "Annual Subscription",
      licenseKey: "XXXXX-ADOBE-CC-2024",
      assignedTo: "Design Team",
      assetTag: "SW-002",
      invoiceNumber: "INV-2024-0022",
      notes: "All apps plan — 3 seats",
      createdAt: now - 1000,
    },
  ];
  writeSoftware(software);
  localStorage.setItem(SEEDED_KEY, "1");
}

// Run seed on module load
seed();

export const localDB = {
  getAllAssets(): LocalAsset[] {
    return readAssets();
  },

  getAssetById(id: number): LocalAsset | null {
    return readAssets().find((a) => a.id === id) ?? null;
  },

  addAsset(input: LocalAssetInput): LocalAsset {
    const assets = readAssets();
    const asset: LocalAsset = {
      ...input,
      id: nextAssetId(),
      createdAt: Date.now(),
    };
    assets.push(asset);
    writeAssets(assets);
    return asset;
  },

  updateAsset(id: number, input: LocalAssetInput): LocalAsset | null {
    const assets = readAssets();
    const idx = assets.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    const updated: LocalAsset = {
      ...assets[idx],
      ...input,
      id,
      createdAt: assets[idx].createdAt,
    };
    assets[idx] = updated;
    writeAssets(assets);
    return updated;
  },

  deleteAsset(id: number): boolean {
    const assets = readAssets();
    const filtered = assets.filter((a) => a.id !== id);
    if (filtered.length === assets.length) return false;
    writeAssets(filtered);
    return true;
  },

  getAllSoftware(): LocalSoftware[] {
    return readSoftware();
  },

  addSoftware(input: LocalSoftwareInput): LocalSoftware {
    const all = readSoftware();
    const sw: LocalSoftware = {
      ...input,
      id: nextSoftwareId(),
      createdAt: Date.now(),
    };
    all.push(sw);
    writeSoftware(all);
    return sw;
  },

  updateSoftware(id: number, input: LocalSoftwareInput): LocalSoftware | null {
    const all = readSoftware();
    const idx = all.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    const updated: LocalSoftware = {
      ...all[idx],
      ...input,
      id,
      createdAt: all[idx].createdAt,
    };
    all[idx] = updated;
    writeSoftware(all);
    return updated;
  },

  deleteSoftware(id: number): boolean {
    const all = readSoftware();
    const filtered = all.filter((s) => s.id !== id);
    if (filtered.length === all.length) return false;
    writeSoftware(filtered);
    return true;
  },

  getStats(): {
    total: number;
    assigned: number;
    available: number;
    inRepair: number;
  } {
    const assets = readAssets();
    return {
      total: assets.length,
      assigned: assets.filter((a) => a.status === "Assigned").length,
      available: assets.filter((a) => a.status === "Available").length,
      inRepair: assets.filter(
        (a) => a.status === "InRepair" || a.status === "In Repair",
      ).length,
    };
  },
};

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
