import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface WarrantyStats {
    expiringSoon: bigint;
    total: bigint;
    active: bigint;
    expired: bigint;
}
export type Time = bigint;
export interface UserWithRole {
    principal: Principal;
    role: UserRole;
}
export interface Stats {
    assigned: bigint;
    total: bigint;
    available: bigint;
    inRepair: bigint;
}
export type Principal = Principal;
export interface AssignmentHistoryEntry {
    id: bigint;
    changedBy: Principal;
    toStatus: AssetStatus;
    assetId: bigint;
    fromStatus: AssetStatus;
    toAssignee?: string;
    timestamp: Time;
    assetName: string;
    fromAssignee?: string;
}
export interface StoreSoftwareInput {
    id?: bigint;
    purchaseDate?: string;
    name: string;
    licenseType?: string;
    vendor: string;
    notes?: string;
    licenseKey?: string;
    licenseExpiry?: string;
}
export interface LocalUser {
    id: bigint;
    employeeCode: string;
    name: string;
    email: string;
    notes?: string;
    department: string;
}
export interface LocalUserInput {
    employeeCode: string;
    name: string;
    email: string;
    notes?: string;
    department: string;
}
export interface AssetInput {
    id?: bigint;
    status: AssetStatus;
    employeeCode?: string;
    purchaseDate?: string;
    name: string;
    serialNumber: string;
    notes?: string;
    category: AssetCategory;
    warrantyDate?: string;
    assignedUser?: string;
    location: string;
    photoId?: ExternalBlob;
}
export interface Asset {
    id: bigint;
    status: AssetStatus;
    employeeCode?: string;
    purchaseDate?: string;
    name: string;
    createdAt: Time;
    serialNumber: string;
    notes?: string;
    category: AssetCategory;
    warrantyDate?: string;
    assignedUser?: string;
    location: string;
    photoId?: ExternalBlob;
}
export interface StoreSoftware {
    id: bigint;
    purchaseDate?: string;
    name: string;
    createdAt: Time;
    licenseType?: string;
    vendor: string;
    notes?: string;
    licenseKey?: string;
    licenseExpiry?: string;
}
export interface UserProfile {
    name: string;
}
export enum AssetCategory {
    desktop = "desktop",
    other = "other",
    laptop = "laptop",
    server = "server",
    printer = "printer",
    monitor = "monitor",
    peripheral = "peripheral"
}
export enum AssetStatus {
    assigned = "assigned",
    inStorage = "inStorage",
    available = "available",
    inRepair = "inRepair",
    retired = "retired"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addAsset(input: AssetInput): Promise<bigint>;
    addLocalUser(input: LocalUserInput): Promise<bigint>;
    addSoftware(input: StoreSoftwareInput): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    bootstrapAdmin(): Promise<boolean>;
    deleteAsset(id: bigint): Promise<void>;
    deleteLocalUser(id: bigint): Promise<void>;
    deleteSoftware(id: bigint): Promise<void>;
    getAllAssets(): Promise<Array<Asset>>;
    getAllLocalUsers(): Promise<Array<LocalUser>>;
    getAllSoftware(): Promise<Array<StoreSoftware>>;
    getAllUsersWithRoles(): Promise<Array<UserWithRole>>;
    getAsset(id: bigint): Promise<Asset>;
    getAssetsByCategory(category: AssetCategory): Promise<Array<Asset>>;
    getAssetsByLocation(location: string): Promise<Array<Asset>>;
    getAssetsByStatus(status: AssetStatus): Promise<Array<Asset>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getHistory(): Promise<Array<AssignmentHistoryEntry>>;
    getHistoryForAsset(assetId: bigint): Promise<Array<AssignmentHistoryEntry>>;
    getSoftware(id: bigint): Promise<StoreSoftware>;
    getSoftwareByVendor(vendor: string): Promise<Array<StoreSoftware>>;
    getStats(): Promise<Stats>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getWarrantyStats(): Promise<WarrantyStats>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchAssets(term: string): Promise<Array<Asset>>;
    searchSoftware(term: string): Promise<Array<StoreSoftware>>;
    updateAsset(id: bigint, input: AssetInput): Promise<void>;
    updateLocalUser(id: bigint, input: LocalUserInput): Promise<void>;
    updateSoftware(id: bigint, input: StoreSoftwareInput): Promise<void>;
}
