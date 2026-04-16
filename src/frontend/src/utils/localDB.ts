/**
 * localDB.ts — Migration utility + UI-state helpers only.
 *
 * After migration, this file does NOT store assets/software/users/history.
 * It only manages:
 *   - UI state: theme, density, dashboard panel settings
 *   - One-time migration: read localStorage records and push them to the backend
 *
 * Data keys that are cleared after successful migration:
 *   brandscapes_assets, brandscapes_software, brandscapes_local_users,
 *   brandscapes_history, brandscapes_next_asset_id, brandscapes_next_software_id,
 *   brandscapes_next_user_id, brandscapes_users_json_registry
 *
 * Keys that are NEVER cleared:
 *   localUserSession, brandscapes_theme, brandscapes_density,
 *   brandscapes_dashboard_panels (UI state only)
 */

import type { Backend } from "../backend";

// ── Legacy key constants (read-only during migration) ─────────────────────────
const ASSETS_KEY = "brandscapes_assets";
const SOFTWARE_KEY = "brandscapes_software";
const HISTORY_KEY = "brandscapes_history";
const USERS_KEY = "brandscapes_local_users";
const JSON_REGISTRY_KEY = "brandscapes_users_json_registry";
const ASSET_ID_KEY = "brandscapes_next_asset_id";
const SOFTWARE_ID_KEY = "brandscapes_next_software_id";
const USERS_ID_KEY = "brandscapes_next_user_id";
const HISTORY_ID_KEY = "brandscapes_next_history_id";
const SEEDED_KEY = "brandscapes_seeded";

// ── Minimal legacy type shapes (used only for reading during migration) ────────

type LegacyAsset = {
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
  retired?: boolean;
  createdAt: number;
};

type LegacySoftware = {
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
  createdAt: number;
};

type LegacyHistoryEntry = {
  id: number;
  assetId: number;
  assetName: string;
  serialNumber?: string;
  changedBy: string;
  fromAssignee?: string;
  toAssignee?: string;
  fromStatus: string;
  toStatus: string;
  timestamp: number;
};

type LegacyUser = {
  id: number;
  name: string;
  username: string;
  password: string;
  accessLevel: string;
  employeeCode: string;
  department: string;
  email: string;
  notes?: string;
  createdAt: number;
};

// ── LocalAsset type (re-exported for consumer compatibility) ──────────────────
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
  windowsVersion?: string;
  assetTag?: string;
  vendorName?: string;
  invoiceNumber?: string;
  invoiceFile?: string;
  invoiceFileName?: string;
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

export type LocalHistoryEntry = {
  id: number;
  assetId: number;
  assetName: string;
  serialNumber?: string;
  changedBy: string;
  fromAssignee?: string;
  toAssignee?: string;
  fromStatus: string;
  toStatus: string;
  timestamp: number;
};

export type LocalDBUser = {
  id: number;
  name: string;
  username: string;
  password: string;
  accessLevel: string;
  employeeCode: string;
  department: string;
  email: string;
  notes?: string;
  createdAt: number;
};

export type LocalDBUserInput = Omit<LocalDBUser, "id" | "createdAt">;

// ── Private legacy readers (used only during migration) ───────────────────────

function readLegacyAssets(): LegacyAsset[] {
  try {
    return JSON.parse(localStorage.getItem(ASSETS_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function readLegacySoftware(): LegacySoftware[] {
  try {
    return JSON.parse(localStorage.getItem(SOFTWARE_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function readLegacyHistory(): LegacyHistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function readLegacyUsers(): LegacyUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function readJsonRegistryUsers(): LegacyUser[] {
  try {
    const stored = localStorage.getItem(JSON_REGISTRY_KEY);
    if (!stored) return [];
    const registry = JSON.parse(stored) as Array<{
      userId: string;
      password: string;
      name: string;
      accessLevel: string;
    }>;
    return registry.map((u, i) => ({
      id: i + 1000,
      name: u.name,
      username: u.userId,
      password: u.password,
      accessLevel: u.accessLevel,
      employeeCode: "",
      department: "",
      email: "",
      createdAt: Date.now(),
    }));
  } catch {
    return [];
  }
}

// ── Status/category mapping to backend enums ──────────────────────────────────

function mapStatus(s: string): string {
  const lc = s.toLowerCase().replace(/\s/g, "");
  if (lc === "assigned") return "assigned";
  if (lc === "available") return "available";
  if (lc === "inrepair" || lc === "repair") return "inRepair";
  if (lc === "retired") return "retired";
  if (lc === "instorage" || lc === "storage") return "inStorage";
  return "available";
}

function mapCategory(c: string): string {
  const lc = c.toLowerCase();
  if (lc === "laptop") return "laptop";
  if (lc === "desktop") return "desktop";
  if (lc === "server") return "server";
  if (lc === "printer") return "printer";
  if (lc === "monitor") return "monitor";
  if (lc.includes("periph") || lc === "phone") return "peripheral";
  return "other";
}

// ── Migration ─────────────────────────────────────────────────────────────────

const MIGRATION_KEYS_TO_CLEAR = [
  ASSETS_KEY,
  SOFTWARE_KEY,
  USERS_KEY,
  HISTORY_KEY,
  ASSET_ID_KEY,
  SOFTWARE_ID_KEY,
  USERS_ID_KEY,
  HISTORY_ID_KEY,
  JSON_REGISTRY_KEY,
  SEEDED_KEY,
  "asset_windows_versions",
];

export async function runMigrationIfNeeded(actor: Backend): Promise<void> {
  try {
    const alreadyMigrated = await actor.hasMigratedFromLocalStorage();
    if (alreadyMigrated) {
      // Clean up legacy keys if they somehow still exist
      for (const key of MIGRATION_KEYS_TO_CLEAR) {
        localStorage.removeItem(key);
      }
      return;
    }

    // Merge users from both legacy stores
    const legacyUsers = readLegacyUsers();
    const jsonUsers = readJsonRegistryUsers();
    const allUsernames = new Set(legacyUsers.map((u) => u.username));
    const mergedUsers: LegacyUser[] = [
      ...legacyUsers,
      ...jsonUsers.filter((u) => !allUsernames.has(u.username)),
    ];

    const legacyAssets = readLegacyAssets();
    const legacySoftware = readLegacySoftware();
    const legacyHistory = readLegacyHistory();

    // Batch push users
    if (mergedUsers.length > 0) {
      await actor.batchAddUsers(
        mergedUsers.map((u) => ({
          username: u.username,
          password: u.password,
          name: u.name,
          accessLevel: u.accessLevel,
          employeeCode: u.employeeCode || "",
          department: u.department || "",
          email: u.email || "",
          notes: u.notes,
        })),
      );
    }

    // Batch push assets
    if (legacyAssets.length > 0) {
      await actor.batchAddAssets(
        legacyAssets.map((a) => ({
          name: a.name,
          serialNumber: a.serialNumber,
          category: mapCategory(a.category) as Parameters<
            Backend["batchAddAssets"]
          >[0][0]["category"],
          status: mapStatus(a.status) as Parameters<
            Backend["batchAddAssets"]
          >[0][0]["status"],
          location: a.location || "Unknown",
          assignedUser: a.assignedUser,
          employeeCode: a.employeeCode,
          purchaseDate: a.purchaseDate,
          warrantyDate: a.warrantyDate,
          notes: a.notes,
          processorType: a.processorType,
          ram: a.ram,
          storage: a.storage,
          assetTag: a.assetTag,
          vendorName: a.vendorName,
          invoiceNumber: a.invoiceNumber,
        })),
      );
    }

    // Batch push software
    if (legacySoftware.length > 0) {
      await actor.batchAddSoftware(
        legacySoftware.map((s) => ({
          name: s.name,
          vendor: s.vendor,
          purchaseDate: s.purchaseDate,
          licenseExpiry: s.licenseExpiry,
          licenseKey: s.licenseKey,
          licenseType: s.licenseType,
          notes: s.notes,
          assignedTo: s.assignedTo,
          assetTag: s.assetTag,
          invoiceNumber: s.invoiceNumber,
        })),
      );
    }

    // Batch push history
    if (legacyHistory.length > 0) {
      await actor.batchAddHistory(
        legacyHistory.map((h) => ({
          assetId: BigInt(h.assetId),
          assetName: h.assetName,
          assetType: "hardware",
          action: h.toStatus || "updated",
          changedBy: h.changedBy || "local-admin",
          previousAssignee: h.fromAssignee,
          newAssignee: h.toAssignee,
          notes: `Status: ${h.fromStatus} → ${h.toStatus}`,
          timestamp: BigInt(h.timestamp),
        })),
      );
    }

    await actor.markMigrationComplete();

    // Clear all legacy keys
    for (const key of MIGRATION_KEYS_TO_CLEAR) {
      localStorage.removeItem(key);
    }
  } catch (err) {
    // Migration failed — leave localStorage intact for retry on next load
    console.warn("[localDB] Migration failed, will retry on next load:", err);
  }
}

// ── UI State helpers (never cleared) ─────────────────────────────────────────

const THEME_KEY = "brandscapes_theme";
const DENSITY_KEY = "brandscapes_density";
const PANELS_KEY = "brandscapes_dashboard_panels";

export const uiState = {
  getTheme(): string {
    return localStorage.getItem(THEME_KEY) ?? "blue-steel";
  },
  setTheme(theme: string): void {
    localStorage.setItem(THEME_KEY, theme);
  },
  getDensity(): string {
    return localStorage.getItem(DENSITY_KEY) ?? "comfortable";
  },
  setDensity(density: string): void {
    localStorage.setItem(DENSITY_KEY, density);
  },
  getDashboardPanels(): Record<string, boolean> {
    try {
      return JSON.parse(localStorage.getItem(PANELS_KEY) ?? "{}");
    } catch {
      return {};
    }
  },
  setDashboardPanels(panels: Record<string, boolean>): void {
    localStorage.setItem(PANELS_KEY, JSON.stringify(panels));
  },
};

// ── fileToBase64 utility ──────────────────────────────────────────────────────
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Legacy localDB stub (kept so existing pages that import localDB don't break) ──
// All methods are no-ops or return empty/defaults. Pages should import from
// hooks/useQueries.ts instead.
export const localDB = {
  getAllAssets: (): LocalAsset[] => [],
  getAssetById: (_id: number): LocalAsset | null => null,
  addAsset: (_input: LocalAssetInput): LocalAsset => {
    throw new Error("localDB is deprecated — use useAddAsset hook");
  },
  updateAsset: (
    _id: number,
    _input: Partial<LocalAssetInput>,
  ): LocalAsset | null => null,
  deleteAsset: (_id: number): boolean => false,
  getAllSoftware: (): LocalSoftware[] => [],
  addSoftware: (_input: LocalSoftwareInput): LocalSoftware => {
    throw new Error("localDB is deprecated — use useAddSoftware hook");
  },
  updateSoftware: (
    _id: number,
    _input: LocalSoftwareInput,
  ): LocalSoftware | null => null,
  deleteSoftware: (_id: number): boolean => false,
  getHistory: (): LocalHistoryEntry[] => [],
  getStats: () => ({ total: 0, assigned: 0, available: 0, inRepair: 0 }),
  getAllUsers: (): LocalDBUser[] => [],
  findByUsername: (_username: string): LocalDBUser | null => null,
  findByCredentials: (
    _username: string,
    _password: string,
  ): LocalDBUser | null => null,
  addUser: (_input: LocalDBUserInput): LocalDBUser => {
    throw new Error("localDB is deprecated — use useAddLocalUser hook");
  },
  upsertUserByUsername: (_input: LocalDBUserInput): LocalDBUser => {
    throw new Error("localDB is deprecated — use backend hooks");
  },
  updateUser: (_id: number, _input: LocalDBUserInput): LocalDBUser | null =>
    null,
  deleteUser: (_id: number): boolean => false,
};
